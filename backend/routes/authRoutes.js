const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const generateToken = require('../utils/generateToken');

const router = express.Router();

const normalizeEmail = (email) => email?.trim().toLowerCase();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = normalizeEmail(req.body.email);

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                isActive: user.isActive !== false,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);

        const user = await User.findOne({ email });

        if (user && user.isActive === false) {
            return res.status(403).json({ message: 'This account has been deactivated' });
        }

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                isActive: user.isActive !== false,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Guest Login
// @route   POST /api/auth/guest
// @access  Public
router.post('/guest', async (req, res) => {
    try {
        const guestName = `Guest_${Math.floor(Math.random() * 10000)}`;
        const guestEmail = `${guestName.toLowerCase()}@guest.com`;
        
        const user = await User.create({
            name: guestName,
            email: guestEmail,
            password: 'guestpassword123',
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            isActive: user.isActive !== false,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


const { protect, admin } = require('../middleware/auth');

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all users with order/cart activity
// @route   GET /api/auth/users/activity
// @access  Private/Admin
router.get('/users/activity', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').lean();
        const orders = await Order.find({}).select('user totalPrice status createdAt').lean();
        const carts = await Cart.find({}).select('user items totalPrice updatedAt').lean();

        const orderStats = orders.reduce((stats, order) => {
            const userId = order.user?.toString();
            if (!userId) return stats;

            if (!stats[userId]) {
                stats[userId] = {
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrderDate: null,
                    pendingOrders: 0,
                    placedOrders: 0,
                    cancelledOrders: 0,
                };
            }

            stats[userId].orderCount += 1;
            stats[userId].totalSpent += Number(order.totalPrice || 0);

            const orderDate = order.createdAt ? new Date(order.createdAt) : null;
            if (orderDate && (!stats[userId].lastOrderDate || orderDate > new Date(stats[userId].lastOrderDate))) {
                stats[userId].lastOrderDate = order.createdAt;
            }

            if (order.status === 'Order Placed') stats[userId].placedOrders += 1;
            else if (order.status === 'Order Cancelled') stats[userId].cancelledOrders += 1;
            else stats[userId].pendingOrders += 1;

            return stats;
        }, {});

        const cartStats = carts.reduce((stats, cart) => {
            const userId = cart.user?.toString();
            if (!userId) return stats;

            stats[userId] = {
                cartItemCount: (cart.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0),
                cartTotal: Number(cart.totalPrice || 0),
                lastCartUpdate: cart.updatedAt,
            };

            return stats;
        }, {});

        res.json(users.map((user) => ({
            ...user,
            isActive: user.isActive !== false,
            activity: {
                orderCount: orderStats[user._id.toString()]?.orderCount || 0,
                totalSpent: orderStats[user._id.toString()]?.totalSpent || 0,
                lastOrderDate: orderStats[user._id.toString()]?.lastOrderDate || null,
                pendingOrders: orderStats[user._id.toString()]?.pendingOrders || 0,
                placedOrders: orderStats[user._id.toString()]?.placedOrders || 0,
                cancelledOrders: orderStats[user._id.toString()]?.cancelledOrders || 0,
                cartItemCount: cartStats[user._id.toString()]?.cartItemCount || 0,
                cartTotal: cartStats[user._id.toString()]?.cartTotal || 0,
                lastCartUpdate: cartStats[user._id.toString()]?.lastCartUpdate || null,
            },
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
router.delete('/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
router.put('/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;
            user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                isActive: updatedUser.isActive !== false,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
