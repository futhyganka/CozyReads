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
const AuthService = require('../src/services/auth.service');
const {
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
} = require('../src/constants/business-rules');

async function testMuonTra() {
    console.log('\n--- BẮT ĐẦU TEST: tests/muontra.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // 1. Tạo tác giả, NXB, danh mục
    const nxb = await NhaXuatBan.create({
        maNxb: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({
        maTg: 'TG01',
        tenTg: 'Nguyễn Nhật Ánh',
        quocTich: 'Việt Nam',
    });
    const dm = await DanhMuc.create({
        maDm: 'DM01',
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
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });

    const sach2 = await Sach.create({
        maSach: 'MS002',
        tenSach: 'Mắt Biếc',
        donGia: 60000,
        soQuyen: 1,
        namXuatBan: 2021,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });

    const sachHet = await Sach.create({
        maSach: 'MS003',
        tenSach: 'Tôi Thấy Hoa Vàng',
        donGia: 70000,
        soQuyen: 0, // Hết sách
        namXuatBan: 2022,
        maNxb: nxb._id,
        maTg: [tg._id],
        maDm: [dm._id],
    });

    // 3. Tạo nhân viên và độc giả
    const { nhanVien } = await AuthService.dangKyNhanVien({
        email: 'nv1@cozyreads.com',
        password: '123',
        hoTen: 'Nguyễn Văn Nhân Viên',
        dienThoai: '0901234567',
    });

    const { docGia } = await AuthService.dangKyDocGia({
        email: 'dg1@cozyreads.com',
        password: '123',
        hoLot: 'Trần',
        ten: 'Văn An',
        dienThoai: '0912345678',
    });

    // Case 1: Mượn thành công sách khả dụng, giảm số lượng tồn kho và tính đúng ngày hẹn trả
    console.log('Case 1: Mượn sách thành công & kiểm tra tồn kho');
    const phieuMuon1 = await MuonTraService.taoPhieuMuon({
        docGiaId: docGia._id,
        sachId: sach1._id,
        msnvMuonId: nhanVien._id,
        soNgayMuon: 14,
    });
    assert.strictEqual(phieuMuon1.trangThai, TRANG_THAI_MUON.DANG_MUON);
    const sach1SauMuon = await Sach.findById(sach1._id);
    assert.strictEqual(
        sach1SauMuon.soQuyen,
        1,
        'Số lượng sách tồn kho phải giảm đi 1.',
    );

    // Case 2: Không được mượn 2 cuốn trùng maSach
    console.log('Case 2: Chặn mượn trùng cuốn sách đang giữ');
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
            'Thông báo lỗi phải nhắc việc trùng sách',
        );
    }
    assert.strictEqual(
        biChanTrungSach,
        true,
        'Bắt buộc phải chặn mượn trùng đầu sách.',
    );

    // Case 3: Chặn mượn sách khi sách hết số lượng khả dụng (soQuyen = 0)
    console.log(
        'Case 3: Chặn mượn khi sách hết số lượng khả dụng (soQuyen = 0)',
    );
    let biChanHetSach = false;
    try {
        await MuonTraService.taoPhieuMuon({
            docGiaId: docGia._id,
            sachId: sachHet._id,
            msnvMuonId: nhanVien._id,
        });
    } catch (err) {
        biChanHetSach = true;
        assert(
            err.message.includes('hết trong kho'),
            'Thông báo phải nhắc việc hết sách',
        );
    }
    assert.strictEqual(
        biChanHetSach,
        true,
        'Bắt buộc phải chặn khi sách hết số lượng.',
    );

    // Case 4: Ràng buộc ngày trả > ngày mượn (không được trả trước hoặc bằng ngày mượn)
    console.log('Case 4: Ràng buộc ngày trả thực tế phải sau ngày mượn');
    let biChanNgayTra = false;
    try {
        await MuonTraService.traSach({
            luotMuonId: phieuMuon1._id,
            msnvTraId: nhanVien._id,
            ngayTra: new Date(phieuMuon1.ngayMuon.getTime() - 1000), // Trước ngày mượn
        });
    } catch (err) {
        biChanNgayTra = true;
        assert(
            err.message.includes('sau ngày mượn'),
            'Phải báo ngày trả phải sau ngày mượn',
        );
    }
    assert.strictEqual(
        biChanNgayTra,
        true,
        'Không cho phép trả trước hoặc bằng ngày mượn.',
    );

    // Case 5: Trả sách thành công, phục hồi tồn kho
    console.log('Case 5: Trả sách đúng hạn & phục hồi tồn kho');
    const ngayTraHopLe = new Date(
        phieuMuon1.ngayMuon.getTime() + 2 * 24 * 60 * 60 * 1000,
    );
    const traSachRes = await MuonTraService.traSach({
        luotMuonId: phieuMuon1._id,
        msnvTraId: nhanVien._id,
        ngayTra: ngayTraHopLe,
    });
    assert.strictEqual(traSachRes.phieuMuon.trangThai, TRANG_THAI_MUON.DA_TRA);
    const sach1SauTra = await Sach.findById(sach1._id);
    assert.strictEqual(
        sach1SauTra.soQuyen,
        2,
        'Số lượng tồn kho sách phải được hoàn lại.',
    );

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
