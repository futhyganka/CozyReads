const crypto = require('crypto');
const config = require('../src/config');
const { RegistrationToken } = require('../src/models');

/**
 * Helper tạo registrationToken hợp lệ trực tiếp trong DB test (dành cho các test case cần nhanh chóng có user)
 */
async function taoRegistrationTokenTest(email) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await RegistrationToken.create({
        email: email.trim().toLowerCase(),
        tokenHash,
        expiresAt: tokenExpiresAt,
        isUsed: false,
    });

    return rawToken;
}

module.exports = {
    taoRegistrationTokenTest,
};
