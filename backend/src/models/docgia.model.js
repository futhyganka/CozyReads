const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    LOAI_DOC_GIA,
    TRANG_THAI_DOC_GIA,
    TRANG_THAI_GIA_HAN,
    DIEM,
    GOI_GIA_HAN,
} = require('../constants/business-rules');

const docGiaSchema = new Schema(
    {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'TaiKhoan',
            required: true,
        },
        maDocGia: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        hoLot: {
            type: String,
            required: true,
            trim: true,
        },
        ten: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        ngaySinh: {
            type: Date,
        },
        phai: {
            type: String,
            enum: ['nam', 'nu', 'khac'],
            default: 'khac',
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
        loaiDocGia: {
            type: String,
            enum: Object.values(LOAI_DOC_GIA),
            required: true,
            default: LOAI_DOC_GIA.DOCGIA_TUDO,
            index: true,
        },
        diemDocGia: {
            type: Number,
            required: true,
            default: DIEM.MAC_DINH,
            min: DIEM.TOI_THIEU,
            max: DIEM.TOI_DA,
            index: true,
        },
        ngayCapNhatDiemKhongViPham: {
            type: Date,
            default: Date.now,
        },
        chuKyThanhToan: {
            type: String,
            enum: Object.keys(GOI_GIA_HAN),
            default: '1_thang',
        },
        ngayBatDauKyThanhToan: {
            type: Date,
            default: Date.now,
        },
        ngayHetHanThe: {
            type: Date,
            index: true,
        },
        trangThaiGiaHan: {
            type: String,
            enum: Object.values(TRANG_THAI_GIA_HAN),
            default: TRANG_THAI_GIA_HAN.GIA_HAN,
            index: true,
        },
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_DOC_GIA),
            default: TRANG_THAI_DOC_GIA.HOAT_DONG,
            index: true,
        },
        daTotNghiep: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        _id: false,
    },
);

module.exports = mongoose.model('DocGia', docGiaSchema, 'docgias');
