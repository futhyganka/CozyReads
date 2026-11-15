const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { DocGia, OtpVerification, RegistrationToken } = require('../src/models');
const AuthService = require('../src/services/auth.service');
const OtpService = require('../src/services/otp.service');
const MailService = require('../src/services/mail.service');
const DocGiaService = require('../src/services/docgia.service');

async function testXacThucEmailVaDangKy() {
    console.log('\n--- BẮT ĐẦU TEST: tests/xac-thuc-email.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // Mock MailService.guiEmailOtp để ghi lại OTP gửi đi mà không gửi mail thực tế làm chậm test
    let lastSentOtp = null;
    let lastSentEmail = null;
    const originalSendMail = MailService.guiEmailOtp;
    MailService.guiEmailOtp = async (email, otp) => {
        lastSentEmail = email;
        lastSentOtp = otp;
        return { messageId: 'mock-mail-id' };
    };

    const emailTest = 'ngantuyen_test@gmail.com';

    // 1. Kiểm tra định dạng email và email hợp lệ
    console.log('Case 1: Validate email định dạng không hợp lệ');
    let biLoiEmailSai = false;
    try {
        await OtpService.guiOtpDangKy('email-khong-hop-le');
    } catch (err) {
        biLoiEmailSai = true;
        assert(err.message.includes('không hợp lệ'));
    }
    assert.strictEqual(biLoiEmailSai, true);

    // 2. Gửi OTP thành công lần đầu
    console.log('Case 2: Gửi OTP đăng ký lần đầu thành công');
    const resGuiOtp = await OtpService.guiOtpDangKy(emailTest);
    assert.strictEqual(resGuiOtp.email, emailTest);
    assert.strictEqual(resGuiOtp.thoiGianHieuLucPhut, 5);
    assert(lastSentOtp !== null);
    assert.strictEqual(lastSentOtp.length, 6);

    // Kiểm tra trong MongoDB OTP được lưu dạng HMAC, không plaintext
    const banGhiOtp = await OtpVerification.findOne({ email: emailTest });
    assert(banGhiOtp !== null);
    assert.notStrictEqual(banGhiOtp.otpHash, lastSentOtp); // Không lưu plaintext
    assert.strictEqual(banGhiOtp.otpHash, OtpService.hashOtp(emailTest, lastSentOtp));

    // 3. Kiểm tra Rate Limit gửi lại OTP (tối thiểu 60s)
    console.log('Case 3: Chặn gửi lại OTP khi chưa qua 60 giây (Rate Limiting)');
    let biChanCooldown = false;
    try {
        await OtpService.guiOtpDangKy(emailTest);
    } catch (err) {
        biChanCooldown = true;
        assert.strictEqual(err.statusCode, 429);
        assert(err.message.includes('Vui lòng đợi'));
    }
    assert.strictEqual(biChanCooldown, true);

    // 4. Cho phép gửi lại khi đã qua 60 giây và vô hiệu hóa OTP cũ
    console.log('Case 4: Gửi lại OTP sau 60 giây -> Vô hiệu hóa OTP cũ');
    const otp1 = lastSentOtp;
    // Giả lập lùi thời gian gửi trước đó về 61 giây trước
    banGhiOtp.lastSentAt = new Date(Date.now() - 61 * 1000);
    await banGhiOtp.save();

    await OtpService.guiOtpDangKy(emailTest);
    const otp2 = lastSentOtp;
    assert.notStrictEqual(otp1, otp2); // Sinh OTP mới
    const banGhiMoi = await OtpVerification.findOne({ email: emailTest });
    assert.strictEqual(banGhiMoi.otpHash, OtpService.hashOtp(emailTest, otp2));

    // 5. Xác thực OTP sai và kiểm tra giới hạn 5 lần
    console.log('Case 5: Xác thực OTP sai -> Đếm attempts và khóa sau 5 lần sai');
    let biSaiOtp = false;
    try {
        await OtpService.xacThucOtp(emailTest, '000000');
    } catch (err) {
        biSaiOtp = true;
        assert(err.message.includes('không chính xác'));
    }
    assert.strictEqual(biSaiOtp, true);

    // Giả lập nhập sai đến lần thứ 5
    await OtpVerification.updateOne({ email: emailTest }, { attempts: 5 });
    let biChan5Lan = false;
    try {
        await OtpService.xacThucOtp(emailTest, otp2);
    } catch (err) {
        biChan5Lan = true;
        assert(err.message.includes('quá 5 lần'));
    }
    assert.strictEqual(biChan5Lan, true);
    // Bản ghi bị xóa sau khi vượt 5 lần
    const banGhiBiXoa = await OtpVerification.findOne({ email: emailTest });
    assert.strictEqual(banGhiBiXoa, null);

    // 6. Kiểm tra OTP hết hạn (5 phút)
    console.log('Case 6: OTP hết hạn 5 phút');
    await OtpService.guiOtpDangKy(emailTest);
    const otp3 = lastSentOtp;
    await OtpVerification.updateOne(
        { email: emailTest },
        { expiresAt: new Date(Date.now() - 1000) }, // Hết hạn trong quá khứ
    );
    let biHetHanOtp = false;
    try {
        await OtpService.xacThucOtp(emailTest, otp3);
    } catch (err) {
        biHetHanOtp = true;
        assert(err.message.includes('hết hiệu lực'));
    }
    assert.strictEqual(biHetHanOtp, true);

    // 7. Xác thực OTP đúng -> Nhận registrationToken và vô hiệu hóa OTP
    console.log('Case 7: Xác thực OTP đúng -> Nhận registrationToken dùng 1 lần');
    await OtpService.guiOtpDangKy(emailTest);
    const otpChuan = lastSentOtp;
    const resXacThuc = await OtpService.xacThucOtp(emailTest, otpChuan);
    assert(resXacThuc.registrationToken !== undefined);
    assert.strictEqual(resXacThuc.email, emailTest);

    // OTP đã bị xóa sau khi xác thực thành công
    const otpSauXacThuc = await OtpVerification.findOne({ email: emailTest });
    assert.strictEqual(otpSauXacThuc, null);

    const regToken = resXacThuc.registrationToken;

    // 8. Chặn đăng ký khi không có registrationToken hoặc token giả
    console.log('Case 8: Chặn đăng ký độc giả khi không có registrationToken');
    let biChanKhongToken = false;
    try {
        await AuthService.dangKyDocGia({
            email: emailTest,
            password: 'Password@123',
            hoLot: 'Nguyễn',
            ten: 'An',
            dienThoai: '0901234567',
        });
    } catch (err) {
        biChanKhongToken = true;
        assert(err.message.includes('registrationToken'));
    }
    assert.strictEqual(biChanKhongToken, true);

    // 9. Hoàn tất đăng ký thành công bằng registrationToken
    console.log('Case 9: Hoàn tất đăng ký độc giả thành công');
    const resDangKy = await AuthService.dangKyDocGia({
        registrationToken: regToken,
        email: emailTest,
        password: 'Password@123',
        hoLot: 'Nguyễn',
        ten: 'An',
        dienThoai: '0901234567',
    });
    assert.strictEqual(resDangKy.success, true);
    assert(resDangKy.maDocGia.startsWith('DG'));
    assert.strictEqual(resDangKy.email, emailTest);
    assert.strictEqual(resDangKy.token, undefined); // Không trả JWT
    assert.strictEqual(resDangKy.password, undefined); // Không trả mật khẩu

    // 10. Chống sử dụng lại registrationToken lần 2 (dùng 1 lần)
    console.log('Case 10: Chặn sử dụng lại registrationToken đã tiêu thụ');
    let biChanTokenDaDung = false;
    try {
        await AuthService.dangKyDocGia({
            registrationToken: regToken,
            email: emailTest,
            password: 'Password@123',
            hoLot: 'Nguyễn',
            ten: 'An',
            dienThoai: '0901234567',
        });
    } catch (err) {
        biChanTokenDaDung = true;
        assert(err.message.includes('đã được sử dụng'));
    }
    assert.strictEqual(biChanTokenDaDung, true);

    // 11. Chặn gửi OTP khi email đã tồn tại trong hệ thống
    console.log('Case 11: Chặn gửi OTP đối với email đã đăng ký tài khoản');
    let biChanEmailDaTonTai = false;
    try {
        await OtpService.guiOtpDangKy(emailTest);
    } catch (err) {
        biChanEmailDaTonTai = true;
        assert(err.message.includes('đã được đăng ký'));
    }
    assert.strictEqual(biChanEmailDaTonTai, true);

    // 12. Đăng nhập bình thường sau khi đăng ký thành công
    console.log('Case 12: Độc giả đăng nhập thành công bằng email / mã độc giả và mật khẩu');
    const loginEmail = await AuthService.dangNhapDocGia({
        email: emailTest,
        password: 'Password@123',
    });
    assert.strictEqual(loginEmail.email, emailTest);
    assert(loginEmail.token !== undefined);

    const loginMaDocGia = await AuthService.dangNhapDocGia({
        maDocGia: resDangKy.maDocGia,
        password: 'Password@123',
    });
    assert.strictEqual(loginMaDocGia.docGia.maDocGia, resDangKy.maDocGia);

    // 13. Độc giả đăng ký tại quầy có email bắt buộc phải xác thực qua registrationToken
    console.log('Case 13: Độc giả đăng ký tại quầy có email phải có registrationToken hợp lệ');
    const emailTaiQuay = 'quay_docgia@test.com';
    let biChanTaiQuayChuaXacThuc = false;
    try {
        await DocGiaService.taoDocGiaTaiQuay({
            hoLot: 'Lê',
            ten: 'Bình',
            dienThoai: '0988112233',
            email: emailTaiQuay,
            password: 'Password@123',
        });
    } catch (err) {
        biChanTaiQuayChuaXacThuc = true;
        assert(err.message.includes('xác thực email trước'));
    }
    assert.strictEqual(biChanTaiQuayChuaXacThuc, true);

    // 14. Đổi email mới yêu cầu xác thực OTP trên email mới
    console.log('Case 14: Đổi email mới yêu cầu xác thực OTP trên email mới');
    const docGiaHienTai = await DocGia.findOne({ email: emailTest });
    const emailMoi = 'new_email_reader@test.com';

    // Chặn nếu cập nhật thẳng email mà không có verificationToken
    let biChanDoiEmailKhongToken = false;
    try {
        await DocGiaService.capNhatDocGia(docGiaHienTai._id, {
            email: emailMoi,
        });
    } catch (err) {
        biChanDoiEmailKhongToken = true;
        assert(err.message.includes('xác thực OTP trên email mới'));
    }
    assert.strictEqual(biChanDoiEmailKhongToken, true);

    // Gửi OTP tới email mới và xác thực
    await OtpService.guiOtpDoiEmail(emailMoi, docGiaHienTai._id);
    const otpDoiEmail = lastSentOtp;
    const resXacThucDoiEmail = await OtpService.xacThucOtp(emailMoi, otpDoiEmail);
    assert(resXacThucDoiEmail.verificationToken !== undefined);

    // Đổi email thành công với token
    const docGiaSauDoiEmail = await DocGiaService.capNhatDocGia(docGiaHienTai._id, {
        email: emailMoi,
        verificationToken: resXacThucDoiEmail.verificationToken,
    });
    assert.strictEqual(docGiaSauDoiEmail.email, emailMoi);

    // 15. Quên mật khẩu: Gửi OTP, xác thực và đặt lại mật khẩu mới
    console.log('Case 15: Quên mật khẩu: Gửi OTP, xác thực và đặt lại mật khẩu mới');
    // Chặn gửi OTP quên mật khẩu nếu email không tồn tại trong hệ thống
    let biChanEmailChuaDangKy = false;
    try {
        await OtpService.guiOtpQuenMatKhau('email_chua_dang_ky@test.com');
    } catch (err) {
        biChanEmailChuaDangKy = true;
        assert(err.message.includes('Không tìm thấy tài khoản độc giả'));
    }
    assert.strictEqual(biChanEmailChuaDangKy, true);

    // Gửi OTP quên mật khẩu cho email hiện tại
    await OtpService.guiOtpQuenMatKhau(emailMoi);
    const otpQuenMK = lastSentOtp;
    const resXacThucQuenMK = await OtpService.xacThucOtp(emailMoi, otpQuenMK);
    assert(resXacThucQuenMK.verificationToken !== undefined);

    // Đặt lại mật khẩu mới
    const resReset = await AuthService.datLaiMatKhauQuen({
        email: emailMoi,
        verificationToken: resXacThucQuenMK.verificationToken,
        matKhauMoi: 'newPassword@999',
    });
    assert.strictEqual(resReset.success, true);

    // Đăng nhập thử bằng mật khẩu cũ -> Thất bại
    let biSaiPassCu = false;
    try {
        await AuthService.dangNhapDocGia({
            email: emailMoi,
            password: 'Password@123',
        });
    } catch (err) {
        biSaiPassCu = true;
    }
    assert.strictEqual(biSaiPassCu, true);

    // Đăng nhập thử bằng mật khẩu mới -> Thành công
    const loginPassMoi = await AuthService.dangNhapDocGia({
        email: emailMoi,
        password: 'newPassword@999',
    });
    assert.strictEqual(loginPassMoi.email, emailMoi);
    assert(loginPassMoi.token !== undefined);

    // Khôi phục mail transporter gốc
    MailService.guiEmailOtp = originalSendMail;

    console.log('✅ tests/xac-thuc-email.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testXacThucEmailVaDangKy()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testXacThucEmailVaDangKy;
