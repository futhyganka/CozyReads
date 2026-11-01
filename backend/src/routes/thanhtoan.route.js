const express = require('express');
const router = express.Router();
const ThanhToanController = require('../controllers/thanhtoan.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Xem lịch sử thanh toán của độc giả
router.get(
    '/doc-gia/:docGiaId',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    ThanhToanController.getThanhToanCuaDocGia,
);

// Chỉ Nhân viên hoặc Admin mới có quyền xác nhận thanh toán hợp lệ
router.post(
    '/xac-nhan',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    ThanhToanController.xacNhanThanhToan,
);

module.exports = router;
