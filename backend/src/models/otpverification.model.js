const mongoose = require('mongoose');
const { Schema } = mongoose;

const otpVerificationSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        otpHash: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index tự động dọn dẹp khi hết hạn
        },
        attempts: {
            type: Number,
            default: 0,
        },
        lastSentAt: {
            type: Date,
            default: Date.now,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        collection: 'otpverifications',
    },
);

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
