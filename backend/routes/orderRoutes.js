const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { protect, admin } = require('../middleware/auth');

const toValidQuantity = (quantity) => {
  const value = Number(quantity);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

const toValidPrice = (price) => {
  const value = Number(price);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const getAvailableStock = (product) => {
  const stock = Number(product.stock);
  const countInStock = Number(product.countInStock);

  if (Number.isFinite(stock)) return stock;
  if (Number.isFinite(countInStock)) return countInStock;
  return 0;
};

const setProductStock = (product, nextStock) => {
  product.stock = nextStock;
  product.countInStock = nextStock;
};

const imageValue = (image) => {
  if (typeof image === 'string') return image;
  return image?.url || image?.src || image?.secure_url || image?.imageUrl || image?.image || '';
};

const firstImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return '';
  return images.map(imageValue).find(Boolean) || '';
};

const ORDER_STATUSES = ['Pending', 'Order Placed', 'Order Cancelled'];
const PAYMENT_METHODS = ['cod', 'card'];

const hasShippingAddress = (shippingAddress) => (
  shippingAddress?.fullName?.trim()
  && shippingAddress?.address?.trim()
  && shippingAddress?.city?.trim()
  && shippingAddress?.phoneNumber?.trim()
);

const normalizeShippingAddress = (shippingAddress) => ({
  fullName: shippingAddress.fullName.trim(),
  address: shippingAddress.address.trim(),
  city: shippingAddress.city.trim(),
  phoneNumber: shippingAddress.phoneNumber.trim(),
});

const calculateOrderTotals = (orderItems) => {
  const itemsPrice = orderItems.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
  const shippingPrice = itemsPrice > 0 ? 200 : 0;
  const taxPrice = itemsPrice * 0.08;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

const toObjectIds = (ids = []) => ids
  .map((id) => id?.toString())
  .filter((id) => mongoose.Types.ObjectId.isValid(id))
  .map((id) => new mongoose.Types.ObjectId(id));

const updateShippingDetails = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!hasShippingAddress(shippingAddress)) {
      return res.status(400).json({ message: 'Please provide complete shipping details' });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        message: 'Order not found for this logged-in user. Please refresh orders and try again.',
      });
    }

    if (order.status === 'Order Cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be updated' });
    }

    order.shippingAddress = normalizeShippingAddress(shippingAddress);

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getCartProductId = (item) => {
  const product = item.product;
  return (product?._id || product)?.toString();
};

const recalculateCartTotal = async (items) => {
  const productIds = items.map(getCartProductId).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } }).select('price');
  const priceByProductId = new Map(
    products.map((product) => [product._id.toString(), Number(product.price)])
  );

  return items.reduce((total, item) => {
    const price = priceByProductId.get(getCartProductId(item));
    const quantity = Number(item.quantity);

    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return total;
    }

    return total + price * quantity;
  }, 0);
};

const removeOrderedItemsFromCart = async ({ userId, cartItemIds = [], orderItems = [] }) => {
  const idsToRemove = toObjectIds(Array.isArray(cartItemIds) ? cartItemIds : []);

  if (idsToRemove.length > 0) {
    await Cart.updateOne(
      { user: userId },
      { $pull: { items: { _id: { $in: idsToRemove } } } }
    );
  } else {
    for (const item of orderItems) {
      await Cart.updateOne(
        { user: userId },
        {
          $pull: {
            items: {
              product: item.product,
              size: item.size || '',
            },
          },
        }
      );
    }
  }

  const cart = await Cart.findOne({ user: userId }).lean();

  if (!cart) return;

  await Cart.updateOne(
    { _id: cart._id },
    { $set: { totalPrice: await recalculateCartTotal(cart.items) } }
  );
};

