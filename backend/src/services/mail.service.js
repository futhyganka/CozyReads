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
    static async guiEmailOtp(email, otp, mucDich = 'dangKy') {
        // Trong môi trường test có thể mock hoặc gửi thực
        const transporter = this.getTransporter();

        let tieuDe = 'Mã xác thực OTP đăng ký tài khoản CozyReads';
        let dongMota = 'Bạn đang thực hiện đăng ký tài khoản độc giả tại CozyReads. Mã OTP xác thực email của bạn là:';

        if (mucDich === 'doiEmail') {
            tieuDe = 'Mã xác thực OTP đổi email tài khoản CozyReads';
            dongMota = 'Bạn đang thực hiện yêu cầu thay đổi email cho tài khoản tại CozyReads. Mã OTP xác thực email mới của bạn là:';
        } else if (mucDich === 'quenMatKhau') {
            tieuDe = 'Mã xác thực OTP đặt lại mật khẩu CozyReads';
            dongMota = 'Bạn đang yêu cầu đặt lại mật khẩu tài khoản độc giả tại CozyReads. Mã OTP xác thực của bạn là:';
        }

        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: tieuDe,
            html: `
                <div>
                    <p>Xin chào,</p>
                    <p>${dongMota}</p>
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

    /**
     * Gửi email thông báo gia hạn thẻ thư viện (Độc giả tự do)
     */
    static async guiEmailGiaHanThe(email, { hoTen, maThanhToan, tenGoi, soTien, hanChot, loaiNhac = 'tao_moi' }) {
        const transporter = this.getTransporter();

        const tieuDe = loaiNhac === 'tao_moi'
            ? `[CozyReads] Thông báo gia hạn thẻ độc giả - Mã GD: ${maThanhToan}`
            : `[CozyReads] Cảnh báo sắp tạm khóa thẻ độc giả - Mã GD: ${maThanhToan}`;

        const loiNhan = loaiNhac === 'tao_moi'
            ? '<p>Thẻ thư viện của bạn đã đến kỳ gia hạn. Hệ thống đã tự động tạo yêu cầu thanh toán gia hạn với thông tin sau:</p>'
            : '<p style="color: #e53e3e;"><strong>Cảnh báo:</strong> Thẻ thư viện của bạn chỉ còn <strong>2 ngày</strong> nữa là hết thời gian ân hạn. Vui lòng thanh toán để tránh bị tạm khóa thẻ.</p>';

        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: tieuDe,
            html: `
                <div>
                    <p>Xin chào <strong>${hoTen || 'Độc giả'}</strong>,</p>
                    ${loiNhan}
                    <p>
                        - Mã thanh toán: <strong>${maThanhToan}</strong><br/>
                        - Gói gia hạn: <strong>${tenGoi}</strong><br/>
                        - Số tiền: <strong style="color: #2b6cb0;">${Number(soTien).toLocaleString('vi-VN')} VNĐ</strong><br/>
                        - Hạn chót thanh toán: <strong>${hanChot}</strong>
                    </p>
                    <p>Bạn có thể đến quầy thư viện để thanh toán trực tiếp hoặc liên hệ thủ thư để được hướng dẫn.</p>
                    <p style="color: #718096; font-size: 14px;"><em>Email này được gửi tự động từ hệ thống CozyReads. Vui lòng không phản hồi lại email này.</em></p>
                </div>
            `,
        };

        return transporter.sendMail(mailOptions);
    }

    /**
     * Gửi email thông báo bồi thường làm mất / hỏng sách
     */
    static async guiEmailBoiThuongMatSach(email, { hoTen, maThanhToan, tenSach, soTien, loaiNhac = 'tao_moi' }) {
        const transporter = this.getTransporter();

        const tieuDe = loaiNhac === 'tao_moi'
            ? `[CozyReads] Thông báo bồi thường mất/hỏng sách - Mã GD: ${maThanhToan}`
            : `[CozyReads] Nhắc nhở hoàn tất bồi thường mất/hỏng sách - Mã GD: ${maThanhToan}`;

        const loiNhan = loaiNhac === 'tao_moi'
            ? `<p>Thư viện CozyReads ghi nhận cuốn sách <strong>"${tenSach}"</strong> của bạn đã bị mất hoặc hư hại. Vui lòng hoàn tất khoản bồi thường theo quy định:</p>`
            : `<p style="color: #e53e3e;"><strong>Nhắc nhở:</strong> Bạn hiện vẫn còn khoản bồi thường sách chưa thanh toán tại CozyReads.</p>`;

        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: tieuDe,
            html: `
                <div>
                    <p>Xin chào <strong>${hoTen || 'Độc giả'}</strong>,</p>
                    ${loiNhan}
                    <p>
                        - Tên sách: <strong>${tenSach}</strong><br/>
                        - Mã thanh toán: <strong>${maThanhToan}</strong><br/>
                        - Số tiền bồi thường: <strong style="color: #e53e3e;">${Number(soTien).toLocaleString('vi-VN')} VNĐ</strong>
                    </p>
                    <p style="color: #4a5568;"><em>Lưu ý: Cuốn sách mất vẫn được tính vào tổng số sách đang giữ cho đến khi bạn hoàn tất bồi thường. Trong thời gian này, bạn sẽ bị giới hạn mượn sách mới.</em></p>
                    <p>Vui lòng đến quầy thư viện để hoàn tất khoản bồi thường trên.</p>
                    <p style="color: #718096; font-size: 14px;"><em>Email này được gửi tự động từ hệ thống CozyReads. Vui lòng không phản hồi lại email này.</em></p>
                </div>
            `,
        };

        return transporter.sendMail(mailOptions);
    }

    /**
     * Gửi email thông báo tạm khóa thẻ (kèm danh sách sách đang mượn & các khoản phí còn nợ)
     */
    static async guiEmailKhoaThe(email, { hoTen, lyDo, dsSachDangGiu = [], dsKhoanNo = [], tongTienNo = 0 }) {
        const transporter = this.getTransporter();

        const danhSachSachHtml = dsSachDangGiu.length > 0
            ? `
                <h4 style="color: #c53030; margin-bottom: 6px;">1. Yêu cầu hoàn trả sách:</h4>
                <p>Bạn hiện vẫn đang giữ các cuốn sách sau. <strong>Vui lòng mang toàn bộ sách đến quầy thư viện để hoàn trả ngay:</strong></p>
                <ul>
                    ${dsSachDangGiu.map(s => `<li><strong>${s.tenSach}</strong> (Hạn hẹn trả: ${s.ngayHenTra})</li>`).join('')}
                </ul>
            `
            : '';

        const danhSachNoHtml = dsKhoanNo.length > 0
            ? `
                <h4 style="color: #c53030; margin-bottom: 6px;">2. Yêu cầu thanh toán các khoản phí còn nợ:</h4>
                <p>Bạn có các khoản phí cần thanh toán dứt điểm:</p>
                <ul>
                    ${dsKhoanNo.map(k => `<li>${k.ghiChu || k.loai}: <strong>${Number(k.soTien).toLocaleString('vi-VN')} VNĐ</strong> (Mã GD: ${k.maThanhToan})</li>`).join('')}
                </ul>
                <p>Tổng tiền cần thanh toán: <strong style="color: #e53e3e; font-size: 16px;">${Number(tongTienNo).toLocaleString('vi-VN')} VNĐ</strong></p>
            `
            : '';

        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: '[CozyReads] Thông báo tạm khóa thẻ độc giả',
            html: `
                <div>
                    <p>Xin chào <strong>${hoTen || 'Độc giả'}</strong>,</p>
                    <p style="color: #e53e3e; font-size: 16px;"><strong>Thẻ thư viện của bạn đã bị tạm khóa.</strong></p>
                    <p>Lý do: <em>${lyDo}</em></p>
                    ${danhSachSachHtml}
                    ${danhSachNoHtml}
                    <p>Sau khi bạn hoàn trả toàn bộ sách và thanh toán hết các khoản phí trên, hệ thống sẽ tự động kích hoạt mở khóa lại thẻ độc giả.</p>
                    <p style="color: #718096; font-size: 14px;"><em>Email này được gửi tự động từ hệ thống CozyReads. Vui lòng không phản hồi lại email này.</em></p>
                </div>
            `,
        };

        return transporter.sendMail(mailOptions);
    }

    /**
     * Escape ký tự HTML nguy hiểm trước khi đưa vào nội dung Email HTML
     */
    static escapeHtml(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Gửi email phản hồi yêu cầu liên hệ cho độc giả
     * Chỉ đại diện cho Thư viện CozyReads, tuyệt đối không hiển thị thông tin nhân viên/Admin xử lý
     */
    static async guiEmailPhanHoiLienHe(email, { hoTen, maPhanHoi, noiDungPhanHoi }) {
        const transporter = this.getTransporter();

        const rawHoTen = (hoTen || 'Độc giả').trim();
        const rawMaPhanHoi = String(maPhanHoi || '').trim();
        const rawNoiDung = String(noiDungPhanHoi || '').trim();

        const safeHoTen = this.escapeHtml(rawHoTen);
        const safeMaPhanHoi = this.escapeHtml(rawMaPhanHoi);
        const safeNoiDungHtml = this.escapeHtml(rawNoiDung).replace(/\r?\n/g, '<br/>');

        const tieuDe = '[CozyReads] Phản hồi yêu cầu liên hệ';

        const plainText = [
            `Kính gửi ${rawHoTen},`,
            '',
            'Thư viện CozyReads xin phản hồi yêu cầu liên hệ của bạn như sau:',
            '',
            `Mã liên hệ: ${rawMaPhanHoi}`,
            '',
            'Nội dung phản hồi:',
            '',
            rawNoiDung,
            '',
            'Nếu cần hỗ trợ thêm, bạn có thể tiếp tục liên hệ với thư viện qua website CozyReads.',
            '',
            'Trân trọng,',
            '',
            'Thư viện CozyReads',
        ].join('\n');

        const htmlContent = `
            <div>
                <p>Kính gửi ${safeHoTen},</p>
                <p>Thư viện CozyReads xin phản hồi yêu cầu liên hệ của bạn như sau:</p>
                <p><strong>Mã liên hệ:</strong> ${safeMaPhanHoi}</p>
                <p><strong>Nội dung phản hồi:</strong></p>
                <p>${safeNoiDungHtml}</p>
                <p>Nếu cần hỗ trợ thêm, bạn có thể tiếp tục liên hệ với thư viện qua website CozyReads.</p>
                <p>Trân trọng,</p>
                <p><strong>Thư viện CozyReads</strong></p>
            </div>
        `;

        const mailOptions = {
            from: `"CozyReads Library" <${config.email.user}>`,
            to: email,
            subject: tieuDe,
            text: plainText,
            html: htmlContent,
        };

        return transporter.sendMail(mailOptions);
    }
}

module.exports = MailService;
