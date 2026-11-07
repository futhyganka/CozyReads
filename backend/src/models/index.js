const DocGia = require('./docgia.model');
const NhanVien = require('./nhanvien.model');
const Sach = require('./sach.model');
const TacGia = require('./tacgia.model');
const DanhMuc = require('./danhmuc.model');
const NhaXuatBan = require('./nhaxuatban.model');
const TheoDoiMuonSach = require('./theodoimuonsach.model');
const KyThanhToan = require('./kythanhtoan.model');

module.exports = {
    DocGia,
    NhanVien,
    Sach,
    TacGia,
    DanhMuc,
    NhaXuatBan,
    TheoDoiMuonSach,
    KyThanhToan,
    ThanhToan: KyThanhToan,
};
