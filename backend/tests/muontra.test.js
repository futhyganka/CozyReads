const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { taoRegistrationTokenTest } = require('./helpers');
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
const AuthService = require('../src/services/auth.service');
const { TRANG_THAI_MUON } = require('../src/constants/business-rules');

async function testMuonTra() {
    console.log('\n--- BẮT ĐẦU TEST: tests/muontra.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // 1. Tạo tác giả, NXB, danh mục
    const nxb = await NhaXuatBan.create({
        maNXB: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({
        maTG: 'TG01',
        tenTg: 'Nguyễn Nhật Ánh',
        quocTich: 'Việt Nam',
    });
    const dm = await DanhMuc.create({
        maDM: 'DM01',
        tenDm: 'Văn học',
        moTa: 'Sách văn học',
    });

    // 2. Tạo sách
    const sach1 = await Sach.create({
        maSach: 'MS001',
        tenSach: 'Kính Vạn Hoa',
        donGia: 50000,
        soQuyen: 2,
        namXuatBan: 2020,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });

    const sachHet = await Sach.create({
        maSach: 'MS003',
        tenSach: 'Tôi Thấy Hoa Vàng',
        donGia: 70000,
        soQuyen: 0,
        namXuatBan: 2022,
        maNXB: nxb._id,
        maTG: [tg._id],
        maDM: [dm._id],
    });

    // 3. Tạo nhân viên và độc giả (bắt buộc dienThoai)
    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv1@cozyreads.com',
        password: 'Password@123',
        hoTen: 'Nguyễn Văn Nhân Viên',
        dienThoai: '0901234567',
    });

    const emailDg1 = 'dg1@cozyreads.com';
    const regTokenDg1 = await taoRegistrationTokenTest(emailDg1);
    await AuthService.dangKyDocGia({
        registrationToken: regTokenDg1,
        email: emailDg1,
        password: 'Password@123',
        hoLot: 'Trần',
        ten: 'Văn An',
        dienThoai: '0912345678',
        loaiDocGia: 'sinhVien',
    });
    const docGia = await DocGia.findOne({ email: emailDg1 });

    // Kiểm tra định dạng maDocGia (10 ký tự: DG + 1 chữ + 7 số) và msnv (8 ký tự: S + 1 chữ + 6 số)
    console.log(
        'Case 1: Kiểm tra định dạng maDocGia (10 ký tự) và msnv (8 ký tự)',
    );
    assert.strictEqual(
        docGia.maDocGia.length,
        10,
        'maDocGia phải có độ dài 10 ký tự',
    );
    assert(
        /^DG[A-Z]\d{7}$/.test(docGia.maDocGia),
        'maDocGia phải khớp dạng DG + chữ + 7 số',
    );
    assert.strictEqual(nhanVien.msnv.length, 8, 'msnv phải có độ dài 8 ký tự');
    assert(
        /^S[A-Z]\d{6}$/.test(nhanVien.msnv),
        'msnv phải khớp dạng S + chữ + 6 số',
    );

    // Case 2: Mượn sách thành công, kiểm tra tồn kho
    console.log('Case 2: Mượn sách thành công & kiểm tra tồn kho');
    const phieuMuon1 = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach1._id,
        msnvMuonId: nhanVien._id,
        soNgayMuon: 14,
    });
    assert.strictEqual(phieuMuon1.trangThai, TRANG_THAI_MUON.DANG_MUON);
    const sach1SauMuon = await Sach.findById(sach1._id);
    assert.strictEqual(sach1SauMuon.soQuyen, 1);

    // Case 3: Chặn mượn trùng đầu sách đang giữ
    console.log('Case 3: Chặn mượn trùng cuốn sách đang giữ');
    let biChanTrungSach = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: docGia._id,
            sachId: sach1._id,
            msnvMuonId: nhanVien._id,
        });
    } catch (err) {
        biChanTrungSach = true;
        assert(
            err.message.includes('trùng nhau') || err.message.includes('giữ'),
        );
    }
    assert.strictEqual(biChanTrungSach, true);

    // Case 4: Chặn mượn khi sách hết số lượng
    console.log('Case 4: Chặn mượn khi sách hết tồn kho');
    let biChanHetSach = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: docGia._id,
            sachId: sachHet._id,
            msnvMuonId: nhanVien._id,
        });
    } catch (err) {
        biChanHetSach = true;
    }
    assert.strictEqual(biChanHetSach, true);

    // Case 5: Ràng buộc ngày trả > ngày mượn
    console.log('Case 5: Ràng buộc ngày trả thực tế phải sau ngày mượn');
    let biChanNgayTra = false;
    try {
        await MuonTraService.traSach({
            luotMuonId: phieuMuon1._id,
            msnvTraId: nhanVien._id,
            ngayTra: new Date(phieuMuon1.ngayMuon.getTime() - 1000),
        });
    } catch (err) {
        biChanNgayTra = true;
    }
    assert.strictEqual(biChanNgayTra, true);

    // Case 6: Trả sách thành công, không phạt tiền dù quá hạn
    console.log('Case 6: Trả sách thành công (không có tiền phạt)');
    const ngayTraHopLe = new Date(
        phieuMuon1.ngayMuon.getTime() + 20 * 24 * 60 * 60 * 1000,
    );
    const traSachRes = await MuonTraService.traSach({
        luotMuonId: phieuMuon1._id,
        msnvTraId: nhanVien._id,
        ngayTra: ngayTraHopLe,
    });
    assert.strictEqual(traSachRes.phieuMuon.trangThai, TRANG_THAI_MUON.DA_TRA);
    assert.strictEqual(
        traSachRes.khoanPhat,
        null,
        'Quá hạn không phạt tiền, chỉ trừ điểm!',
    );
    const sach1SauTra = await Sach.findById(sach1._id);
    assert.strictEqual(sach1SauTra.soQuyen, 2);

    console.log('✅ tests/muontra.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testMuonTra()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testMuonTra;
