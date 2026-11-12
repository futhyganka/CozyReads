const mongoose = require('mongoose');
const { Schema } = mongoose;

const registrationTokenSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index tự động dọn dẹp khi hết hạn
        },
        isUsed: {
            type: Boolean,
            default: false,
            index: true,
        },
        usedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        collection: 'registrationtokens',
    },
);

module.exports = mongoose.model('RegistrationToken', registrationTokenSchema);
