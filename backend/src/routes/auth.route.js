const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

router.post('/dang-ky-doc-gia', AuthController.dangKyDocGia);
router.post('/dang-nhap', AuthController.dangNhap);

// Chỉ Admin mới được tạo tài khoản nhân viên / phân quyền
router.post(
    '/dang-ky-nhan-vien',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    AuthController.dangKyNhanVien,
);

module.exports = router;
