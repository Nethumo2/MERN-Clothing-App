const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const populateCart = (cartId) => Cart.findById(cartId).populate('items.product');

const toObjectIds = (ids = []) => ids
    .map((id) => id?.toString())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

const getProductId = (item) => {
    const product = item.product;
    return (product?._id || product)?.toString();
};

const getCategoryId = (category) => {
    if (!category) return '';
    if (typeof category === 'object') return (category._id || category)?.toString();
    return category.toString();
};

const imageValue = (image) => {
    if (typeof image === 'string') return image;
    return image?.url || image?.src || image?.secure_url || image?.imageUrl || image?.image || '';
};

const firstImage = (images) => {
    if (!Array.isArray(images) || images.length === 0) return '';
    return images.map(imageValue).find(Boolean) || '';
};

const normalizeProduct = (product, categoryMap) => {
    if (!product) return null;

    const obj = product.toObject ? product.toObject() : { ...product };
    const categoryId = getCategoryId(obj.category);
    const category = categoryMap.get(categoryId);

    obj.size = obj.size || obj.sizes || [];
    obj.sizes = obj.sizes || obj.size || [];
    obj.imageUrl = (
        imageValue(obj.imageUrl) ||
        imageValue(obj.imageURL) ||
        imageValue(obj.image) ||
        imageValue(obj.thumbnail) ||
        firstImage(obj.images) ||
        'https://via.placeholder.com/300x300?text=No+Image'
    );
    obj.images = obj.images || [obj.imageUrl];
    obj.countInStock = obj.countInStock ?? obj.stock ?? 0;
    obj.stock = obj.stock ?? obj.countInStock ?? 0;
    obj.categoryId = categoryId;
    obj.category = category?.name || obj.category?.name || categoryId || '';
    return obj;
};

const toResponseCart = async (cart) => {
    if (!cart) return null;

    const obj = cart.toObject ? cart.toObject() : { ...cart };
    const categoryIds = (obj.items || [])
        .map((item) => getCategoryId(item.product?.category))
        .filter((category) => category && /^[0-9a-fA-F]{24}$/.test(category));
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]));

    obj.items = (obj.items || [])
        .filter((item) => item.product)
        .map((item) => ({
            ...item,
            product: normalizeProduct(item.product, categoryMap),
        }));
    obj.voucher = obj.voucher || { image: '', amount: 0, status: 'Pending', note: '' };

    return obj;
};

const recalculateTotal = (items) => {
    return items.reduce((total, item) => {
        const price = Number(item.product?.price);
        const quantity = Number(item.quantity);

        if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
            return total;
        }

        return total + price * quantity;
    }, 0);
};

