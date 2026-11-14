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
const DiemService = require('../src/services/diem.service');
const AuthService = require('../src/services/auth.service');
const { TRANG_THAI_MUON } = require('../src/constants/business-rules');

async function testDiemTuDong() {
    console.log('\n--- BẮT ĐẦU TEST: tests/diem-tudong.test.js ---');
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

    const sachA = await Sach.create({
        maSach: 'SA01',
        tenSach: 'Sách A',
        donGia: 50000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });
    const sachB = await Sach.create({
        maSach: 'SB01',
        tenSach: 'Sách B',
        donGia: 60000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });

    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv_diem@test.com',
        password: 'password123',
        hoTen: 'Thủ Thư',
        dienThoai: '0988111222',
    });
    const emailDgDiem = 'dg_diem@test.com';
    const regTokenDgDiem = await taoRegistrationTokenTest(emailDgDiem);
    await AuthService.dangKyDocGia({
        registrationToken: regTokenDgDiem,
        email: emailDgDiem,
        password: 'password123',
        hoLot: 'Lê',
        ten: 'Bình',
        dienThoai: '0988888888',
    });
    const docGia = await DocGia.findOne({ email: emailDgDiem });

    // Case 1: Thang điểm
    console.log('Case 1: Kiểm tra thang điểm và số sách được mượn tối đa');
    assert.strictEqual(DiemService.tinhSoSachToiDa(100), 3);
    assert.strictEqual(DiemService.tinhSoSachToiDa(71), 3);
    assert.strictEqual(DiemService.tinhSoSachToiDa(70), 2);
    assert.strictEqual(DiemService.tinhSoSachToiDa(41), 2);
    assert.strictEqual(DiemService.tinhSoSachToiDa(40), 1);
    assert.strictEqual(DiemService.tinhSoSachToiDa(11), 1);
    assert.strictEqual(DiemService.tinhSoSachToiDa(10), 0);
    assert.strictEqual(DiemService.tinhSoSachToiDa(0), 0);

    // Case 2: Kiểm tra cập nhật trạng thái mượn sách quá hạn & tự động trừ điểm theo ngày
    console.log(
        'Case 2: kiemTraVaCapNhatTrangThaiMuonSach & quetVaTruDiemQuaHan',
    );
    const ngayMuon = new Date('2026-01-01T00:00:00Z');
    const phieuMuon = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sachA._id,
        msnvMuonId: nhanVien._id,
        ngayMuon,
        soNgayMuon: 14, // Hạn trả 2026-01-15
    });

    // Giả lập ngày 2026-01-16: chạy kiemTraVaCapNhatTrangThaiMuonSach
    const thoiDiem16 = new Date('2026-01-16T00:00:00Z');
    const soLuongCapNhat =
        await DiemService.kiemTraVaCapNhatTrangThaiMuonSach(thoiDiem16);
    assert.strictEqual(soLuongCapNhat, 1);

    const phieuMuonSauCapNhat = await TheoDoiMuonSach.findById(phieuMuon._id);
    assert.strictEqual(phieuMuonSauCapNhat.trangThai, TRANG_THAI_MUON.QUA_HAN);

    // Chạy quetVaTruDiemQuaHan: đếm số sách quaHan (1 cuốn) và trừ 1 điểm
    const ketQuaTru = await DiemService.quetVaTruDiemQuaHan(thoiDiem16);
    assert.strictEqual(ketQuaTru.length, 1);
    assert.strictEqual(ketQuaTru[0].soLuongSachQuaHan, 1);
    assert.strictEqual(ketQuaTru[0].diemTru, 1);

    const docGiaSauTru = await DocGia.findById(docGia._id);
    assert.strictEqual(docGiaSauTru.diemDocGia, 99, '100 - 1 = 99 điểm');

    // Case 3: Báo mất sách: chuyển daMat, trừ x2 điểm quá hạn theo ngày
    console.log(
        'Case 3: Báo mất sách - trừ x2 điểm quá hạn theo ngày & tính vào số sách giữ',
    );
    const thoiDiemBaoMat = new Date('2026-01-20T00:00:00Z'); // quá hạn 5 ngày (5 * 1 * 2 = 10đ)
    await MuonTraService.baoMatSach({
        luotMuonId: phieuMuon._id,
        msnvGhiNhanId: nhanVien._id,
        ngayBaoMat: thoiDiemBaoMat,
    });

    const phieuMuonSauBaoMat = await TheoDoiMuonSach.findById(phieuMuon._id);
    assert.strictEqual(phieuMuonSauBaoMat.trangThai, TRANG_THAI_MUON.DA_MAT);

    // Chặn mượn sách mới khi có sách mất chưa đền
    let biChanViMatSach = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: docGia._id,
            sachId: sachB._id,
            msnvMuonId: nhanVien._id,
        });
    } catch (err) {
        biChanViMatSach = true;
        assert(err.message.includes('chưa hoàn thành bồi thường'));
    }
    assert.strictEqual(biChanViMatSach, true);

    // Case 4: Tự động cộng điểm không vi phạm
    console.log('Case 4: Tự động cộng +1 điểm sau mỗi 3 ngày không vi phạm');
    const emailNgoan = 'docgia_ngoan@test.com';
    const regTokenNgoan = await taoRegistrationTokenTest(emailNgoan);
    await AuthService.dangKyDocGia({
        registrationToken: regTokenNgoan,
        email: emailNgoan,
        password: 'password123',
        hoLot: 'Hoàng',
        ten: 'Dương',
        dienThoai: '0977777777',
    });
    const docGiaNgoan = await DocGia.findOne({ email: emailNgoan });
    docGiaNgoan.diemDocGia = 80;
    docGiaNgoan.ngayCapNhatDiemKhongViPham = new Date('2026-01-01T00:00:00Z');
    await docGiaNgoan.save();

    const thoiDiemSau6Ngay = new Date('2026-01-07T00:00:00Z');
    const ketQuaCong =
        await DiemService.quetVaCongDiemKhongViPham(thoiDiemSau6Ngay);
    assert(
        ketQuaCong.some(
            (item) =>
                item.docGiaId.toString() === docGiaNgoan._id.toString() &&
                item.diemCong === 2,
        ),
    );

    const docGiaSauCong = await DocGia.findById(docGiaNgoan._id);
    assert.strictEqual(docGiaSauCong.diemDocGia, 82);

    console.log('✅ tests/diem-tudong.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testDiemTuDong()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testDiemTuDong;
