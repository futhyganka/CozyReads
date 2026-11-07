const express = require('express');
const router = express.Router();
const TacGiaController = require('../controllers/tacgia.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Xem danh sách và chi tiết tác giả (Guest, Reader, Librarian, Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.BOOKS_READ),
    TacGiaController.getDanhSachTacGia,
);
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_READ),
    TacGiaController.getChiTietTacGia,
);

// Thêm, sửa, xóa tác giả (Librarian, Admin)
router.post(
    '/',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    TacGiaController.themTacGia,
);
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    TacGiaController.capNhatTacGia,
);
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    TacGiaController.xoaTacGia,
);

module.exports = router;
