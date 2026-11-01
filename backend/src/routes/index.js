const express = require('express');
const router = express.Router();

const sachRoute = require('./sach.route');
const muonTraRoute = require('./muontra.route');
const docGiaRoute = require('./docgia.route');
const thanhToanRoute = require('./thanhtoan.route');
const authRoute = require('./auth.route');

router.use('/sach', sachRoute);
router.use('/muon-tra', muonTraRoute);
router.use('/doc-gia', docGiaRoute);
router.use('/thanh-toan', thanhToanRoute);
router.use('/auth', authRoute);

module.exports = router;
