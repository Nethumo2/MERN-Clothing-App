const express = require('express');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

const normalize = (category) => {
    const obj = category.toObject ? category.toObject() : { ...category };
    obj.image = obj.image || '';
    obj.slug = obj.slug || obj.name?.toLowerCase().replace(/\s+/g, '-') || '';
    obj.isActive = obj.isActive !== false;
    return obj;
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories.map(normalize));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, description, image, slug, isActive } = req.body;
        const categoryExists = await Category.findOne({ name });
        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        const category = await Category.create({ name, description, image, slug, isActive });
        res.status(201).json(normalize(category));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            category.name = req.body.name || category.name;
            category.description = req.body.description || category.description;
            category.image = req.body.image !== undefined ? req.body.image : category.image;
            category.slug = req.body.slug !== undefined ? req.body.slug : category.slug;
            category.isActive = req.body.isActive !== undefined ? req.body.isActive : category.isActive;
            const updatedCategory = await category.save();
            res.json(normalize(updatedCategory));
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            await category.deleteOne();
            res.json({ message: 'Category removed' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
