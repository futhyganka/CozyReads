const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Đăng ký tài khoản chung
router.post('/dang-ky-tai-khoan', AuthController.dangKyTaiKhoan);

// Tạo hồ sơ độc giả
router.post('/tao-ho-so-doc-gia', AuthController.taoHoSoDocGia);

// Đăng ký độc giả trọn gói
router.post('/dang-ky-doc-gia', AuthController.dangKyDocGia);

// Đăng nhập
router.post('/dang-nhap', AuthController.dangNhap);

// Tạo hồ sơ nhân viên / đăng ký nhân viên (chỉ Admin)
router.post(
    '/tao-ho-so-nhan-vien',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    AuthController.taoHoSoNhanVien,
);
router.post(
    '/dang-ky-nhan-vien',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    AuthController.dangKyNhanVien,
);

module.exports = router;
