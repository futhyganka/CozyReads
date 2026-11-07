const express = require('express');
const router = express.Router();
const DanhMucController = require('../controllers/danhmuc.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Xem danh sách và chi tiết danh mục (Guest, Reader, Librarian, Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.BOOKS_READ),
    DanhMucController.getDanhSachDanhMuc,
);
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_READ),
    DanhMucController.getChiTietDanhMuc,
);

// Thêm, sửa, xóa danh mục (Librarian, Admin)
router.post(
    '/',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    DanhMucController.themDanhMuc,
);
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    DanhMucController.capNhatDanhMuc,
);
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    DanhMucController.xoaDanhMuc,
);

module.exports = router;
