const express = require('express');
const router = express.Router();
const NhaXuatBanController = require('../controllers/nhaxuatban.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Xem danh sách và chi tiết nhà xuất bản (Guest, Reader, Librarian, Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.BOOKS_READ),
    NhaXuatBanController.getDanhSachNhaXuatBan,
);
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_READ),
    NhaXuatBanController.getChiTietNhaXuatBan,
);

// Thêm, sửa, xóa nhà xuất bản (Librarian, Admin)
router.post(
    '/',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    NhaXuatBanController.themNhaXuatBan,
);
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    NhaXuatBanController.capNhatNhaXuatBan,
);
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.BOOKS_WRITE),
    NhaXuatBanController.xoaNhaXuatBan,
);

module.exports = router;
