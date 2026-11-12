const crypto = require('crypto');
const config = require('../config');
const ApiError = require('../api-error');
const { DocGia, OtpVerification, RegistrationToken } = require('../models');
const MailService = require('./mail.service');

class OtpService {
    /**
     * Băm OTP bằng HMAC SHA-256 an toàn
     */
    static hashOtp(email, otp) {
        return crypto
            .createHmac('sha256', config.otp.secret)
            .update(`${email.toLowerCase()}:${otp}`)
            .digest('hex');
    }

    /**
     * Băm registrationToken bằng SHA-256
     */
    static hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Tạo mã OTP ngẫu nhiên 6 chữ số
     */
    static taoOtp6So() {
        return crypto.randomInt(100000, 1000000).toString();
    }

    /**
     * Kiểm tra định dạng email hợp lệ
     */
    static kiemTraDinhDangEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.trim());
    }

    /**
     * Bước 1 & 2: Gửi OTP xác thực email
     */
    static async guiOtpDangKy(email) {
        if (!email || !this.kiemTraDinhDangEmail(email)) {
            throw new ApiError(400, 'Địa chỉ email không hợp lệ.');
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Kiểm tra email đã tồn tại trong hệ thống chưa
        const docGiaDaTonTai = await DocGia.findOne({ email: normalizedEmail });
        if (docGiaDaTonTai) {
            throw new ApiError(400, 'Email này đã được đăng ký tài khoản trong hệ thống.');
        }

        // 2. Kiểm tra Rate Limit (tối thiểu 60 giây giữa các lần gửi)
        const banGhiCu = await OtpVerification.findOne({ email: normalizedEmail });
        const now = new Date();

        if (banGhiCu) {
            const timeSinceLastSent = (now.getTime() - new Date(banGhiCu.lastSentAt).getTime()) / 1000;
            if (timeSinceLastSent < config.otp.resendCooldownSeconds) {
                const conLai = Math.ceil(config.otp.resendCooldownSeconds - timeSinceLastSent);
                throw new ApiError(
                    429,
                    `Vui lòng đợi ${conLai} giây trước khi yêu cầu gửi lại mã OTP.`,
                );
            }
        }

        // 3. Tạo OTP ngẫu nhiên 6 chữ số và băm HMAC
        const otp = this.taoOtp6So();
        const otpHash = this.hashOtp(normalizedEmail, otp);
        const expiresAt = new Date(now.getTime() + config.otp.expiryMinutes * 60 * 1000);

        // 4. Lưu / cập nhật bản ghi OTP trong MongoDB (vô hiệu hóa OTP cũ)
        await OtpVerification.findOneAndUpdate(
            { email: normalizedEmail },
            {
                email: normalizedEmail,
                otpHash,
                expiresAt,
                attempts: 0,
                lastSentAt: now,
                isVerified: false,
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 5. Gửi email qua Nodemailer
        try {
            await MailService.guiEmailOtp(normalizedEmail, otp);
        } catch (error) {
            console.error('[MAIL ERROR] Gửi OTP thất bại:', error.message);
            throw new ApiError(500, 'Không thể gửi email OTP, vui lòng thử lại sau.');
        }

        return {
            email: normalizedEmail,
            message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
            thoiGianHieuLucPhut: config.otp.expiryMinutes,
            // KHÔNG TRẢ VỀ OTP
        };
    }

    /**
     * Bước 3: Xác thực OTP và cấp registrationToken dùng 1 lần
     */
    static async xacThucOtp(email, otp) {
        if (!email || !otp) {
            throw new ApiError(400, 'Email và mã OTP là bắt buộc.');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const banGhiOtp = await OtpVerification.findOne({ email: normalizedEmail });

        if (!banGhiOtp) {
            throw new ApiError(400, 'Không tìm thấy yêu cầu xác thực OTP cho email này hoặc mã đã hết hạn.');
        }

        const now = new Date();

        // Kiểm tra hết hạn (5 phút)
        if (now > banGhiOtp.expiresAt) {
            await OtpVerification.deleteOne({ _id: banGhiOtp._id });
            throw new ApiError(400, 'Mã OTP đã hết hiệu lực. Vui lòng yêu cầu mã mới.');
        }

        // Kiểm tra vượt quá số lần nhập sai (5 lần)
        if (banGhiOtp.attempts >= config.otp.maxAttempts) {
            await OtpVerification.deleteOne({ _id: banGhiOtp._id });
            throw new ApiError(
                400,
                'Bạn đã nhập sai OTP quá 5 lần. Mã OTP đã bị vô hiệu hóa, vui lòng yêu cầu mã mới.',
            );
        }

        // Kiểm tra tính chính xác của OTP
        const inputHash = this.hashOtp(normalizedEmail, otp.toString().trim());
        if (inputHash !== banGhiOtp.otpHash) {
            banGhiOtp.attempts += 1;
            await banGhiOtp.save();
            const conLai = config.otp.maxAttempts - banGhiOtp.attempts;
            throw new ApiError(
                400,
                `Mã OTP không chính xác. Bạn còn ${conLai} lần thử.`,
            );
        }

        // OTP chính xác -> Xóa bản ghi OTP để vô hiệu hóa ngay lập tức
        await OtpVerification.deleteOne({ _id: banGhiOtp._id });

        // Cấp registrationToken ngắn hạn (15 phút), ngẫu nhiên 64 ký tự hex
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const tokenExpiresAt = new Date(
            now.getTime() + config.otp.registrationTokenExpiryMinutes * 60 * 1000,
        );

        // Vô hiệu hóa các registrationToken cũ của email này nếu có
        await RegistrationToken.deleteMany({ email: normalizedEmail });

        await RegistrationToken.create({
            email: normalizedEmail,
            tokenHash,
            expiresAt: tokenExpiresAt,
            isUsed: false,
        });

        return {
            email: normalizedEmail,
            registrationToken: rawToken,
            message: 'Xác thực email thành công. Vui lòng hoàn tất thông tin đăng ký.',
            expiresInMinutes: config.otp.registrationTokenExpiryMinutes,
        };
    }

    /**
     * Kiểm tra và tiêu thụ registrationToken (chỉ dùng 1 lần)
     */
    static async tieuThuRegistrationToken(registrationToken, expectedEmail = null) {
        if (!registrationToken) {
            throw new ApiError(400, 'Mã registrationToken là bắt buộc để hoàn tất đăng ký.');
        }

        const tokenHash = this.hashToken(registrationToken.trim());
        const tokenDoc = await RegistrationToken.findOne({ tokenHash });

        if (!tokenDoc) {
            throw new ApiError(400, 'RegistrationToken không hợp lệ hoặc không tồn tại.');
        }

        if (tokenDoc.isUsed) {
            throw new ApiError(400, 'RegistrationToken này đã được sử dụng.');
        }

        const now = new Date();
        if (now > tokenDoc.expiresAt) {
            throw new ApiError(400, 'RegistrationToken đã hết hạn. Vui lòng xác thực lại email.');
        }

        if (expectedEmail && tokenDoc.email !== expectedEmail.trim().toLowerCase()) {
            throw new ApiError(400, 'RegistrationToken không khớp với email đăng ký.');
        }

        // Đánh dấu đã sử dụng (atomic update để chống race condition)
        const updated = await RegistrationToken.findOneAndUpdate(
            { _id: tokenDoc._id, isUsed: false },
            { isUsed: true, usedAt: now },
            { returnDocument: 'after' },
        );

        if (!updated) {
            throw new ApiError(400, 'RegistrationToken đã được sử dụng bởi một yêu cầu khác.');
        }

        return updated.email;
    }
}

module.exports = OtpService;
