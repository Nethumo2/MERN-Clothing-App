const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
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

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { orderItems, shippingAddress } = req.body;

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
    const orders = await Order.find({}).populate('user', 'id name');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.status = req.body.status || order.status;
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
