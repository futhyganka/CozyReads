const mongoose = require('mongoose');
const { Schema } = mongoose;

const sachSchema = new Schema(
    {
        maSach: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        tenSach: {
            type: String,
            required: true,
            trim: true,
            index: 'text',
        },
        moTa: {
            type: String,
            default: '',
            trim: true,
        },
        donGia: {
            type: Number,
            required: true,
            min: 0,
        },
        soQuyen: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
            index: true,
        },
        namXuatBan: {
            type: Number,
            required: true,
        },
        maNXB: {
            type: Schema.Types.ObjectId,
            ref: 'NhaXuatBan',
            required: true,
            index: true,
        },
        hinhAnh: {
            type: String,
            default: '',
        },
        nguonGoc: {
            type: String,
            default: '',
            trim: true,
        },
        ngonNgu: {
            type: String,
            default: 'Tiếng Việt',
            trim: true,
        },
        tacGia: {
            type: Schema.Types.ObjectId,
            ref: 'TacGia',
            required: true,
            index: true,
        },
        danhMuc: {
            type: Schema.Types.ObjectId,
            ref: 'DanhMuc',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

sachSchema.pre('validate', function () {
    if (!this.tacGia && this.maTG) {
        this.tacGia = Array.isArray(this.maTG) ? this.maTG[0] : this.maTG;
    }
    if (!this.danhMuc && this.maDM) {
        this.danhMuc = Array.isArray(this.maDM) ? this.maDM[0] : this.maDM;
    }
});

// Virtual aliases để tương thích maTG, maDM
sachSchema.virtual('maTG')
    .get(function () {
        return this.tacGia ? [this.tacGia] : [];
    })
    .set(function (val) {
        this.tacGia = Array.isArray(val) ? val[0] : val;
    });

sachSchema.virtual('maDM')
    .get(function () {
        return this.danhMuc ? [this.danhMuc] : [];
    })
    .set(function (val) {
        this.danhMuc = Array.isArray(val) ? val[0] : val;
    });

sachSchema.set('toJSON', { virtuals: true });
sachSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Sach', sachSchema, 'sachs');
