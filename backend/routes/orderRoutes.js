const express = require('express');
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

const firstImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return '';
  const image = images[0];
  return image?.url || image?.src || image;
};

const ORDER_STATUSES = ['Pending', 'Order Placed', 'Order Cancelled'];

const hasShippingAddress = (shippingAddress) => (
  shippingAddress?.fullName?.trim()
  && shippingAddress?.address?.trim()
  && shippingAddress?.city?.trim()
  && shippingAddress?.phoneNumber?.trim()
);

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
  const idsToRemove = (Array.isArray(cartItemIds) ? cartItemIds : [])
    .map((id) => id?.toString())
    .filter(Boolean);

  if (idsToRemove.length > 0) {
    await Cart.updateOne(
      { user: userId },
      { $pull: { items: { _id: { $in: idsToRemove } } } }
    );
  }

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

  const cart = await Cart.findOne({ user: userId }).lean();

  if (!cart) return;

  await Cart.updateOne(
    { _id: cart._id },
    { $set: { totalPrice: await recalculateCartTotal(cart.items) } }
  );
};

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress, cartItemIds } = req.body;

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const cleanedOrderItems = [];

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

      const price = toValidPrice(product.price);

      cleanedOrderItems.push({
        name: product.name,
        qty: quantity,
        image: product.imageUrl || firstImage(product.images),
        price,
        size: item.size || '',
        product: product._id,
      });
    }

    const totalPrice = cleanedOrderItems.reduce(
      (total, item) => total + item.price * item.qty,
      0
    );

    const order = new Order({
      user: req.user._id,
      orderItems: cleanedOrderItems,
      shippingAddress,
      totalPrice,
    });

    const createdOrder = await order.save();

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
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
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
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/orders/:id/shipping
// @desc    Update shipping details for the logged in user's order
// @access  Private
router.put('/:id/shipping', protect, async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!hasShippingAddress(shippingAddress)) {
      return res.status(400).json({ message: 'Please provide complete shipping details' });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'Order Cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be updated' });
    }

    order.shippingAddress = {
      fullName: shippingAddress.fullName.trim(),
      address: shippingAddress.address.trim(),
      city: shippingAddress.city.trim(),
      phoneNumber: shippingAddress.phoneNumber.trim(),
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

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
      order.status = req.body.status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
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
