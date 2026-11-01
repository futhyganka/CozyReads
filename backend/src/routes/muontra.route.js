const express = require('express');
const router = express.Router();
const MuonTraController = require('../controllers/muontra.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Độc giả, Nhân viên, Admin tạo phiếu mượn
router.post(
    '/kiem-tra',
    checkPermission(PERMISSIONS.BORROWS_CREATE),
    MuonTraController.kiemTraDieuKien,
);
router.post(
    '/',
    checkPermission(PERMISSIONS.BORROWS_CREATE),
    MuonTraController.taoPhieuMuon,
);

// Xem lịch sử mượn
router.get(
    '/lich-su/:docGiaId',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    MuonTraController.getLichSuMuon,
);

// Nhân viên và Admin xử lý trả sách & báo mất sách
router.post(
    '/tra-sach',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.traSach,
);
router.post(
    '/bao-mat',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.baoMatSach,
);

module.exports = router;
