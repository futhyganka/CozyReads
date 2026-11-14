const crypto = require('crypto');
const config = require('../config');
const ApiError = require('../api-error');
const { DocGia, OtpVerification, RegistrationToken } = require('../models');
const MailService = require('./mail.service');
const { REGEX } = require('../constants/business-rules');

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
     * Băm token bằng SHA-256
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
        return REGEX.EMAIL.test(email.trim());
    }

    /**
     * Kiểm tra định dạng số điện thoại Việt Nam hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)
     */
    static kiemTraSoDienThoai(dienThoai) {
        if (!dienThoai || typeof dienThoai !== 'string') return false;
        return REGEX.SO_DIEN_THOAI.test(dienThoai.trim());
    }

    /**
     * Hàm dùng chung: Tạo OTP, kiểm tra rate limit và gửi email
     */
    static async guiOtpChung(normalizedEmail, mucDich = 'dangKy') {
        const banGhiCu = await OtpVerification.findOne({ email: normalizedEmail });
        const now = new Date();

        // Kiểm tra Rate Limit (tối thiểu 60 giây giữa các lần gửi)
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

        const otp = this.taoOtp6So();
        const otpHash = this.hashOtp(normalizedEmail, otp);
        const expiresAt = new Date(now.getTime() + config.otp.expiryMinutes * 60 * 1000);

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

        try {
            await MailService.guiEmailOtp(normalizedEmail, otp, mucDich);
        } catch (error) {
            console.error('[MAIL ERROR] Gửi OTP thất bại:', error.message);
            throw new ApiError(500, 'Không thể gửi email OTP, vui lòng thử lại sau.');
        }

        return {
            email: normalizedEmail,
            message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
            thoiGianHieuLucPhut: config.otp.expiryMinutes,
        };
    }

    /**
     * Bước 1 & 2: Gửi OTP xác thực email ĐĂNG KÝ
     */
    static async guiOtpDangKy(email) {
        if (!email || !this.kiemTraDinhDangEmail(email)) {
            throw new ApiError(400, 'Địa chỉ email không hợp lệ.');
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Kiểm tra email đã tồn tại trong hệ thống chưa (Đăng ký -> không được trùng)
        const docGiaDaTonTai = await DocGia.findOne({ email: normalizedEmail });
        if (docGiaDaTonTai) {
            throw new ApiError(400, 'Email này đã được đăng ký tài khoản trong hệ thống.');
        }

        return this.guiOtpChung(normalizedEmail, 'dangKy');
    }

    /**
     * Gửi OTP xác thực ĐỔI EMAIL MỚI (chỉ gửi tới email mới chưa từng đăng ký)
     */
    static async guiOtpDoiEmail(emailMoi, docGiaIdHienTai) {
        if (!emailMoi || !this.kiemTraDinhDangEmail(emailMoi)) {
            throw new ApiError(400, 'Địa chỉ email mới không hợp lệ.');
        }

        const normalizedEmail = emailMoi.trim().toLowerCase();

        // Kiểm tra xem email mới này có bị ai khác dùng chưa
        const query = { email: normalizedEmail };
        if (docGiaIdHienTai) {
            query._id = { $ne: docGiaIdHienTai };
        }
        const emailExists = await DocGia.findOne(query);
        if (emailExists) {
            throw new ApiError(400, 'Email mới này đã được sử dụng bởi một tài khoản khác.');
        }

        return this.guiOtpChung(normalizedEmail, 'doiEmail');
    }

    /**
     * Gửi OTP QUÊN MẬT KHẨU (chỉ gửi tới email ĐÃ TỒN TẠI trong hệ thống)
     */
    static async guiOtpQuenMatKhau(email) {
        if (!email || !this.kiemTraDinhDangEmail(email)) {
            throw new ApiError(400, 'Địa chỉ email không hợp lệ.');
        }

        const normalizedEmail = email.trim().toLowerCase();

        const docGia = await DocGia.findOne({ email: normalizedEmail });
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy tài khoản độc giả nào gắn với email này.');
        }

        return this.guiOtpChung(normalizedEmail, 'quenMatKhau');
    }

    /**
     * Bước 3: Xác thực OTP và cấp verificationToken dùng 1 lần (dùng cho đăng ký, đổi email, quên mật khẩu)
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

        // Cấp verificationToken (registrationToken/resetToken) ngắn hạn (15 phút), ngẫu nhiên 64 ký tự hex
        const rawToken = crypto.randomBytes(32).toString('hex'); // tạo ra token
        const tokenHash = this.hashToken(rawToken);
        const tokenExpiresAt = new Date(
            now.getTime() + config.otp.registrationTokenExpiryMinutes * 60 * 1000, // tính thời gian hết hạn của token
        );

        // Vô hiệu hóa các token cũ của email này nếu có
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
            verificationToken: rawToken,
            message: 'Xác thực email thành công.',
            expiresInMinutes: config.otp.registrationTokenExpiryMinutes,
        };
    }

    /**
     * Tiêu thụ token xác thực dùng 1 lần (dùng cho đăng ký, đổi email, đặt lại mật khẩu)
     */
    static async tieuThuRegistrationToken(registrationToken, expectedEmail = null) {
        if (!registrationToken) {
            throw new ApiError(400, 'Mã xác thực token là bắt buộc.');
        }

        const tokenHash = this.hashToken(registrationToken.trim());
        const tokenDoc = await RegistrationToken.findOne({ tokenHash });

        if (!tokenDoc) {
            throw new ApiError(400, 'Token xác thực không hợp lệ hoặc không tồn tại.');
        }

        if (tokenDoc.isUsed) {
            throw new ApiError(400, 'Token xác thực này đã được sử dụng.');
        }

        const now = new Date();
        if (now > tokenDoc.expiresAt) {
            throw new ApiError(400, 'Token xác thực đã hết hạn. Vui lòng gửi lại OTP xác thực.');
        }

        if (expectedEmail && tokenDoc.email !== expectedEmail.trim().toLowerCase()) {
            throw new ApiError(400, 'Token xác thực không khớp với email được cung cấp.');
        }

        // Đánh dấu đã sử dụng (atomic update để chống race condition)
        const updated = await RegistrationToken.findOneAndUpdate(
            { _id: tokenDoc._id, isUsed: false },
            { isUsed: true, usedAt: now },
            { returnDocument: 'after' },
        );

        if (!updated) {
            throw new ApiError(400, 'Token xác thực đã được sử dụng bởi một yêu cầu khác.');
        }

        return updated.email;
    }
}

module.exports = OtpService;