const recalculateTotalFromProducts = async (items) => {
    const productIds = items.map(getProductId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).select('price');
    const priceByProductId = new Map(
        products.map((product) => [product._id.toString(), Number(product.price)])
    );

    return items.reduce((total, item) => {
        const productId = getProductId(item);
        const price = priceByProductId.get(productId);
        const quantity = Number(item.quantity);

        if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
            return total;
        }

        return total + price * quantity;
    }, 0);
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart) {
            cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
        } else if (!Number.isFinite(Number(cart.totalPrice))) {
            cart.totalPrice = recalculateTotal(cart.items);
            await cart.save();
            cart = await populateCart(cart._id);
        }
        res.json(await toResponseCart(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all carts for admin activity view
// @route   GET /api/cart/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, admin, async (req, res) => {
    try {
        const carts = await Cart.find({})
            .populate('user', 'name email isAdmin')
            .populate('items.product')
            .sort({ updatedAt: -1 });

        const customerCarts = carts.filter((cart) => (
            cart.user &&
            cart.user.isAdmin !== true &&
            Array.isArray(cart.items) &&
            cart.items.some((item) => item.product && Number(item.quantity || 0) > 0)
        ));
        const response = await Promise.all(customerCarts.map(async (cart) => toResponseCart(cart)));
        res.json(response.filter((cart) => cart && cart.items.length > 0));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
router.post('/add', protect, async (req, res) => {
    try {
        const { productId, quantity, size } = req.body;
        const cartQuantity = Number(quantity);

        if (!Number.isInteger(cartQuantity) || cartQuantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [], totalPrice: 0 });
        } else if (!Number.isFinite(Number(cart.totalPrice))) {
            cart.totalPrice = 0;
        }

        const itemSize = size || '';
        cart.items = cart.items.filter((item) => getProductId(item));
        const itemIndex = cart.items.findIndex(
            (p) => getProductId(p) === productId && (p.size || '') === itemSize
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += cartQuantity;
        } else {
            cart.items.push({ product: productId, quantity: cartQuantity, size: itemSize });
        }

        cart.totalPrice = await recalculateTotalFromProducts(cart.items);
        await cart.save();

        cart = await populateCart(cart._id);
        res.json(await toResponseCart(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Private
router.put('/update/:itemId', protect, async (req, res) => {
    try {
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.id(req.params.itemId);

        if (!item) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        item.quantity = quantity;
        cart.totalPrice = await recalculateTotalFromProducts(cart.items);

        await cart.save();

        cart = await populateCart(cart._id);
        res.json(await toResponseCart(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
router.delete('/remove/:itemId', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

        if (cart) {
            const itemIndex = cart.items.findIndex((item) => item._id.toString() === req.params.itemId);

            if (itemIndex > -1) {
                cart.items.splice(itemIndex, 1);
                cart.totalPrice = await recalculateTotalFromProducts(cart.items);
                await cart.save();

                cart = await populateCart(cart._id);
                res.json(await toResponseCart(cart));
            } else {
                res.status(404).json({ message: 'Item not found in cart' });
            }
        } else {
            res.status(404).json({ message: 'Cart not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Remove selected items from cart
// @route   POST /api/cart/remove-selected
// @access  Private
router.post('/remove-selected', protect, async (req, res) => {
    try {
        const itemIds = toObjectIds(Array.isArray(req.body.itemIds) ? req.body.itemIds : []);

        if (itemIds.length === 0) {
            return res.status(400).json({ message: 'No cart items selected' });
        }

        const cart = await Cart.findOne({ user: req.user._id }).lean();

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: { $in: itemIds } } } }
        );

        const updatedCartData = await Cart.findById(cart._id).lean();

        if (updatedCartData) {
            await Cart.updateOne(
                { _id: cart._id },
                { $set: { totalPrice: await recalculateTotalFromProducts(updatedCartData.items) } }
            );
        }

        const updatedCart = await populateCart(cart._id);
        res.json(await toResponseCart(updatedCart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Upload/request a cart voucher
// @route   POST /api/cart/voucher
// @access  Private
router.post('/voucher', protect, upload.single('voucher'), async (req, res) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Voucher amount must be greater than 0' });
        }

        const image = req.file ? req.file.path : req.body.image;
        if (!image) {
            return res.status(400).json({ message: 'Voucher image is required' });
        }

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [], totalPrice: 0 });
        }

        cart.voucher = {
            image,
            amount,
            status: 'Pending',
            note: '',
        };
        await cart.save();

        cart = await populateCart(cart._id);
        res.json(await toResponseCart(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Admin accepts/rejects a cart voucher
// @route   PUT /api/cart/:cartId/voucher/status
// @access  Private/Admin
router.put('/:cartId/voucher/status', protect, admin, async (req, res) => {
    try {
        const { status, note } = req.body;
        const allowedStatuses = ['Pending', 'Accepted', 'Rejected'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid voucher status' });
        }

        let cart = await Cart.findById(req.params.cartId).populate('items.product');
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        if (!cart.voucher?.image || Number(cart.voucher?.amount || 0) <= 0) {
            return res.status(400).json({ message: 'No voucher available for this cart' });
        }

        cart.voucher.status = status;
        cart.voucher.note = note || '';
        await cart.save();

        cart = await populateCart(cart._id);
        res.json(await toResponseCart(cart));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
router.delete('/clear', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
            cart.items = [];
            cart.totalPrice = 0;
            await cart.save();
            cart = await populateCart(cart._id);
            return res.json(await toResponseCart(cart));
        }
        res.json({ user: req.user._id, items: [], totalPrice: 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
