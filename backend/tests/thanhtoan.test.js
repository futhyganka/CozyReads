const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const {
    Sach,
    DocGia,
    NhanVien,
    TheoDoiMuonSach,
    ThanhToan,
    NhaXuatBan,
    TacGia,
    DanhMuc,
} = require('../src/models');
const MuonTraService = require('../src/services/muontra.service');
const ThanhToanService = require('../src/services/thanhtoan.service');
const DocGiaService = require('../src/services/docgia.service');
const AuthService = require('../src/services/auth.service');
const {
    TRANG_THAI_MUON,
    TRANG_THAI_THANH_TOAN,
    TRANG_THAI_DOC_GIA,
} = require('../src/constants/business-rules');

async function testThanhToan() {
    console.log('\n--- BẮT ĐẦU TEST: tests/thanhtoan.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // 1. Tạo dữ liệu mẫu
    const nxb = await NhaXuatBan.create({
        maNxb: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({ maTg: 'TG01', tenTg: 'Tác Giả 1' });
    const dm = await DanhMuc.create({ maDm: 'DM01', tenDm: 'Danh Mục 1' });

    const sach = await Sach.create({
        maSach: 'MS999',
        tenSach: 'Lập trình Node.js',
        donGia: 120000,
        soQuyen: 5,
        namXuatBan: 2023,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });

    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv_tt@test.com',
        password: '123',
        hoTen: 'Nhân Viên Thu Ngân',
    });
    const { docGia } = await AuthService.dangKyDocGia({
        email: 'dg_tt@test.com',
        password: '123',
        hoLot: 'Đỗ',
        ten: 'Nam',
        dienThoai: '0966666666',
    });

    // Case 1: Mượn sách và báo mất -> Tự động sinh hóa đơn bồi thường
    console.log(
        'Case 1: Báo mất sách -> Sinh khoản thanh toán bồi thường (choXacNhan)',
    );
    const phieuMuon = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach._id,
        msnvMuonId: nhanVien._id,
    });

    const { thanhToan } = await MuonTraService.baoMatSach({
        luotMuonId: phieuMuon._id,
        msnvGhiNhanId: nhanVien._id,
    });
    assert.strictEqual(thanhToan.trangThai, TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN);
    assert.strictEqual(
        thanhToan.soTien,
        120000,
        'Số tiền bồi thường phải khớp với đơn giá sách',
    );

    // Case 2: Nhân viên xác nhận thanh toán bồi thường -> Chuyển lượt mượn sang daBoiThuong
    console.log(
        'Case 2: Nhân viên xác nhận thanh toán bồi thường -> chuyển lượt mượn thành daBoiThuong',
    );
    const xacNhanRes = await ThanhToanService.xacNhanThanhToan({
        maThanhToan: thanhToan.maThanhToan,
        msnvId: nhanVien._id,
    });
    assert.strictEqual(
        xacNhanRes.trangThai,
        TRANG_THAI_THANH_TOAN.DA_THANH_TOAN,
    );
    assert.strictEqual(xacNhanRes.msnv.toString(), nhanVien._id.toString());

    const phieuMuonSauBoiThuong = await TheoDoiMuonSach.findById(phieuMuon._id);
    assert.strictEqual(
        phieuMuonSauBoiThuong.trangThai,
        TRANG_THAI_MUON.DA_BOI_THUONG,
        'Lượt mượn phải đổi sang daBoiThuong',
    );

    // Case 3: Sau khi bồi thường xong, độc giả được phép mượn sách tiếp
    console.log(
        'Case 3: Sau khi hoàn thành bồi thường -> Độc giả được phép mượn tiếp',
    );
    const phieuMuonMoi = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach._id,
        msnvMuonId: nhanVien._id,
    });
    assert.strictEqual(phieuMuonMoi.trangThai, TRANG_THAI_MUON.DANG_MUON);

    // Case 4: Thanh toán gia hạn thẻ -> Cập nhật ngày hết hạn thẻ và mở khóa tài khoản
    console.log(
        'Case 4: Xác nhận thanh toán phí gia hạn thẻ (gói 1 tháng = 30 ngày) & mở khóa thẻ',
    );
    docGia.trangThai = TRANG_THAI_DOC_GIA.TAM_KHOA;
    await docGia.save();

    const yeuCauGiaHan = await DocGiaService.taoYeuCauGiaHanThe({
        docGiaId: docGia._id,
        goiGiaHan: '1_thang',
    });

    const thoiDiemGiaHan = new Date('2026-06-01T00:00:00Z');
    await ThanhToanService.xacNhanThanhToan({
        maThanhToan: yeuCauGiaHan.maThanhToan,
        msnvId: nhanVien._id,
        ngayThanhToan: thoiDiemGiaHan,
    });

    const docGiaSauGiaHan = await DocGia.findById(docGia._id);
    assert.strictEqual(
        docGiaSauGiaHan.trangThai,
        TRANG_THAI_DOC_GIA.HOAT_DONG,
        'Thẻ phải được mở khóa',
    );
    const ngayHetHanExpected = new Date(
        thoiDiemGiaHan.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    assert.strictEqual(
        docGiaSauGiaHan.ngayHetHanThe.toISOString(),
        ngayHetHanExpected.toISOString(),
        'Thẻ được gia hạn thêm đúng 30 ngày',
    );

    console.log('✅ tests/thanhtoan.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testThanhToan()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testThanhToan;
