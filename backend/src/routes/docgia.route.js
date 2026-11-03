const express = require('express');
const router = express.Router();
const DocGiaController = require('../controllers/docgia.controller');
const { checkPermission } = require('../middlewares/auth.middleware');
const { PERMISSIONS } = require('../constants/permissions');

router.get(
    '/:id',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    DocGiaController.getThongTinDocGia,
);
router.post(
    '/:id/gia-han',
    checkPermission(PERMISSIONS.BORROWS_READ_OWN),
    DocGiaController.taoKhoanThanhToanGiaHan,
);

module.exports = router;
