const express = require('express');
const router = express.Router();
const KyThanhToanController = require('../controllers/kythanhtoan.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Lấy danh sách giao dịch thanh toán (Librarian, Admin)
router.get(
    '/',
    checkPermission(PERMISSIONS.PAYMENTS_READ),
    KyThanhToanController.getDanhSachThanhToan,
);

// Lấy chi tiết thanh toán
router.get(
    '/:id',
    checkPermission(PERMISSIONS.PAYMENTS_READ_OWN),
    KyThanhToanController.getChiTietThanhToan,
);

// Tạo giao dịch thanh toán mới
router.post(
    '/',
    checkPermission(PERMISSIONS.PAYMENTS_CREATE),
    KyThanhToanController.taoThanhToan,
);

// Cập nhật phương thức hoặc ghi chú thanh toán
router.put(
    '/:id',
    checkPermission(PERMISSIONS.PAYMENTS_MANAGE),
    KyThanhToanController.capNhatThanhToan,
);

// Xác nhận thanh toán hợp lệ (Chỉ Librarian hoặc Admin)
router.post(
    '/xac-nhan',
    checkPermission(PERMISSIONS.PAYMENTS_MANAGE),
    KyThanhToanController.xacNhanThanhToan,
);
router.post(
    '/:id/xac-nhan',
    checkPermission(PERMISSIONS.PAYMENTS_MANAGE),
    KyThanhToanController.xacNhanThanhToan,
);

// Hủy giao dịch thanh toán (Librarian, Admin)
router.post(
    '/:id/huy',
    checkPermission(PERMISSIONS.PAYMENTS_MANAGE),
    KyThanhToanController.huyThanhToan,
);

// Xóa giao dịch thanh toán (Admin)
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.USERS_MANAGE),
    KyThanhToanController.xoaThanhToan,
);

// Xem lịch sử thanh toán của độc giả
router.get(
    '/doc-gia/:docGiaId',
    checkPermission(PERMISSIONS.PAYMENTS_READ_OWN),
    KyThanhToanController.getThanhToanCuaDocGia,
);

module.exports = router;
