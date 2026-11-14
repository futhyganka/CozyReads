const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { taoRegistrationTokenTest } = require('./helpers');
const {
    Sach,
    DocGia,
    TheoDoiMuonSach,
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

    const nxb = await NhaXuatBan.create({
        maNXB: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({ maTG: 'TG01', tenTg: 'Tác Giả 1' });
    const dm = await DanhMuc.create({ maDM: 'DM01', tenDm: 'Danh Mục 1' });

    const sach = await Sach.create({
        maSach: 'MS999',
        tenSach: 'Lập trình Node.js',
        donGia: 120000,
        soQuyen: 5,
        namXuatBan: 2023,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });

    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv_tt@test.com',
        password: 'password123',
        hoTen: 'Nhân Viên Thu Ngân',
        dienThoai: '0911222333',
    });
    const emailDgTt = 'dg_tt@test.com';
    const tokenDgTt = await taoRegistrationTokenTest(emailDgTt);
    await AuthService.dangKyDocGia({
        registrationToken: tokenDgTt,
        email: emailDgTt,
        password: 'password123',
        hoLot: 'Đỗ',
        ten: 'Nam',
        dienThoai: '0966666666',
    });
    const docGia = await DocGia.findOne({ email: emailDgTt });

    // Case 1: Báo mất sách -> Sinh khoản thanh toán bồi thường
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
    assert.strictEqual(thanhToan.soTien, 120000);

    // Case 2: Nhân viên xác nhận bồi thường -> Chuyển daBoiThuong
    console.log(
        'Case 2: Nhân viên xác nhận bồi thường -> Chuyển lượt mượn thành daBoiThuong',
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
    );

    // Case 3: Được mượn tiếp sau khi bồi thường
    console.log('Case 3: Sau khi hoàn thành bồi thường -> Được phép mượn tiếp');
    const phieuMuonMoi = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach._id,
        msnvMuonId: nhanVien._id,
    });
    assert.strictEqual(phieuMuonMoi.trangThai, TRANG_THAI_MUON.DANG_MUON);

    // Case 4: Thanh toán gia hạn thẻ
    console.log(
        'Case 4: Xác nhận thanh toán gia hạn thẻ (1 tháng = 30 ngày) & mở khóa thẻ',
    );
    docGia.trangThai = TRANG_THAI_DOC_GIA.TAM_KHOA;
    docGia.ngayHetHanThe = new Date('2026-05-01T00:00:00Z');
    await docGia.save();

    const yeuCauGiaHan = await DocGiaService.taoKhoanThanhToanGiaHan({
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
    assert.strictEqual(docGiaSauGiaHan.trangThai, TRANG_THAI_DOC_GIA.HOAT_DONG);
    const ngayHetHanExpected = new Date(
        thoiDiemGiaHan.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    assert.strictEqual(
        docGiaSauGiaHan.ngayHetHanThe.toISOString(),
        ngayHetHanExpected.toISOString(),
    );

    // Case 5: Quét và nhắc nhở bồi thường mất sách sau 3 ngày
    console.log('Case 5: Quét nhắc nhở bồi thường sách mất sau 3 ngày');
    const sach2 = await Sach.create({
        maSach: 'MS998',
        tenSach: 'Lập trình Python',
        donGia: 95000,
        soQuyen: 3,
        namXuatBan: 2024,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });
    const phieuMuon2 = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach2._id,
        msnvMuonId: nhanVien._id,
    });
    const { thanhToan: ttMatSach2 } = await MuonTraService.baoMatSach({
        luotMuonId: phieuMuon2._id,
        msnvGhiNhanId: nhanVien._id,
    });
    // Giả lập thời điểm tạo cách đây 4 ngày
    ttMatSach2.ngayTao = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await ttMatSach2.save();

    const ketQuaNhacNho = await ThanhToanService.quetVaNhacNhoBoiThuongMatSach(new Date());
    assert(ketQuaNhacNho.length >= 1);
    const itemNhac = ketQuaNhacNho.find(k => k.maThanhToan === ttMatSach2.maThanhToan);
    assert(itemNhac !== undefined);
    assert.strictEqual(itemNhac.soLanNhacNho, 2);

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
