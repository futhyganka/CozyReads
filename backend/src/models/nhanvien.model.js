const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CHUC_VU_NHAN_VIEN } = require('../constants/business-rules');

const nhanVienSchema = new Schema(
    {
        msnv: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        hoTenNv: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
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
        soDienThoai: {
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
        daNghiViec: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

// Virtual cho hoTen và dienThoai để tương thích
nhanVienSchema.virtual('hoTen')
    .get(function () {
        return this.hoTenNv;
    })
    .set(function (val) {
        this.hoTenNv = val;
    });

nhanVienSchema.virtual('dienThoai')
    .get(function () {
        return this.soDienThoai;
    })
    .set(function (val) {
        this.soDienThoai = val;
    });

nhanVienSchema.set('toJSON', { virtuals: true });
nhanVienSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('NhanVien', nhanVienSchema, 'nhanviens');
