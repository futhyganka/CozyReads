const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Đăng ký độc giả trực tuyến
router.post('/dang-ky-doc-gia', AuthController.dangKyDocGia);

// Đăng nhập độc giả
router.post('/dang-nhap-doc-gia', AuthController.dangNhapDocGia);

// Đăng nhập nhân viên
router.post('/dang-nhap-nhan-vien', AuthController.dangNhapNhanVien);

// Đăng nhập chung
router.post('/dang-nhap', AuthController.dangNhap);

module.exports = router;
