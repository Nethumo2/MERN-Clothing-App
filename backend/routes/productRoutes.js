const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

const firstImage = (images) => {
    if (!Array.isArray(images) || images.length === 0) return '';
    const image = images[0];
    return image?.url || image?.src || image;
};

const getCategoryId = (category) => {
    if (!category) return '';
    if (typeof category === 'object') return (category._id || category)?.toString();
    return category.toString();
};

const loadCategoryMap = async (products) => {
    const categoryIds = products
        .map((product) => getCategoryId(product.category))
        .filter((category) => category && /^[0-9a-fA-F]{24}$/.test(category));

    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    return new Map(categories.map((category) => [category._id.toString(), category]));
};

const normalizeDiscountPercent = (discountPercent, discount, price, comparePrice) => {
    const directDiscount = Number(discountPercent ?? discount);
    if (Number.isFinite(directDiscount) && directDiscount > 0) {
        return Math.min(Math.round(directDiscount), 99);
    }

    const productPrice = Number(price);
    const originalPrice = Number(comparePrice);

    if (Number.isFinite(productPrice) && Number.isFinite(originalPrice) && originalPrice > productPrice) {
        return Math.min(Math.round(((originalPrice - productPrice) / originalPrice) * 100), 99);
    }

    return 0;
};

const normalize = (product, categoryMap = new Map()) => {
    const obj = product.toObject ? product.toObject() : { ...product };
    const categoryId = getCategoryId(obj.category);
    const category = categoryMap.get(categoryId);

    obj.size = obj.size || obj.sizes || [];
    obj.sizes = obj.sizes || obj.size || [];
    obj.imageUrl = obj.imageUrl || firstImage(obj.images) || 'https://via.placeholder.com/300x300?text=No+Image';
    obj.images = obj.images || [obj.imageUrl];
    obj.countInStock = obj.countInStock ?? obj.stock ?? 0;
    obj.stock = obj.stock ?? obj.countInStock ?? 0;
    obj.discountPercent = normalizeDiscountPercent(
        obj.discountPercent,
        obj.discount,
        obj.price,
        obj.comparePrice
    );
    obj.categoryId = categoryId;
    obj.category = category?.name || obj.category?.name || categoryId || '';
    obj.categoryImage = category?.image || '';
    obj.categorySlug = category?.slug || '';
    return obj;
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}).lean();
        const categoryMap = await loadCategoryMap(products);
        res.json(products.map((product) => normalize(product, categoryMap)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (product) {
            const categoryMap = await loadCategoryMap([product]);
            res.json(normalize(product, categoryMap));
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, price, comparePrice, discountPercent, discount, size, sizes, category, countInStock, stock, description, imageUrl, images } = req.body;
        const productSizes = size || sizes || [];
        const productImages = images || (imageUrl ? [imageUrl] : undefined);

        const product = new Product({
            name,
            price,
            comparePrice,
            discountPercent: normalizeDiscountPercent(discountPercent, discount, price, comparePrice),
            description,
            size: typeof productSizes === 'string' ? productSizes.split(',').map((s) => s.trim()) : productSizes,
            sizes: typeof productSizes === 'string' ? productSizes.split(',').map((s) => s.trim()) : productSizes,
            category,
            countInStock: countInStock ?? stock ?? 0,
            stock: stock ?? countInStock ?? 0,
            imageUrl: imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
            images: productImages,
        });

        const createdProduct = await product.save();
        res.status(201).json(normalize(createdProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { name, price, comparePrice, discountPercent, discount, size, sizes, category, description, countInStock, stock, imageUrl, images } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.price = price || product.price;
            product.comparePrice = comparePrice !== undefined ? comparePrice : product.comparePrice;
            if (discountPercent !== undefined || discount !== undefined || comparePrice !== undefined) {
                product.discountPercent = normalizeDiscountPercent(
                    discountPercent,
                    discount,
                    price || product.price,
                    comparePrice !== undefined ? comparePrice : product.comparePrice
                );
            }
            product.description = description || product.description;
            product.countInStock = countInStock !== undefined ? countInStock : (stock !== undefined ? stock : product.countInStock);
            product.stock = stock !== undefined ? stock : (countInStock !== undefined ? countInStock : product.stock);
            product.category = category || product.category;
            const productSizes = size || sizes;
            if (productSizes) {
                const normalizedSizes = typeof productSizes === 'string'
                    ? productSizes.split(',').map((s) => s.trim())
                    : productSizes;
                product.size = normalizedSizes;
                product.sizes = normalizedSizes;
            }
            if (imageUrl !== undefined) product.imageUrl = imageUrl;
            if (images !== undefined) product.images = images;

            const updatedProduct = await product.save();
            res.json(normalize(updatedProduct));
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
