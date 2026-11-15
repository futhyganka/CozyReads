const express = require('express');
const router = express.Router();

const authRoute = require('./auth.route');
const docGiaRoute = require('./docgia.route');
const nhanVienRoute = require('./nhanvien.route');
const tacGiaRoute = require('./tacgia.route');
const danhMucRoute = require('./danhmuc.route');
const nhaXuatBanRoute = require('./nhaxuatban.route');
const sachRoute = require('./sach.route');
const muonTraRoute = require('./muontra.route');
const thanhToanRoute = require('./thanhtoan.route');
const phanHoiRoute = require('./phanhoi.route');

// 1. Auth API
router.use('/auth', authRoute);

// 2. Thực thể CRUD theo chuẩn RESTful (tên bảng trong collection lowercase thêm 's')
router.use('/docgias', docGiaRoute);
router.use('/nhanviens', nhanVienRoute);
router.use('/tacgias', tacGiaRoute);
router.use('/danhmucs', danhMucRoute);
router.use('/nhaxuatbans', nhaXuatBanRoute);
router.use('/sachs', sachRoute);
router.use('/theodoimuonsachs', muonTraRoute);
router.use('/kythanhtoans', thanhToanRoute);
router.use('/phanhois', phanHoiRoute);

// 3. Tương thích ngược với các endpoint cũ
router.use('/doc-gia', docGiaRoute);
router.use('/sach', sachRoute);
router.use('/muon-tra', muonTraRoute);
router.use('/thanh-toan', thanhToanRoute);
router.use('/phan-hoi', phanHoiRoute);

module.exports = router;
