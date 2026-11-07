const express = require('express');
const router = express.Router();
const MuonTraController = require('../controllers/muontra.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Lấy danh sách phiếu mượn (Librarian, Admin xem tất cả)
router.get(
    '/',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.getDanhSachPhieuMuon,
);

// Lấy chi tiết phiếu mượn
router.get(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    MuonTraController.getChiTietPhieuMuon,
);

// Kiểm tra điều kiện mượn
router.post(
    '/kiem-tra',
    checkPermission(PERMISSIONS.BORROWS_CREATE),
    MuonTraController.kiemTraDieuKien,
);

// Tạo phiếu mượn (Độc giả tạo giữ sách 24h hoặc Nhân viên tạo tại quầy)
router.post(
    '/',
    checkPermission(PERMISSIONS.BORROWS_CREATE),
    MuonTraController.taoPhieuMuon,
);

// Nhân viên xác nhận giữ sách thành mượn chính thức tại quầy
router.post(
    '/:id/xac-nhan-quay',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.xacNhanMuonTaiQuay,
);

// Xem lịch sử mượn của độc giả
router.get(
    '/lich-su/:docGiaId',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    MuonTraController.getLichSuMuon,
);

// Cập nhật thông tin phiếu mượn (Librarian, Admin)
router.put(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.capNhatPhieuMuon,
);

// Trả sách
router.post(
    '/tra-sach',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.traSach,
);
router.post(
    '/:id/tra-sach',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.traSach,
);

// Báo mất sách / hỏng sách
router.post(
    '/bao-mat',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.baoMatSach,
);
router.post(
    '/:id/bao-mat',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.baoMatSach,
);

// Xóa phiếu mượn (Librarian, Admin)
router.delete(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_MANAGE),
    MuonTraController.xoaPhieuMuon,
);

module.exports = router;
