const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    LOAI_PHAN_HOI,
    TRANG_THAI_PHAN_HOI,
} = require('../constants/business-rules');

const phanHoiSchema = new Schema(
    {
        maPhanHoi: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        loai: {
            type: String,
            enum: Object.values(LOAI_PHAN_HOI),
            required: true,
            index: true,
        },
        maDocGia: {
            type: Schema.Types.ObjectId,
            ref: 'DocGia',
            default: null,
            index: true,
        },
        noiDung: {
            type: String,
            required: true,
            trim: true,
        },
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_PHAN_HOI),
            default: TRANG_THAI_PHAN_HOI.CHO_XU_LY,
            index: true,
        },
        msnvXuLy: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            default: null,
            index: true,
        },
        noiDungPhanHoi: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

phanHoiSchema.index({ loai: 1, trangThai: 1, createdAt: -1 });

module.exports = mongoose.model('PhanHoi', phanHoiSchema, 'phanhois');
