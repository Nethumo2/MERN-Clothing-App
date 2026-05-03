const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false,
    },
    slug: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('Category', categorySchema);
