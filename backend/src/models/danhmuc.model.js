const mongoose = require('mongoose');
const { Schema } = mongoose;

const danhMucSchema = new Schema(
    {
        maDM: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        tenDm: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        moTa: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('DanhMuc', danhMucSchema, 'danhmucs');
