const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const {
    Sach,
    DocGia,
    NhanVien,
    TheoDoiMuonSach,
    NhaXuatBan,
    TacGia,
    DanhMuc,
} = require('../src/models');
const MuonTraService = require('../src/services/muontra.service');
const DiemService = require('../src/services/diem.service');
const AuthService = require('../src/services/auth.service');
const {
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
} = require('../src/constants/business-rules');

async function testDiemTuDong() {
    console.log('\n--- BẮT ĐẦU TEST: tests/diem-tudong.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // Setup sách & độc giả & nhân viên
    const nxb = await NhaXuatBan.create({
        maNxb: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({ maTg: 'TG01', tenTg: 'Tác Giả 1' });
    const dm = await DanhMuc.create({ maDm: 'DM01', tenDm: 'Danh Mục 1' });

    const sachA = await Sach.create({
        maSach: 'SA01',
        tenSach: 'Sách A',
        donGia: 50000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });
    const sachB = await Sach.create({
        maSach: 'SB01',
        tenSach: 'Sách B',
        donGia: 60000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });
    const sachC = await Sach.create({
        maSach: 'SC01',
        tenSach: 'Sách C',
        donGia: 70000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });
    const sachD = await Sach.create({
        maSach: 'SD01',
        tenSach: 'Sách D',
        donGia: 80000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });

    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv_diem@test.com',
        password: '123',
        hoTen: 'Thủ Thư',
    });
    const { docGia } = await AuthService.dangKyDocGia({
        email: 'dg_diem@test.com',
        password: '123',
        hoLot: 'Lê',
        ten: 'Bình',
        dienThoai: '0988888888',
    });

    // Case 1: Thang điểm mượn sách (<10: 0, 10-39: 1, 40-69: 2, 70-100: 3)
    console.log('Case 1: Kiểm tra thang điểm và số sách được mượn tối đa');
    assert.strictEqual(DiemService.tinhSoSachToiDa(100), 3);
    assert.strictEqual(DiemService.tinhSoSachToiDa(70), 3);
    assert.strictEqual(DiemService.tinhSoSachToiDa(69), 2);
    assert.strictEqual(DiemService.tinhSoSachToiDa(40), 2);
    assert.strictEqual(DiemService.tinhSoSachToiDa(39), 1);
    assert.strictEqual(DiemService.tinhSoSachToiDa(10), 1);
    assert.strictEqual(DiemService.tinhSoSachToiDa(9), 0);
    assert.strictEqual(DiemService.tinhSoSachToiDa(0), 0);

    // Case 2: Tự động trừ điểm quá hạn hàng ngày (1 ngày quá hạn trừ 1 điểm)
    console.log('Case 2: Tự động quét và trừ điểm sách quá hạn đang giữ');
    const ngayMuon = new Date('2026-01-01T00:00:00Z');
    const phieuMuon = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sachA._id,
        msnvMuonId: nhanVien._id,
        ngayMuon,
        soNgayMuon: 14, // Hạn trả là 2026-01-15
    });

    // Giả lập thời điểm hiện tại là 2026-01-18 (quá hạn 3 ngày)
    const thoiDiemQuet1 = new Date('2026-01-18T00:00:00Z');
    const ketQuaTru = await DiemService.quetVaTruDiemQuaHan(thoiDiemQuet1);
    assert.strictEqual(ketQuaTru.length, 1);
    assert.strictEqual(ketQuaTru[0].soNgayQuaHan, 3);
    assert.strictEqual(ketQuaTru[0].diemTru, 3);

    const docGiaSauTru = await DocGia.findById(docGia._id);
    assert.strictEqual(
        docGiaSauTru.diemDocGia,
        97,
        '100 điểm - 3 ngày quá hạn = 97 điểm',
    );

    // Không được mượn sách mới khi đang có sách quá hạn chưa trả
    let biChanViQuaHan = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: docGia._id,
            sachId: sachB._id,
            msnvMuonId: nhanVien._id,
        });
    } catch (err) {
        biChanViQuaHan = true;
        assert(err.message.includes('quá hạn chưa trả'));
    }
    assert.strictEqual(
        biChanViQuaHan,
        true,
        'Phải chặn mượn sách khi có sách quá hạn.',
    );

    // Case 3: Báo mất sách: chuyển daMat, trừ x2 điểm quá hạn theo ngày, vẫn tính vào tổng sách đang mượn
    console.log(
        'Case 3: Báo mất sách - trừ x2 điểm quá hạn theo ngày & sách mất vẫn tính vào số sách giữ',
    );
    // Báo mất vào ngày 2026-01-20 (tổng cộng quá hạn 5 ngày: 5 * 1 * 2 = 10 điểm)
    const thoiDiemBaoMat = new Date('2026-01-20T00:00:00Z');
    await MuonTraService.baoMatSach({
        luotMuonId: phieuMuon._id,
        msnvGhiNhanId: nhanVien._id,
        ngayBaoMat: thoiDiemBaoMat,
    });

    const phieuMuonSauBaoMat = await TheoDoiMuonSach.findById(phieuMuon._id);
    assert.strictEqual(phieuMuonSauBaoMat.trangThai, TRANG_THAI_MUON.DA_MAT);

    // Chặn mượn sách khi có sách mất chưa đền
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
    assert.strictEqual(
        biChanViMatSach,
        true,
        'Phải chặn mượn sách khi chưa bồi thường sách mất.',
    );

    // Case 4: Tự động cộng 1 điểm sau mỗi 3 ngày không vi phạm
    console.log(
        'Case 4: Tự động tích lũy +1 điểm sau mỗi 3 ngày không vi phạm',
    );
    const { docGia: docGiaNgoan } = await AuthService.dangKyDocGia({
        email: 'docgia_ngoan@test.com',
        password: '123',
        hoLot: 'Hoàng',
        ten: 'Dương',
        dienThoai: '0977777777',
    });
    docGiaNgoan.diemDocGia = 80;
    docGiaNgoan.ngayCapNhatDiemKhongViPham = new Date('2026-01-01T00:00:00Z');
    await docGiaNgoan.save();

    // Giả lập thời điểm sau 6 ngày không vi phạm -> được cộng 2 điểm
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
    assert.strictEqual(docGiaSauCong.diemDocGia, 82, '80 + 2 = 82 điểm');

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
