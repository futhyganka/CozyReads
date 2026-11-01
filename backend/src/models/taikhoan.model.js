const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES } = require('../constants/permissions');
const { TRANG_THAI_DOC_GIA } = require('../constants/business-rules');

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
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_DOC_GIA),
            default: TRANG_THAI_DOC_GIA.HOAT_DONG,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('TaiKhoan', taiKhoanSchema, 'taiKhoans');
