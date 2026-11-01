const mongoose = require('mongoose');
const { Schema } = mongoose;

const sachSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
    },
    MASACH: {
        type: String,
        required: true,
        unique: true,
    },
    TENSACH: {
        type: String,
        required: true,
        trim: true,
    },
    MOTA: {
        type: String,
        default: '',
    },
    DONGIA: {
        type: Number,
        required: true,
        min: 0,
    },
    SOQUYEN: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    NAMXUATBAN: {
        type: Number,
        required: true,
    },
        MANXB: {
        type: Schema.Types.ObjectId,
        ref: 'NhaXuatBan'
    },
    MATG: [{
        type: Schema.Types.ObjectId,
        ref: 'TacGia'
    }],
    MADM: [{
        type: Schema.Types.ObjectId,
        ref: 'DanhMuc'
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Sach', sachSchema, 'sachs');