const adjustStockForOrderItems = async (orderItems = [], direction) => {
  const quantityByProductId = new Map();

  for (const item of orderItems) {
    const productId = item.product?._id || item.product;
    const quantity = toValidQuantity(item.qty || item.quantity);

    if (!productId || quantity < 1) continue;

    const productKey = productId.toString();
    quantityByProductId.set(productKey, (quantityByProductId.get(productKey) || 0) + quantity);
  }

  for (const [productId, quantity] of quantityByProductId.entries()) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found while updating stock');
    }

    const availableStock = getAvailableStock(product);

    if (direction === 'decrease' && availableStock < quantity) {
      throw new Error(`Only ${availableStock} item(s) left in stock for ${product.name}`);
    }

    const nextStock = direction === 'increase'
      ? availableStock + quantity
      : availableStock - quantity;

    setProductStock(product, Math.max(nextStock, 0));
    await product.save();
  }
};

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, cartItemIds, paymentMethod = 'cod' } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    if (!hasShippingAddress(shippingAddress)) {
      return res.status(400).json({ message: 'Please provide complete shipping details' });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const cleanedOrderItems = [];
    const productsToUpdate = new Map();

    for (const item of orderItems) {
      const productId = item.product || item.productId;
      const quantity = toValidQuantity(item.qty || item.quantity);

      if (!productId || quantity < 1) {
        return res.status(400).json({ message: 'Invalid order item' });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const availableStock = getAvailableStock(product);

      const productKey = product._id.toString();
      const previousOrderQuantity = productsToUpdate.get(productKey)?.quantity || 0;
      const totalOrderQuantity = previousOrderQuantity + quantity;

      if (availableStock < totalOrderQuantity) {
        return res.status(400).json({
          message: `Only ${availableStock} item(s) left in stock for ${product.name}`,
        });
      }

      const price = toValidPrice(product.price);
      productsToUpdate.set(productKey, { product, quantity: totalOrderQuantity });

      cleanedOrderItems.push({
        name: product.name,
        qty: quantity,
        image: (
          imageValue(product.imageUrl) ||
          imageValue(product.imageURL) ||
          imageValue(product.image) ||
          imageValue(product.thumbnail) ||
          firstImage(product.images)
        ),
        price,
        size: item.size || '',
        product: product._id,
      });
    }

    const { itemsPrice, shippingPrice, taxPrice, totalPrice } = calculateOrderTotals(cleanedOrderItems);

    const order = new Order({
      user: req.user._id,
      orderItems: cleanedOrderItems,
      shippingAddress: normalizeShippingAddress(shippingAddress),
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    for (const { product, quantity } of productsToUpdate.values()) {
      const nextStock = Math.max(getAvailableStock(product) - quantity, 0);
      setProductStock(product, nextStock);
      await product.save();
    }

    try {
      await removeOrderedItemsFromCart({
        userId: req.user._id,
        cartItemIds,
        orderItems: cleanedOrderItems,
      });
    } catch (cleanupErr) {
      console.error('Cart cleanup failed after order placement', cleanupErr);
    }

    res.status(201).json(createdOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/orders/myorders
// @desc    Get logged in user orders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name email')
      .populate('orderItems.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/orders/:id/shipping
// @desc    Update shipping details for the logged in user's order
// @access  Private
router.put('/:id/shipping', protect, updateShippingDetails);

// @route   PATCH /api/orders/:id/shipping
// @desc    Update shipping details for the logged in user's order
// @access  Private
router.patch('/:id/shipping', protect, updateShippingDetails);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    if (!ORDER_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (order) {
      const previousStatus = order.status || 'Pending';
      const nextStatus = req.body.status;

      if (previousStatus !== 'Order Cancelled' && nextStatus === 'Order Cancelled') {
        await adjustStockForOrderItems(order.orderItems, 'increase');
      }

      if (previousStatus === 'Order Cancelled' && nextStatus !== 'Order Cancelled') {
        await adjustStockForOrderItems(order.orderItems, 'decrease');
      }

      order.status = nextStatus;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server Error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.deleteOne();
      res.json({ message: 'Order removed' });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
