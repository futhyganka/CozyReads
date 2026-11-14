const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { taoRegistrationTokenTest } = require('./helpers');
const { DocGia } = require('../src/models');
const DocGiaService = require('../src/services/docgia.service');
const AuthService = require('../src/services/auth.service');
const {
    LOAI_DOC_GIA,
    TRANG_THAI_DOC_GIA,
    TRANG_THAI_GIA_HAN,
    GOI_GIA_HAN,
} = require('../src/constants/business-rules');

async function testTheDocGia() {
    console.log('\n--- BẮT ĐẦU TEST: tests/the-docgia.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    // Case 1: Các gói gia hạn thẻ độc giả tự do
    console.log(
        'Case 1: Kiểm tra cấu hình gói gia hạn (1, 3, 6 tháng = 30, 90, 180 ngày)',
    );
    assert.strictEqual(GOI_GIA_HAN['1_thang'].soNgay, 30);
    assert.strictEqual(GOI_GIA_HAN['1_thang'].gia, 20000);
    assert.strictEqual(GOI_GIA_HAN['3_thang'].soNgay, 90);
    assert.strictEqual(GOI_GIA_HAN['3_thang'].gia, 55000);
    assert.strictEqual(GOI_GIA_HAN['6_thang'].soNgay, 180);
    assert.strictEqual(GOI_GIA_HAN['6_thang'].gia, 100000);

    // Case 2: Bắt buộc dienThoai và kiểm tra format số điện thoại khi đăng ký
    console.log('Case 2: Bắt buộc số điện thoại và kiểm tra format khi đăng ký');
    const tokenNoSdt = await taoRegistrationTokenTest('nosdt@test.com');
    let biLoiKhongSoDt = false;
    try {
        await AuthService.dangKyDocGia({
            registrationToken: tokenNoSdt,
            email: 'nosdt@test.com',
            password: '123',
            hoLot: 'Lê',
            ten: 'B',
            dienThoai: '',
        });
    } catch (err) {
        biLoiKhongSoDt = true;
        assert(err.message.includes('bắt buộc'));
    }
    assert.strictEqual(biLoiKhongSoDt, true);

    // Chặn số điện thoại sai định dạng (chữ, không đủ 10 số, hoặc sai đầu số)
    let biLoiSdtSaiFormat = false;
    try {
        await AuthService.dangKyDocGia({
            registrationToken: tokenNoSdt,
            email: 'nosdt@test.com',
            password: '123',
            hoLot: 'Lê',
            ten: 'B',
            dienThoai: '0123456789', // Đầu 01 không hợp lệ
        });
    } catch (err) {
        biLoiSdtSaiFormat = true;
        assert(err.message.includes('không hợp lệ'));
    }
    assert.strictEqual(biLoiSdtSaiFormat, true);

    // Case 3: Tạo yêu cầu gia hạn thẻ
    console.log('Case 3: Tạo khoản thanh toán gia hạn thẻ độc giả tự do');
    const emailDgTuDo = 'dg_tudo@test.com';
    const tokenDgTuDo = await taoRegistrationTokenTest(emailDgTuDo);
    await AuthService.dangKyDocGia({
        registrationToken: tokenDgTuDo,
        email: emailDgTuDo,
        password: 'password123',
        hoLot: 'Phạm',
        ten: 'Hải',
        dienThoai: '0933333333',
        loaiDocGia: LOAI_DOC_GIA.DOCGIA_TUDO,
    });
    const docGia = await DocGia.findOne({ email: emailDgTuDo });

    const yeuCauGiaHan = await DocGiaService.taoKhoanThanhToanGiaHan({
        docGiaId: docGia._id,
        goiGiaHan: '3_thang',
        phuongThuc: 'chuyenKhoan',
    });
    assert.strictEqual(yeuCauGiaHan.soTien, 55000);
    assert.strictEqual(yeuCauGiaHan.goiGiaHan, '3_thang');
    assert.strictEqual(yeuCauGiaHan.theoDoiMuonSach, null);

    // Case 4: Độc giả tự do quá hạn thanh toán 7 ngày sẽ bị tạm khóa thẻ
    console.log(
        'Case 4: Quá hạn thanh toán chu kỳ quá 7 ngày -> tự động khóa thẻ',
    );
    docGia.ngayHetHanThe = new Date('2026-01-01T00:00:00Z');
    await docGia.save();

    const thoiDiemQuet = new Date('2026-01-09T00:00:00Z');
    const ketQuaKhoa =
        await DocGiaService.quetVaKhoaTheDocGiaTuDo(thoiDiemQuet);
    assert.strictEqual(ketQuaKhoa.length, 1);

    const docGiaSauKhoa = await DocGia.findById(docGia._id);
    assert.strictEqual(docGiaSauKhoa.trangThai, TRANG_THAI_DOC_GIA.TAM_KHOA);

    // Case 5: Sinh viên hết hạn thẻ và đã tốt nghiệp sẽ bị hủy thẻ
    console.log('Case 5: Sinh viên tốt nghiệp hết hạn thẻ -> tự động hủy thẻ');
    const emailSv = 'sinhvien@test.com';
    const tokenSv = await taoRegistrationTokenTest(emailSv);
    await AuthService.dangKyDocGia({
        registrationToken: tokenSv,
        email: emailSv,
        password: 'password123',
        hoLot: 'Vũ',
        ten: 'Tuấn',
        dienThoai: '0944444444',
        loaiDocGia: LOAI_DOC_GIA.SINHVIEN,
    });
    const sv = await DocGia.findOne({ email: emailSv });
    sv.daTotNghiep = true;
    sv.ngayHetHanThe = new Date('2026-01-01T00:00:00Z');
    await sv.save();

    const ketQuaHuy = await DocGiaService.quetVaHuyTheSinhVienTotNghiep(
        new Date('2026-01-02T00:00:00Z'),
    );
    assert.strictEqual(ketQuaHuy.length, 1);

    const svSauHuy = await DocGia.findById(sv._id);
    assert.strictEqual(svSauHuy.trangThai, TRANG_THAI_DOC_GIA.DA_HUY);
    assert.strictEqual(svSauHuy.trangThaiGiaHan, TRANG_THAI_GIA_HAN.DA_HUY);

    // Case 6: Tự động tạo thanh toán gia hạn cho độc giả tự do và tự động gia hạn 6 tháng miễn phí cho độc giả khác
    console.log('Case 6: Tự động tạo thanh toán cho độc giả tự do & gia hạn miễn phí 6 tháng cho độc giả khác');
    const emailGv = 'giangvien@test.com';
    const tokenGv = await taoRegistrationTokenTest(emailGv);
    await AuthService.dangKyDocGia({
        registrationToken: tokenGv,
        email: emailGv,
        password: 'password123',
        hoLot: 'Trần',
        ten: 'Hùng',
        dienThoai: '0955555555',
        loaiDocGia: LOAI_DOC_GIA.GIANGVIEN,
    });
    const gv = await DocGia.findOne({ email: emailGv });
    gv.ngayHetHanThe = new Date('2026-02-01T00:00:00Z');
    gv.trangThaiGiaHan = TRANG_THAI_GIA_HAN.GIA_HAN;
    await gv.save();

    const ketQuaQuetGiaHan = await DocGiaService.quetVaXuLyGiaHanThe(
        new Date('2026-02-05T00:00:00Z'),
    );
    // gv phải được tự động gia hạn 180 ngày (6 tháng miễn phí)
    const gvUpdated = await DocGia.findById(gv._id);
    assert(gvUpdated.ngayHetHanThe > new Date('2026-02-05T00:00:00Z'));
    assert.strictEqual(gvUpdated.chuKyThanhToan, '6_thang_mien_phi');

    // Case 7: Nhân viên đăng ký tài khoản / hồ sơ cho độc giả trực tiếp tại quầy
    console.log('Case 7: Nhân viên đăng ký thẻ độc giả tại quầy (không bắt buộc email & password)');
    const docGiaTaiQuay = await DocGiaService.taoDocGiaTaiQuay({
        hoLot: 'Hoàng',
        ten: 'Nam',
        dienThoai: '0977889900',
        loaiDocGia: LOAI_DOC_GIA.DOCGIA_TUDO,
        chuKyThanhToan: '3_thang',
    });
    assert(docGiaTaiQuay.maDocGia.startsWith('DG'));
    assert.strictEqual(docGiaTaiQuay.ten, 'Nam');
    assert.strictEqual(docGiaTaiQuay.dienThoai, '0977889900');
    assert.strictEqual(docGiaTaiQuay.diemDocGia, 100);
    assert.strictEqual(docGiaTaiQuay.trangThaiTaiKhoan, TRANG_THAI_DOC_GIA.HOAT_DONG);
    assert(docGiaTaiQuay.ngayHetHanThe !== undefined);
    assert.strictEqual(docGiaTaiQuay.email, undefined);

    // Kiểm tra độc giả tạo tại quầy có thể cung cấp thêm email & password nếu muốn (bắt buộc kèm registrationToken)
    const emailLinh = 'linhdang@test.com';
    const tokenLinh = await taoRegistrationTokenTest(emailLinh);
    const docGiaTaiQuayCoTk = await DocGiaService.taoDocGiaTaiQuay({
        registrationToken: tokenLinh,
        hoLot: 'Đặng',
        ten: 'Linh',
        dienThoai: '0911223344',
        email: emailLinh,
        password: 'password123',
        loaiDocGia: LOAI_DOC_GIA.SINHVIEN,
    });
    assert.strictEqual(docGiaTaiQuayCoTk.email, 'linhdang@test.com');
    assert.strictEqual(docGiaTaiQuayCoTk.chuKyThanhToan, '6_thang_mien_phi');

    // Case 8: Kiểm tra hàm capNhatDocGia chỉ cho phép sửa thông tin cá nhân và chặn sửa trạng thái/điểm
    console.log('Case 8: capNhatDocGia chỉ cho sửa thông tin cá nhân (hoLot, ten, diaChi...) và chặn sửa trạng thái thẻ');
    const updateRes = await DocGiaService.capNhatDocGia(docGiaTaiQuay._id, {
        ten: 'Nam Đã Đổi Tên',
        diaChi: 'Cần Thơ',
        trangThai: TRANG_THAI_DOC_GIA.TAM_KHOA, // Cố tình gửi trạng thái muốn đổi
        diemDocGia: 50, // Cố tình gửi điểm muốn đổi
    });
    assert.strictEqual(updateRes.ten, 'Nam Đã Đổi Tên');
    assert.strictEqual(updateRes.diaChi, 'Cần Thơ');
    // Trạng thái thẻ và điểm số vẫn giữ nguyên, không bị thay đổi
    assert.strictEqual(updateRes.trangThaiTaiKhoan, TRANG_THAI_DOC_GIA.HOAT_DONG);
    assert.strictEqual(updateRes.diemDocGia, 100);

    // Case 9: Kiểm tra chặn số điện thoại sai định dạng khi cập nhật độc giả hoặc tạo tại quầy
    console.log('Case 9: Chặn số điện thoại sai định dạng khi tạo tại quầy và khi cập nhật');
    let biChanSdtTaiQuay = false;
    try {
        await DocGiaService.taoDocGiaTaiQuay({
            hoLot: 'Nguyễn Văn',
            ten: 'Bừa',
            dienThoai: 'abc1234567',
        });
    } catch (err) {
        biChanSdtTaiQuay = true;
        assert(err.message.includes('không hợp lệ'));
    }
    assert.strictEqual(biChanSdtTaiQuay, true);

    let biChanCapNhatSdtSai = false;
    try {
        await DocGiaService.capNhatDocGia(docGiaTaiQuay._id, {
            dienThoai: '0281234567', // Mã vùng bàn thay vì di động
        });
    } catch (err) {
        biChanCapNhatSdtSai = true;
        assert(err.message.includes('không hợp lệ'));
    }
    assert.strictEqual(biChanCapNhatSdtSai, true);

    // Cập nhật số điện thoại hợp lệ thành công
    const capNhatSdtOk = await DocGiaService.capNhatDocGia(docGiaTaiQuay._id, {
        dienThoai: '0388991122',
    });
    assert.strictEqual(capNhatSdtOk.dienThoai, '0388991122');

    console.log('✅ tests/the-docgia.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testTheDocGia()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testTheDocGia;
