const DocGia = require('./docgia.model');
const NhanVien = require('./nhanvien.model');
const Sach = require('./sach.model');
const TacGia = require('./tacgia.model');
const DanhMuc = require('./danhmuc.model');
const NhaXuatBan = require('./nhaxuatban.model');
const TheoDoiMuonSach = require('./theodoimuonsach.model');
const KyThanhToan = require('./kythanhtoan.model');
const OtpVerification = require('./otpverification.model');
const RegistrationToken = require('./registrationtoken.model');
const PhanHoi = require('./phanhoi.model');

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
    OtpVerification,
    RegistrationToken,
    PhanHoi,
};
