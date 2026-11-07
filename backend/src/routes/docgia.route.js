const express = require('express');
const router = express.Router();
const DocGiaController = require('../controllers/docgia.controller');
const { checkPermission, requireAuth } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Lấy danh sách độc giả (Librarian, Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.READERS_MANAGE),
    DocGiaController.getDanhSachDocGia,
);

// Lấy chi tiết độc giả (Bản thân hoặc Quản lý)
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    DocGiaController.getChiTietDocGia,
);

// Tạo độc giả tại quầy (Librarian, Admin)
router.post(
    '/',
    checkPermission(PERMISSIONS.READERS_MANAGE),
    DocGiaController.taoDocGia,
);

// Cập nhật thông tin độc giả (Bản thân hoặc Quản lý)
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    DocGiaController.capNhatDocGia,
);

// Xóa hoặc vô hiệu hóa độc giả (Admin)
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    DocGiaController.xoaDocGia,
);

// Đổi mật khẩu
router.post(
    '/:id/doi-mat-khau',
    requireAuth,
    DocGiaController.doiMatKhau,
);

// Khóa/Mở khóa thẻ (Librarian, Admin)
router.patch(
    '/:id/trang-thai',
    checkPermission(PERMISSIONS.READERS_MANAGE),
    DocGiaController.capNhatTrangThaiThe,
);

// Cập nhật điểm độc giả (Librarian, Admin)
router.patch(
    '/:id/diem',
    checkPermission(PERMISSIONS.READERS_MANAGE),
    DocGiaController.capNhatDiem,
);

// Tạo yêu cầu gia hạn thẻ
router.post(
    '/:id/gia-han',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    DocGiaController.taoKhoanThanhToanGiaHan,
);

module.exports = router;
