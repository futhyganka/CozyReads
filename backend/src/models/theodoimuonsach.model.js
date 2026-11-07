const mongoose = require('mongoose');
const { Schema } = mongoose;
const { TRANG_THAI_MUON } = require('../constants/business-rules');

const theoDoiMuonSachSchema = new Schema(
    {
        maDocGia: {
            type: Schema.Types.ObjectId,
            ref: 'DocGia',
            required: true,
            index: true,
        },
        maSach: {
            type: Schema.Types.ObjectId,
            ref: 'Sach',
            required: true,
            index: true,
        },
        ngayMuon: {
            type: Date,
            default: Date.now,
            required: true,
            index: true,
        },
        ngayHenTra: {
            type: Date,
            default: null,
            index: true,
        },
        msnvMuon: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            default: null,
            index: true,
        },
        ngayTra: {
            type: Date,
            default: null,
        },
        msnvTra: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            default: null,
            index: true,
        },
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_MUON),
            default: TRANG_THAI_MUON.DANG_MUON,
            index: true,
        },
        tienPhat: {
            type: Number,
            default: 0,
            min: 0,
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

// Virtual alias cho docGia, sach để tương thích với logic cũ
theoDoiMuonSachSchema.virtual('docGia')
    .get(function () {
        return this.maDocGia;
    })
    .set(function (val) {
        this.maDocGia = val;
    });

theoDoiMuonSachSchema.virtual('sach')
    .get(function () {
        return this.maSach;
    })
    .set(function (val) {
        this.maSach = val;
    });

// Compound unique index cho khóa chính ghép theo ERD
theoDoiMuonSachSchema.index(
    { maDocGia: 1, maSach: 1, ngayMuon: 1 },
    { unique: true },
);
theoDoiMuonSachSchema.index({ maDocGia: 1, maSach: 1, trangThai: 1 });
theoDoiMuonSachSchema.index({ trangThai: 1, ngayHenTra: 1 });

theoDoiMuonSachSchema.set('toJSON', { virtuals: true });
theoDoiMuonSachSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model(
    'TheoDoiMuonSach',
    theoDoiMuonSachSchema,
    'theodoimuonsachs',
);
