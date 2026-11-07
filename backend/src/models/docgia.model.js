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
        email: {
            type: String,
            sparse: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            select: false,
        },
        avatar: {
            type: String,
            default: '',
        },
        chuKyThanhToan: {
            type: String,
            enum: Object.keys(GOI_GIA_HAN),
            default: '1_thang',
        },
        trangThaiGiaHan: {
            type: String,
            enum: Object.values(TRANG_THAI_GIA_HAN),
            default: TRANG_THAI_GIA_HAN.GIA_HAN,
            index: true,
        },
        ngayBatDauKyThanhToan: {
            type: Date,
            default: Date.now,
        },
        ngayHetHanThe: {
            type: Date,
            index: true,
        },
        trangThaiTaiKhoan: {
            type: String,
            enum: Object.values(TRANG_THAI_DOC_GIA),
            default: TRANG_THAI_DOC_GIA.HOAT_DONG,
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
        loaiDocGia: {
            type: String,
            enum: Object.values(LOAI_DOC_GIA),
            required: true,
            default: LOAI_DOC_GIA.DOCGIA_TUDO,
            index: true,
        },
        ngayCapNhatDiemKhongViPham: {
            type: Date,
            default: Date.now,
        },
        daTotNghiep: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// Middleware pre findOneAndUpdate để map trangThai -> trangThaiTaiKhoan
docGiaSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    if (update && update.trangThai !== undefined) {
        update.trangThaiTaiKhoan = update.trangThai;
    }
    if (update && update.$set && update.$set.trangThai !== undefined) {
        update.$set.trangThaiTaiKhoan = update.$set.trangThai;
    }
});
docGiaSchema.virtual('trangThai')
    .get(function () {
        return this.trangThaiTaiKhoan;
    })
    .set(function (val) {
        this.trangThaiTaiKhoan = val;
    });

docGiaSchema.set('toJSON', { virtuals: true });
docGiaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DocGia', docGiaSchema, 'docgias');
