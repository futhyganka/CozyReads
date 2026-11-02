const mongoose = require('mongoose');
const { Schema } = mongoose;

const nhaXuatBanSchema = new Schema(
    {
        maNXB: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        tenNxb: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        diaChi: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('NhaXuatBan', nhaXuatBanSchema, 'nhaxuatbans');
