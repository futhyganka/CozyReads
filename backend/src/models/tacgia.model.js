const mongoose = require('mongoose');
const { Schema } = mongoose;

const tacGiaSchema = new Schema(
    {
        maTG: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        tenTg: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        quocTich: {
            type: String,
            default: 'Việt Nam',
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('TacGia', tacGiaSchema, 'tacgias');
