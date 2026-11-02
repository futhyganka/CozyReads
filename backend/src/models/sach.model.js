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
        maTG: [
            {
                type: Schema.Types.ObjectId,
                ref: 'TacGia',
                required: true,
                index: true,
            },
        ],
        maDM: [
            {
                type: Schema.Types.ObjectId,
                ref: 'DanhMuc',
                required: true,
                index: true,
            },
        ],
        hinhAnh: {
            type: String,
            default: '',
        },
        ngonNgu: {
            type: String,
            default: 'Tiếng Việt',
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Sach', sachSchema, 'sachs');
