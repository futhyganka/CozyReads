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
const NhanVienService = require('../src/services/nhanvien.service');
const AuthService = require('../src/services/auth.service');
const { authenticate } = require('../src/middlewares/auth.middleware');

async function testKiemTraCuoiCung() {
    console.log('\n--- BẮT ĐẦU TEST: tests/kiem-tra-cuoi-cung.test.js ---');
    await connectTestDb();
    await clearTestDb();

    // Khởi tạo thực thể tham chiếu
    const nxb = await NhaXuatBan.create({
        maNXB: 'NXB_FINAL',
        tenNxb: 'NXB Kim Đồng',
        diaChi: 'Hà Nội',
    });
    const tg = await TacGia.create({
        maTG: 'TG_FINAL',
        tenTg: 'Nguyễn Du',
    });
    const dm = await DanhMuc.create({
        maDM: 'DM_FINAL',
        tenDm: 'Cổ Điển',
    });

    // 1. Tạo sách có tồn kho đúng 1 quyển
    const sach = await Sach.create({
        maSach: 'MS_FINAL_01',
        tenSach: 'Truyện Kiều',
        donGia: 100000,
        soQuyen: 1, // Chỉ có 1 quyển duy nhất
        namXuatBan: 2021,
        maNXB: nxb._id,
        tacGia: tg._id,
        danhMuc: dm._id,
    });

    const admin = await NhanVienService.taoNhanVien({
        hoTenNv: 'Admin Tổng',
        password: 'Password@123',
        chucVu: 'admin',
        soDienThoai: '0901234567',
    });

    const emailDg1Final = 'dg1_final@gmail.com';
    const tokenDg1Final = await taoRegistrationTokenTest(emailDg1Final);
    await AuthService.dangKyDocGia({
        registrationToken: tokenDg1Final,
        email: emailDg1Final,
        password: 'Password@123',
        hoLot: 'Lê',
        ten: 'A',
        dienThoai: '0911111111',
        loaiDocGia: 'sinhVien',
    });
    const dg1 = await DocGia.findOne({ email: emailDg1Final });

    const emailDg2Final = 'dg2_final@gmail.com';
    const tokenDg2Final = await taoRegistrationTokenTest(emailDg2Final);
    await AuthService.dangKyDocGia({
        registrationToken: tokenDg2Final,
        email: emailDg2Final,
        password: 'Password@123',
        hoLot: 'Phạm',
        ten: 'B',
        dienThoai: '0922222222',
        loaiDocGia: 'sinhVien',
    });
    const dg2 = await DocGia.findOne({ email: emailDg2Final });

    // MỤC 1 & 2: Chống giữ sách vượt tồn kho & Chống hoàn trả tồn kho trùng lặp
    console.log('Case 1: Chống giữ sách vượt tồn kho (chỉ còn 1 quyển)');
    const yeuCau1 = await MuonTraService.taoYeuCauGiuSachOnline({
        docGiaId: dg1._id,
        sachId: sach._id,
    });
    assert.strictEqual(yeuCau1.trangThai, 'yeuCau_giuSach');

    const sachSauYeuCau1 = await Sach.findById(sach._id);
    assert.strictEqual(sachSauYeuCau1.soQuyen, 0);

    // Độc giả 2 cố gắng giữ cùng cuốn sách đã hết
    let biChanVuotTonKho = false;
    try {
        await MuonTraService.taoYeuCauGiuSachOnline({
            docGiaId: dg2._id,
            sachId: sach._id,
        });
    } catch (err) {
        biChanVuotTonKho = true;
        assert(err.message.includes('hết trong kho'));
    }
    assert.strictEqual(biChanVuotTonKho, true, 'Phải chặn khi sách hết tồn kho');

    console.log('Case 2: Chống hoàn trả tồn kho trùng lặp khi cron quét nhiều lần');
    const thoiDiem25hSau = new Date(yeuCau1.ngayMuon.getTime() + 25 * 60 * 60 * 1000);
    // Lần 1: hủy thành công và hoàn trả +1 quyển
    const lan1 = await MuonTraService.quetVaHuyYeuCauGiuSachQuaHan(thoiDiem25hSau);
    assert.strictEqual(lan1.length, 1);

    const sachSauLan1 = await Sach.findById(sach._id);
    assert.strictEqual(sachSauLan1.soQuyen, 1);

    // Lần 2 (giả lập cron lặp lại): không được hoàn trả lần nữa
    const lan2 = await MuonTraService.quetVaHuyYeuCauGiuSachQuaHan(thoiDiem25hSau);
    assert.strictEqual(lan2.length, 0);

    const sachSauLan2 = await Sach.findById(sach._id);
    assert.strictEqual(sachSauLan2.soQuyen, 1, 'Tồn kho không được tăng thêm lần 2');

    // MỤC 5: Trạng thái giữ sách - Yêu cầu đã hủy không thể xác nhận mượn lại
    console.log('Case 3: Yêu cầu đã hủy không được xác nhận mượn tại quầy');
    let biChanXacNhanHuy = false;
    try {
        await MuonTraService.xacNhanMuonTaiQuay({
            luotMuonId: yeuCau1._id,
            msnvMuonId: admin._id,
        });
    } catch (err) {
        biChanXacNhanHuy = true;
        assert(err.message.includes('không còn ở trạng thái giữ sách'));
    }
    assert.strictEqual(biChanXacNhanHuy, true);

    // MỤC 3: Thu hồi quyền nhân viên nghỉ việc ngay cả khi token JWT đã cấp trước đó
    console.log('Case 4: Thu hồi quyền ngay lập tức đối với JWT đã cấp khi nhân viên nghỉ việc');
    const nvDangLam = await NhanVienService.taoNhanVien({
        hoTenNv: 'Nhân Viên Thu Hồi',
        password: 'Password@123',
        chucVu: 'nhanVien',
        soDienThoai: '0933333333',
    });

    const loginNv = await AuthService.dangNhapNhanVien({
        msnv: nvDangLam.msnv,
        password: 'Password@123',
    });
    assert(loginNv.token);

    // Giả lập middleware authenticate khi nhân viên vẫn đang làm việc -> OK
    let fakeReq = { headers: { authorization: `Bearer ${loginNv.token}` } };
    let fakeRes = {};
    let errResult = null;
    await authenticate(fakeReq, fakeRes, (err) => { errResult = err; });
    assert.strictEqual(errResult, undefined);
    assert.strictEqual(fakeReq.user.msnv, nvDangLam.msnv);

    // Bây giờ Admin cho nhân viên này nghỉ việc (daNghiViec = true)
    await NhanVien.findByIdAndUpdate(nvDangLam._id, { daNghiViec: true });

    // Gọi lại middleware authenticate bằng chính JWT cũ đã cấp
    errResult = null;
    await authenticate(fakeReq, fakeRes, (err) => { errResult = err; });
    assert(errResult, 'Phải trả về lỗi 401 khi nhân viên đã nghỉ việc');
    assert.strictEqual(errResult.statusCode, 401);
    assert(errResult.message.includes('nghỉ việc') || errResult.message.includes('vô hiệu hóa'));

    // MỤC 4: Kiểm tra công thức điểm và thời gian tính điểm khi mất sách
    console.log('Case 5: Điểm độc giả mất sách (áp dụng hệ số x2 theo số ngày quá hạn hoặc hệ số 2 khi mất trong hạn)');
    const sachDiem = await Sach.create({
        maSach: 'MS_FINAL_02',
        tenSach: 'Sách Kiểm Tra Điểm',
        donGia: 80000,
        soQuyen: 5,
        namXuatBan: 2022,
        maNXB: nxb._id,
        tacGia: tg._id,
        danhMuc: dm._id,
    });

    const phieuMuonDiem = await MuonTraService.taoPhieuMuon({
        docGiaId: dg2._id,
        sachId: sachDiem._id,
        msnvMuonId: admin._id,
        ngayMuon: new Date('2026-01-01T00:00:00Z'),
        soNgayMuon: 14, // Hạn trả 2026-01-15
    });

    // Báo mất sách vào ngày 2026-01-20 (quá hạn 5 ngày)
    // Công thức: 5 ngày quá hạn * 1đ * hệ số 2 = trừ 10 điểm
    const thoiDiemBaoMat = new Date('2026-01-20T00:00:00Z');
    await MuonTraService.baoMatSach({
        luotMuonId: phieuMuonDiem._id,
        msnvGhiNhanId: admin._id,
        ngayBaoMat: thoiDiemBaoMat,
    });

    const dg2SauBaoMat = await DocGia.findById(dg2._id);
    assert.strictEqual(dg2SauBaoMat.diemDocGia, 90, 'Điểm ban đầu 100 - 10đ = 90đ');

    console.log('✅ tests/kiem-tra-cuoi-cung.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testKiemTraCuoiCung()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED FINAL AUDIT TEST:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testKiemTraCuoiCung;
