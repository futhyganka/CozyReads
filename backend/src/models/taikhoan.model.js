const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES } = require('../constants/permissions');

const taiKhoanSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: '',
        },
        maVaiTro: {
            type: String,
            ref: 'VaiTro',
            required: true,
            default: ROLES.DOCGIA,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('TaiKhoan', taiKhoanSchema, 'taikhoans');
