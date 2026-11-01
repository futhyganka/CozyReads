const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CHUC_VU_NHAN_VIEN } = require('../constants/business-rules');

const nhanVienSchema = new Schema(
    {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'TaiKhoan',
            required: true,
        },
        msnv: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        hoTen: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        chucVu: {
            type: String,
            enum: Object.values(CHUC_VU_NHAN_VIEN),
            default: CHUC_VU_NHAN_VIEN.NHAN_VIEN,
            index: true,
        },
        diaChi: {
            type: String,
            default: '',
            trim: true,
        },
        dienThoai: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        luong: {
            type: Number,
            min: 0,
            default: 0,
        },
    },
    {
        timestamps: true,
        _id: false, // Dùng _id từ TaiKhoan
    },
);

module.exports = mongoose.model('NhanVien', nhanVienSchema, 'nhanViens');
