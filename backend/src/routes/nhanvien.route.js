const express = require('express');
const router = express.Router();
const NhanVienController = require('../controllers/nhanvien.controller');
const { checkPermission, requireAuth } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Lấy danh sách nhân viên (Chỉ Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    NhanVienController.getDanhSachNhanVien,
);

// Lấy chi tiết nhân viên
router.get(
    '/:id',
    requireAuth,
    NhanVienController.getChiTietNhanVien,
);

// Tạo nhân viên mới (Chỉ Admin)
router.post(
    '/',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    NhanVienController.taoNhanVien,
);

// Cập nhật thông tin nhân viên (Bản thân hoặc Admin)
router.put(
    '/:id',
    requireAuth,
    NhanVienController.capNhatNhanVien,
);

// Xóa hoặc vô hiệu hóa nhân viên (Chỉ Admin)
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    NhanVienController.xoaNhanVien,
);

// Đổi mật khẩu nhân viên
router.post(
    '/:id/doi-mat-khau',
    requireAuth,
    NhanVienController.doiMatKhau,
);

module.exports = router;
