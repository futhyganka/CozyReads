const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { DocGia, TaiKhoan } = require('../src/models');
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

    // Case 2: Tạo yêu cầu gia hạn thẻ
    console.log('Case 2: Tạo yêu cầu gia hạn thẻ độc giả tự do');
    const { docGia } = await AuthService.dangKyDocGia({
        email: 'dg_tudo@test.com',
        password: '123',
        hoLot: 'Phạm',
        ten: 'Hải',
        dienThoai: '0933333333',
        loaiDocGia: LOAI_DOC_GIA.DOCGIA_TUDO,
    });

    const yeuCauGiaHan = await DocGiaService.taoYeuCauGiaHanThe({
        docGiaId: docGia._id,
        goiGiaHan: '3_thang',
        phuongThuc: 'chuyenKhoan',
    });
    assert.strictEqual(yeuCauGiaHan.soTien, 55000);
    assert.strictEqual(yeuCauGiaHan.goiGiaHan, '3_thang');
    assert.strictEqual(
        yeuCauGiaHan.theoDoiMuonSach,
        null,
        'Phí gia hạn không cần liên kết lượt mượn',
    );

    // Case 3: Độc giả tự do quá hạn thanh toán 7 ngày sẽ bị tạm khóa thẻ
    console.log(
        'Case 3: Quá hạn thanh toán chu kỳ quá 7 ngày -> tự động khóa thẻ',
    );
    docGia.ngayHetHanThe = new Date('2026-01-01T00:00:00Z');
    await docGia.save();

    // Quét vào ngày 2026-01-09 (quá 8 ngày kể từ ngày hết hạn thẻ)
    const thoiDiemQuet = new Date('2026-01-09T00:00:00Z');
    const ketQuaKhoa =
        await DocGiaService.quetVaKhoaTheDocGiaTuDo(thoiDiemQuet);
    assert.strictEqual(ketQuaKhoa.length, 1);

    const docGiaSauKhoa = await DocGia.findById(docGia._id);
    assert.strictEqual(docGiaSauKhoa.trangThai, TRANG_THAI_DOC_GIA.TAM_KHOA);

    // Case 4: Sinh viên hết hạn thẻ và đã tốt nghiệp sẽ bị hủy thẻ
    console.log('Case 4: Sinh viên tốt nghiệp hết hạn thẻ -> tự động hủy thẻ');
    const { docGia: sv } = await AuthService.dangKyDocGia({
        email: 'sinhvien@test.com',
        password: '123',
        hoLot: 'Vũ',
        ten: 'Tuấn',
        dienThoai: '0944444444',
        loaiDocGia: LOAI_DOC_GIA.SINHVIEN,
    });
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
