const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    size: {
        type: [String],
        required: false,
        default: undefined,
    },
    sizes: {
        type: [String],
        required: false,
        default: undefined,
    },
    category: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
        default: null,
    },
    imageUrl: {
        type: String,
        required: false,
        default: 'https://via.placeholder.com/300x300?text=No+Image',
    },
    images: {
        type: [mongoose.Schema.Types.Mixed],
        required: false,
        default: undefined,
    },
    colors: {
        type: [String],
        required: false,
        default: undefined,
    },
    description: {
        type: String
    },
    countInStock: {
        type: Number, default: 0
    },
    stock: {
        type: Number,
        default: undefined,
    },
    comparePrice: {
        type: Number,
        default: undefined,
    },
    discountPercent: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        default: undefined,
    },
    numReviews: {
        type: Number,
        default: undefined,
    },
    featured: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    reviews: {
        type: [mongoose.Schema.Types.Mixed],
        default: undefined,
    },
}, {
    timestamps: true,
    strict: false,
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
