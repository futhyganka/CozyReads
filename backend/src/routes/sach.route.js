const express = require('express');
const router = express.Router();
const SachController = require('../controllers/sach.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Công khai (Khách, Độc giả, Nhân viên, Admin đều xem được)
router.get(
    '/',
    checkPermission(PERMISSIONS.BOOKS_READ),
    SachController.getDanhSachSach,
);
router.get(
    '/goi-y',
    checkPermission(PERMISSIONS.BOOKS_READ),
    SachController.getGoiYSach,
);
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_READ),
    SachController.getChiTietSach,
);

// Nhân viên và Admin mới được thêm/sửa/xóa sách
router.post(
    '/',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    SachController.themSach,
);
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    SachController.capNhatSach,
);
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    SachController.xoaSach,
);

module.exports = router;
