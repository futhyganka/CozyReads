const express = require('express');
const router = express.Router();
const PhanHoiController = require('../controllers/phanhoi.controller');
const {
    authenticate,
    requireAuth,
    checkPermission,
} = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);

// 1. Endpoint phía Độc giả / Khách
router.post(
    '/lien-he',
    requireAuth,
    checkPermission(PERMISSIONS.CONTACTS_CREATE),
    PhanHoiController.guiLienHe,
);
router.post(
    '/gop-y',
    checkPermission(PERMISSIONS.FEEDBACKS_CREATE),
    PhanHoiController.guiGopY,
);
router.get(
    '/cua-toi',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_READ_OWN),
    PhanHoiController.getDanhSachCuaToi,
);

// 2. Endpoint Quản lý dành cho Nhân viên & Admin
router.get(
    '/lien-he',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.getDanhSachLienHe,
);
router.get(
    '/gop-y',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.getDanhSachGopY,
);
router.get(
    '/',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.getDanhSachPhanHoi,
);
router.get(
    '/:id',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.getChiTietPhanHoi,
);
router.patch(
    '/:id/trang-thai',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.capNhatTrangThai,
);
router.post(
    '/:id/phan-hoi',
    requireAuth,
    checkPermission(PERMISSIONS.FEEDBACKS_MANAGE),
    PhanHoiController.guiPhanHoiLienHe,
);

module.exports = router;
