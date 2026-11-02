const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ROLES } = require('../constants/permissions');

const vaiTroSchema = new Schema(
    {
        _id: {
            type: String,
            required: true,
            enum: Object.values(ROLES),
        },
        tenVaiTro: {
            type: String,
            required: true,
            trim: true,
        },
        danhSachQuyen: [
            {
                type: String,
                trim: true,
            },
        ],
        moTa: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
        _id: false,
    },
);

module.exports = mongoose.model('VaiTro', vaiTroSchema, 'vaitros');
