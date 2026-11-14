const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Bước 1 & 2: Gửi OTP xác thực email
router.post('/gui-otp-dang-ky', AuthController.guiOtpDangKy);

// Bước 3: Xác thực OTP và nhận registrationToken
router.post('/xac-thuc-otp', AuthController.xacThucOtp);

// Bước 4: Hoàn tất đăng ký độc giả
router.post('/dang-ky-doc-gia', AuthController.dangKyDocGia);

// Đăng nhập độc giả
router.post('/dang-nhap-doc-gia', AuthController.dangNhapDocGia);

// Đăng nhập nhân viên
router.post('/dang-nhap-nhan-vien', AuthController.dangNhapNhanVien);

// Quên mật khẩu: Gửi OTP
router.post('/gui-otp-quen-mat-khau', AuthController.guiOtpQuenMatKhau);

// Quên mật khẩu: Đặt lại mật khẩu mới bằng verificationToken
router.post('/dat-lai-mat-khau', AuthController.datLaiMatKhau);

module.exports = router;
