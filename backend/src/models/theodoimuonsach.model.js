const mongoose = require('mongoose');
const { Schema } = mongoose;
const { TRANG_THAI_MUON } = require('../constants/business-rules');

const theoDoiMuonSachSchema = new Schema(
    {
        docGia: {
            type: Schema.Types.ObjectId,
            ref: 'DocGia',
            required: true,
            index: true,
        },
        sach: {
            type: Schema.Types.ObjectId,
            ref: 'Sach',
            required: true,
            index: true,
        },
        ngayMuon: {
            type: Date,
            default: Date.now,
            required: true,
        },
        ngayHenTra: {
            type: Date,
            required: true,
            index: true,
        },
        msnvMuon: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            required: true,
        },
        ngayTra: {
            type: Date,
            default: null,
        },
        msnvTra: {
            type: Schema.Types.ObjectId,
            ref: 'NhanVien',
            default: null,
        },
        tienPhat: {
            type: Number,
            default: 0,
            min: 0,
        },
        trangThai: {
            type: String,
            enum: Object.values(TRANG_THAI_MUON),
            default: TRANG_THAI_MUON.DANG_MUON,
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

theoDoiMuonSachSchema.index({ docGia: 1, sach: 1, trangThai: 1 });
theoDoiMuonSachSchema.index({ trangThai: 1, ngayHenTra: 1 });

module.exports = mongoose.model(
    'TheoDoiMuonSach',
    theoDoiMuonSachSchema,
    'theodoimuonsachs',
);
