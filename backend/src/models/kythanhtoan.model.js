const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    PHUONG_THUC_THANH_TOAN,
    GOI_GIA_HAN,
} = require('../constants/business-rules');

const kyThanhToanSchema = new Schema(
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
        maDocGia: {
            type: Schema.Types.ObjectId,
            ref: 'DocGia',
            required: true,
            index: true,
        },
        maTheoDoi: {
            type: Schema.Types.ObjectId,
            ref: 'TheoDoiMuonSach',
            default: null,
            index: true,
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
        goiGiaHan: {
            type: String,
            enum: Object.keys(GOI_GIA_HAN),
            default: null,
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

// Virtual alias cho docGia và theoDoiMuonSach để tương thích
kyThanhToanSchema.virtual('docGia')
    .get(function () {
        return this.maDocGia;
    })
    .set(function (val) {
        this.maDocGia = val;
    });

kyThanhToanSchema.virtual('theoDoiMuonSach')
    .get(function () {
        return this.maTheoDoi;
    })
    .set(function (val) {
        this.maTheoDoi = val;
    });

kyThanhToanSchema.set('toJSON', { virtuals: true });
kyThanhToanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model(
    'KyThanhToan',
    kyThanhToanSchema,
    'kythanhtoans',
);
