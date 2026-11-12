const nodemailer = require('nodemailer');
const config = require('../config');

class MailService {
    static getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: config.email.user,
                    pass: config.email.pass,
                },
            });
        }
        return this.transporter;
    }

    /**
     * Gửi email mã OTP xác thực
     */
    static async guiEmailOtp(email, otp) {
        // Trong môi trường test có thể mock hoặc gửi thực
        const transporter = this.getTransporter();
        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: 'Mã xác thực OTP đăng ký tài khoản CozyReads',
            html: `
                <div>
                    <p>Xin chào,</p>
                    <p>Bạn đang thực hiện đăng ký tài khoản độc giả tại CozyReads. Mã OTP xác thực email của bạn là:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px;">
                            ${otp}
                        </span>
                    </div>
                    <p style="color: #e53e3e; font-size: 14px;"><strong>Lưu ý:</strong> Mã này có hiệu lực trong vòng 5 phút và chỉ sử dụng một lần.<br/>
                    Vui lòng không phản hồi lại email này.</p>
                </div>
            `,
        };

        return transporter.sendMail(mailOptions);
    }
}

module.exports = MailService;
