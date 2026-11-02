const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    PHUONG_THUC_THANH_TOAN,
    GOI_GIA_HAN,
} = require('../constants/business-rules');

const thanhToanSchema = new Schema(
    {
        maThanhToan: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        loai: {
            type: String,
            enum: Object.values(LOAI_THANH_TOAN),
            required: true,
            index: true,
        },
        soTien: {
            type: Number,
            required: true,
            min: 0,
        },
        docGia: {
            type: Schema.Types.ObjectId,
            ref: 'DocGia',
            required: true,
            index: true,
        },
        theoDoiMuonSach: {
            type: Schema.Types.ObjectId,
            ref: 'TheoDoiMuonSach',
            default: null,
            index: true,
        },
        goiGiaHan: {
            type: String,
            enum: Object.keys(GOI_GIA_HAN),
            default: null,
        },
        msnv: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            default: null,
            index: true,
        },
        ngayTao: {
            type: Date,
            default: Date.now,
        },
        ngayThanhToan: {
            type: Date,
            default: null,
        },
        phuongThuc: {
            type: String,
            enum: Object.values(PHUONG_THUC_THANH_TOAN),
            default: PHUONG_THUC_THANH_TOAN.TIEN_MAT,
        },
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_THANH_TOAN),
            default: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            index: true,
        },
        ghiChu: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('ThanhToan', thanhToanSchema, 'thanhtoans');
