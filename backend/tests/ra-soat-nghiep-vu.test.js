const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { taoRegistrationTokenTest } = require('./helpers');
const {
    Sach,
    DocGia,
    NhanVien,
    TheoDoiMuonSach,
    KyThanhToan,
    NhaXuatBan,
    TacGia,
    DanhMuc,
} = require('../src/models');
const MuonTraService = require('../src/services/muontra.service');
const NhanVienService = require('../src/services/nhanvien.service');
const AuthService = require('../src/services/auth.service');
const {
    TRANG_THAI_MUON,
    CHUC_VU_NHAN_VIEN,
    ROLES,
    PERMISSIONS,
} = require('../src/constants/business-rules');

async function testRaSoatNghiepVu() {
    console.log('\n--- BẮT ĐẦU TEST: tests/ra-soat-nghiep-vu.test.js ---');
    await connectTestDb();
    await clearTestDb();

    // Chuẩn bị dữ liệu mẫu NXB, Tác giả, Danh mục, Sách
    const nxb = await NhaXuatBan.create({
        maNXB: 'NXB_TEST',
        tenNxb: 'NXB Rà Soát',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({
        maTG: 'TG_TEST',
        tenTg: 'Tác Giả Rà Soát',
        quocTich: 'Việt Nam',
    });
    const dm = await DanhMuc.create({
        maDM: 'DM_TEST',
        tenDm: 'Danh Mục Rà Soát',
    });

    const sach = await Sach.create({
        maSach: 'MS_TEST_01',
        tenSach: 'Sách Kiểm Thử Rà Soát',
        donGia: 90000,
        soQuyen: 5,
        namXuatBan: 2024,
        maNXB: nxb._id,
        tacGia: tg._id,
        danhMuc: dm._id,
    });

    // 1. Tạo nhân viên & admin & độc giả
    const admin = await NhanVienService.taoNhanVien({
        hoTenNv: 'Admin Tổng',
        password: 'adminPassword123',
        chucVu: 'admin',
        soDienThoai: '0901111111',
    });

    const librarian = await NhanVienService.taoNhanVien({
        hoTenNv: 'Thủ Thư Quầy',
        password: 'librarianPassword123',
        chucVu: 'nhanVien',
        soDienThoai: '0902222222',
    });

    const emailR1 = 'reader1@test.com';
    const tokenR1 = await taoRegistrationTokenTest(emailR1);
    await AuthService.dangKyDocGia({
        registrationToken: tokenR1,
        email: emailR1,
        password: 'password123',
        hoLot: 'Nguyễn',
        ten: 'Một',
        dienThoai: '0903333333',
    });
    const reader1 = await DocGia.findOne({ email: emailR1 });

    const emailR2 = 'reader2@test.com';
    const tokenR2 = await taoRegistrationTokenTest(emailR2);
    await AuthService.dangKyDocGia({
        registrationToken: tokenR2,
        email: emailR2,
        password: 'password123',
        hoLot: 'Trần',
        ten: 'Hai',
        dienThoai: '0904444444',
    });
    const reader2 = await DocGia.findOne({ email: emailR2 });

    // Case 1: Reader không thể tự tạo phiếu mượn chính thức (thiếu MSNV_MUON sẽ bị từ chối)
    console.log('Case 1: Reader không thể tự tạo phiếu mượn chính thức nếu không có MSNV');
    let biChanTaoPhieuMuonChinhThuc = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: reader1._id,
            sachId: sach._id,
            msnvMuonId: null, // Không có nhân viên tại quầy
        });
    } catch (err) {
        biChanTaoPhieuMuonChinhThuc = true;
        assert(err.message.includes('bắt buộc phải có thông tin nhân viên'));
    }
    assert.strictEqual(biChanTaoPhieuMuonChinhThuc, true);

    // Case 2: Reader tự tạo phiếu giữ sách online trong 24h
    console.log('Case 2: Reader tạo yêu cầu giữ sách online (trạng thái: yeuCau_giuSach trong 24h)');
    const yeuCauGiu = await MuonTraService.taoYeuCauGiuSachOnline({
        docGiaId: reader1._id,
        sachId: sach._id,
    });
    assert.strictEqual(yeuCauGiu.trangThai, 'yeuCau_giuSach');
    assert.strictEqual(yeuCauGiu.msnvMuon, null);
    // Tồn kho sách giảm 1
    const sachSauGiu = await Sach.findById(sach._id);
    assert.strictEqual(sachSauGiu.soQuyen, 4);

    // Case 3: Qua 24h không tới trực tiếp quầy mượn -> Tự động hủy yêu cầu và hoàn lại sách
    console.log('Case 3: Quá 24h không tới quầy mượn -> Tự động hủy yêu cầu giữ sách và hoàn tồn kho');
    const thoiDiem25hSau = new Date(yeuCauGiu.ngayMuon.getTime() + 25 * 60 * 60 * 1000);
    const dsHuy = await MuonTraService.quetVaHuyYeuCauGiuSachQuaHan(thoiDiem25hSau);
    assert.strictEqual(dsHuy.length, 1);
    assert.strictEqual(dsHuy[0].trangThai, 'daHuy');

    const sachSauHuy = await Sach.findById(sach._id);
    assert.strictEqual(sachSauHuy.soQuyen, 5); // Tồn kho đã được hoàn về 5

    // Case 4: Librarian tạo phiếu mượn tại quầy thành công
    console.log('Case 4: Librarian tạo phiếu mượn tại quầy thành công');
    const phieuMuonLibrarian = await MuonTraService.taoPhieuMuon({
        docGiaId: reader1._id,
        sachId: sach._id,
        msnvMuonId: librarian._id,
    });
    assert.strictEqual(phieuMuonLibrarian.trangThai, 'dangMuon');
    assert.strictEqual(
        phieuMuonLibrarian.msnvMuon.toString(),
        librarian._id.toString(),
    );
    assert.strictEqual(
        phieuMuonLibrarian.maDocGia.toString(),
        reader1._id.toString(),
    );

    // Case 5: Admin tạo phiếu mượn tại quầy thành công
    console.log('Case 5: Admin tạo phiếu mượn tại quầy thành công');
    const sach2 = await Sach.create({
        maSach: 'MS_TEST_02',
        tenSach: 'Sách Thứ Hai',
        donGia: 60000,
        soQuyen: 3,
        namXuatBan: 2024,
        maNXB: nxb._id,
        tacGia: tg._id,
        danhMuc: dm._id,
    });
    const phieuMuonAdmin = await MuonTraService.taoPhieuMuon({
        docGiaId: reader2._id,
        sachId: sach2._id,
        msnvMuonId: admin._id,
    });
    assert.strictEqual(phieuMuonAdmin.trangThai, 'dangMuon');
    assert.strictEqual(
        phieuMuonAdmin.msnvMuon.toString(),
        admin._id.toString(),
    );
    assert.strictEqual(
        phieuMuonAdmin.maDocGia.toString(),
        reader2._id.toString(),
    );

    // Case 6: Quá hạn không phát sinh tiền phạt (tienPhat = 0), chỉ trừ điểm
    console.log('Case 6: Trả sách quá hạn không phát sinh tiền phạt');
    const ngayTraQuaHan = new Date(
        phieuMuonLibrarian.ngayMuon.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const traSachRes = await MuonTraService.traSach({
        luotMuonId: phieuMuonLibrarian._id,
        msnvTraId: librarian._id,
        ngayTra: ngayTraQuaHan,
    });
    assert.strictEqual(traSachRes.khoanPhat, null);
    assert.strictEqual(traSachRes.phieuMuon.tienPhat, 0);

    // Case 7: Mất sách tạo đúng khoản bồi thường (bằng đơn giá sách)
    console.log('Case 7: Mất sách tạo đúng khoản bồi thường theo đơn giá sách');
    const { thanhToan: ttBoiThuong } = await MuonTraService.baoMatSach({
        luotMuonId: phieuMuonAdmin._id,
        msnvGhiNhanId: librarian._id,
    });
    assert.strictEqual(ttBoiThuong.soTien, 60000);
    assert.strictEqual(ttBoiThuong.loai, 'phiPhat_matSach');
    assert.strictEqual(ttBoiThuong.trangThai, 'choXacNhan');

    // Case 8: Nhân viên đã nghỉ việc không thể đăng nhập
    console.log('Case 8: Nhân viên bị đánh dấu nghỉ việc không thể đăng nhập');
    const nvNghiViec = await NhanVienService.taoNhanVien({
        hoTenNv: 'Nhân Viên Nghỉ Việc',
        password: 'password123',
        chucVu: 'nhanVien',
        soDienThoai: '0999999999',
    });
    // Đánh dấu nghỉ việc
    await NhanVien.findByIdAndUpdate(nvNghiViec._id, { daNghiViec: true });

    let biChanDangNhapNghiViec = false;
    try {
        await AuthService.dangNhapNhanVien({
            msnv: nvNghiViec.msnv,
            password: 'password123',
        });
    } catch (err) {
        biChanDangNhapNghiViec = true;
        assert(err.message.includes('nghỉ việc'));
    }
    assert.strictEqual(biChanDangNhapNghiViec, true);

    console.log('✅ tests/ra-soat-nghiep-vu.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testRaSoatNghiepVu()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testRaSoatNghiepVu;
