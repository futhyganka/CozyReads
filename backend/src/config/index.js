const databaseName = 'CozyReads';
const mongoURI = `mongodb://127.0.0.1:27017/${databaseName}`;
const port = 3000;

// Hỗ trợ nạp biến môi trường từ .env nếu có process.loadEnvFile (Node 20+)
if (typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile();
    } catch {
        // Bỏ qua nếu file .env không tồn tại
    }
}

const config = {
    app: {
        port: process.env.PORT || port,
    },
    db: {
        url: process.env.MONGODB_URL || mongoURI,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'cozyreads_jwt_secret_key_2026',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    email: {
        user: process.env.EMAIL_USER || 'ngantuyen1223@gmail.com',
        pass: process.env.EMAIL_PASS || 'lhyvbtsygoutvvsw',
    },
    otp: {
        secret: process.env.OTP_SECRET || 'cozyreads_otp_hmac_secret_key_2026',
        expiryMinutes: 5,
        resendCooldownSeconds: 60,
        maxAttempts: 5,
        registrationTokenExpiryMinutes: 15,
    },
};

module.exports = config;
