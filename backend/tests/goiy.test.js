const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const {
    Sach,
    DocGia,
    TheoDoiMuonSach,
    NhaXuatBan,
    TacGia,
    DanhMuc,
} = require('../src/models');
const GoiYService = require('../src/services/goiy.service');
const { TRANG_THAI_MUON } = require('../src/constants/business-rules');

async function testGoiYSach() {
    console.log('\n--- BẮT ĐẦU TEST: tests/goiy.test.js (KNN RECOMMENDATION) ---');
    await connectTestDb();
    await clearTestDb();

    // 0. Tạo dữ liệu cơ sở: NXB, Tác giả, Danh mục
    const nxb = await NhaXuatBan.create({
        maNXB: 'NXB01',
        tenNxb: 'NXB Trẻ',
        diaChi: 'Hà Nội',
    });
    const tg1 = await TacGia.create({
        maTG: 'TG01',
        tenTg: 'Nguyễn Nhật Ánh',
        quocTich: 'Việt Nam',
    });
    const tg2 = await TacGia.create({
        maTG: 'TG02',
        tenTg: 'Martin Fowler',
        quocTich: 'Anh',
    });
    const dmVanHoc = await DanhMuc.create({
        maDM: 'DM01',
        tenDm: 'Văn học',
        moTa: 'Sách văn học',
    });
    const dmCongNghe = await DanhMuc.create({
        maDM: 'DM02',
        tenDm: 'Công nghệ',
        moTa: 'Sách IT',
    });

    // Tạo 6 cuốn sách
    // S1, S2, S3 thuộc Văn học
    // S4, S5, S6 thuộc Công nghệ (trong đó S6 soQuyen = 0: hết hàng)
    const sach1 = await Sach.create({
        maSach: 'MS001',
        tenSach: 'Kính Vạn Hoa',
        donGia: 50000,
        soQuyen: 5,
        namXuatBan: 2020,
        maNXB: nxb._id,
        tacGia: tg1._id,
        danhMuc: dmVanHoc._id,
    });
    const sach2 = await Sach.create({
        maSach: 'MS002',
        tenSach: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ',
        donGia: 60000,
        soQuyen: 5,
        namXuatBan: 2021,
        maNXB: nxb._id,
        tacGia: tg1._id,
        danhMuc: dmVanHoc._id,
    });
    const sach3 = await Sach.create({
        maSach: 'MS003',
        tenSach: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh',
        donGia: 70000,
        soQuyen: 5,
        namXuatBan: 2022,
        maNXB: nxb._id,
        tacGia: tg1._id,
        danhMuc: dmVanHoc._id,
    });
    const sach4 = await Sach.create({
        maSach: 'MS004',
        tenSach: 'Refactoring',
        donGia: 120000,
        soQuyen: 5,
        namXuatBan: 2019,
        maNXB: nxb._id,
        tacGia: tg2._id,
        danhMuc: dmCongNghe._id,
    });
    const sach5 = await Sach.create({
        maSach: 'MS005',
        tenSach: 'Clean Architecture',
        donGia: 150000,
        soQuyen: 5,
        namXuatBan: 2021,
        maNXB: nxb._id,
        tacGia: tg2._id,
        danhMuc: dmCongNghe._id,
    });
    const sach6HetHang = await Sach.create({
        maSach: 'MS006',
        tenSach: 'Design Patterns (Hết hàng)',
        donGia: 110000,
        soQuyen: 0, // Hết hàng
        namXuatBan: 2018,
        maNXB: nxb._id,
        tacGia: tg2._id,
        danhMuc: dmCongNghe._id,
    });

    // Tạo 3 độc giả
    const docGiaA = await DocGia.create({
        maDocGia: 'DGA0000001',
        hoLot: 'Nguyễn Văn',
        ten: 'An',
        email: 'an@example.com',
        dienThoai: '0901234567',
        password: 'hashed_password',
    });
    const docGiaB = await DocGia.create({
        maDocGia: 'DGB0000002',
        hoLot: 'Trần Thị',
        ten: 'Bình',
        email: 'binh@example.com',
        dienThoai: '0901234568',
        password: 'hashed_password',
    });
    const docGiaMoi = await DocGia.create({
        maDocGia: 'DGC0000003',
        hoLot: 'Lê Văn',
        ten: 'Cường',
        email: 'cuong@example.com',
        dienThoai: '0901234569',
        password: 'hashed_password',
    });

    // =========================================================================
    // KỊCH BẢN 6: TRƯỜNG HỢP KHÔNG CÓ PHIẾU MƯỢN TRONG CƠ SỞ DỮ LIỆU
    // =========================================================================
    console.log('Test 6: Cơ sở dữ liệu chưa có phiếu mượn nào');
    GoiYService.xoaCache();
    const resNoBorrows = await GoiYService.layGoiYSach({ docGiaId: null });
    assert.strictEqual(resNoBorrows.title, 'Sách nổi bật');
    assert.strictEqual(resNoBorrows.caseType, 'A');
    assert.strictEqual(resNoBorrows.data.length, 5); // 5 sách còn hàng (loại trừ sach6 hết hàng)
    console.log('✅ Passed Test 6: Không có phiếu mượn vẫn fallback mượt mà');

    // =========================================================================
    // KỊCH BẢN 1: KHÁCH CHƯA ĐĂNG NHẬP TRUY CẬP TRANG CHỦ
    // =========================================================================
    console.log('Test 1: Khách chưa đăng nhập (docGiaId = null)');
    // Tạo lượt mượn thực tế:
    // Độc giả B mượn Sach 1, Sach 2, Sach 3
    await TheoDoiMuonSach.create({
        maDocGia: docGiaB._id,
        maSach: sach1._id,
        trangThai: TRANG_THAI_MUON.DA_TRA,
        ngayMuon: new Date('2026-11-01'),
    });
    await TheoDoiMuonSach.create({
        maDocGia: docGiaB._id,
        maSach: sach2._id,
        trangThai: TRANG_THAI_MUON.DA_TRA,
        ngayMuon: new Date('2026-11-02'),
    });
    await TheoDoiMuonSach.create({
        maDocGia: docGiaB._id,
        maSach: sach3._id,
        trangThai: TRANG_THAI_MUON.DANG_MUON,
        ngayMuon: new Date('2026-11-03'),
    });
    // Phiếu bị hủy không được tính
    await TheoDoiMuonSach.create({
        maDocGia: docGiaB._id,
        maSach: sach4._id,
        trangThai: TRANG_THAI_MUON.DA_HUY,
        ngayMuon: new Date('2026-11-04'),
    });

    GoiYService.xoaCache();
    const resGuest = await GoiYService.layGoiYSach({ docGiaId: null });
    assert.strictEqual(resGuest.title, 'Sách nổi bật');
    assert.strictEqual(resGuest.caseType, 'A');
    assert.strictEqual(resGuest.loaiGoiY, 'popular');
    assert.ok(resGuest.data.length > 0);
    // Sach 4 không được tính lượt mượn vì trạng thái daHuy
    const matrixGuest = await GoiYService.layDuLieuTuongTac();
    assert.strictEqual(matrixGuest.borrowCountByBook.get(sach4._id.toString()) || 0, 0);
    console.log('✅ Passed Test 1: Khách chưa đăng nhập nhận đúng Sách nổi bật');

    // =========================================================================
    // KỊCH BẢN 2: ĐỘC GIẢ CHƯA CÓ LỊCH SỬ MƯỢN
    // =========================================================================
    console.log('Test 2: Độc giả mới đăng ký chưa có lịch sử mượn');
    const resDocGiaMoi = await GoiYService.layGoiYSach({ docGiaId: docGiaMoi._id });
    assert.strictEqual(resDocGiaMoi.title, 'Gợi ý cho bạn');
    assert.strictEqual(resDocGiaMoi.caseType, 'C_fallback');
    assert.strictEqual(resDocGiaMoi.loaiGoiY, 'popular');
    assert.ok(resDocGiaMoi.data.length > 0);
    console.log('✅ Passed Test 2: Độc giả chưa mượn nhận tiêu đề "Gợi ý cho bạn"');

    // =========================================================================
    // KỊCH BẢN 3: ĐỘC GIẢ ĐÃ MƯỢN NHƯNG CHƯA CÓ LÁNG GIỀNG TƯƠNG ĐỒNG
    // =========================================================================
    console.log('Test 3: Độc giả đã mượn nhưng các sách khác có Cosine = 0');
    // Độc giả A chỉ mượn Sach 4 (Công nghệ) mà chưa có ai khác mượn chung sách 4 với sách nào khác
    await TheoDoiMuonSach.create({
        maDocGia: docGiaA._id,
        maSach: sach4._id,
        trangThai: TRANG_THAI_MUON.DANG_MUON,
        ngayMuon: new Date('2026-11-05'),
    });
    GoiYService.xoaCache();

    const resDocGiaAChuaLangGieng = await GoiYService.layGoiYSach({
        docGiaId: docGiaA._id,
    });
    // Không có láng giềng có sim > 0 -> Fallback tiêu đề "Gợi ý cho bạn"
    assert.strictEqual(resDocGiaAChuaLangGieng.title, 'Gợi ý cho bạn');
    assert.strictEqual(resDocGiaAChuaLangGieng.caseType, 'C_fallback');
    // Đảm bảo không chứa cuốn sach4 mà Độc giả A đang mượn
    const hasBorrowedS4 = resDocGiaAChuaLangGieng.data.some(
        (b) => b._id.toString() === sach4._id.toString(),
    );
    assert.strictEqual(hasBorrowedS4, false);
    console.log('✅ Passed Test 3: Chưa có láng giềng thì fallback và loại bỏ sách đã mượn');

    // =========================================================================
    // KỊCH BẢN 4: ĐỘC GIẢ CÓ LỊCH SỬ MƯỢN VÀ CÓ KẾT QUẢ KNN
    // =========================================================================
    console.log('Test 4: Có láng giềng KNN với Cosine > 0');
    // Bây giờ Độc giả A mượn thêm Sach 1 (Văn học).
    // Trước đó Độc giả B đã mượn Sach 1, Sach 2, Sach 3!
    // => Giữa Sach 1 và Sach 2 có chung độc giả B (Cosine > 0)!
    // => Giữa Sach 1 và Sach 3 có chung độc giả B (Cosine > 0)!
    // Do đó khi Độc giả A đã mượn Sach 1, hệ thống KNN sẽ phát hiện Sach 2 và Sach 3 là láng giềng!
    await TheoDoiMuonSach.create({
        maDocGia: docGiaA._id,
        maSach: sach1._id,
        trangThai: TRANG_THAI_MUON.DA_TRA,
        ngayMuon: new Date('2026-11-06'),
    });
    GoiYService.xoaCache();

    const resDocGiaAKNN = await GoiYService.layGoiYSach({
        docGiaId: docGiaA._id,
        limit: 10,
    });
    // Vì số láng giềng KNN là 2 cuốn (Sach 2, Sach 3) < 10, hệ thống kết hợp hybrid
    // Tiêu đề quy định: "Dành riêng cho bạn" khi có ít nhất 1 gợi ý từ KNN!
    assert.strictEqual(resDocGiaAKNN.title, 'Dành riêng cho bạn');
    assert.strictEqual(resDocGiaAKNN.caseType, 'B');
    assert.strictEqual(resDocGiaAKNN.loaiGoiY, 'hybrid');

    // 2 cuốn đầu tiên phải là kết quả KNN: Sach 2 hoặc Sach 3
    const top2Ids = resDocGiaAKNN.data.slice(0, 2).map((b) => b._id.toString());
    assert.ok(
        top2Ids.includes(sach2._id.toString()) &&
            top2Ids.includes(sach3._id.toString()),
    );
    console.log('✅ Passed Test 4: Gợi ý KNN thành công với tiêu đề "Dành riêng cho bạn"');

    // =========================================================================
    // KỊCH BẢN 5: HAI ĐỘC GIẢ CÓ LỊCH SỬ KHÁC NHAU
    // =========================================================================
    console.log('Test 5: Hai độc giả có lịch sử khác nhau');
    // Độc giả B đã mượn S1, S2, S3
    const resDocGiaB = await GoiYService.layGoiYSach({ docGiaId: docGiaB._id });
    // Độc giả B không được gợi ý S1, S2, S3 vì đã mượn hết cả 3 cuốn
    const bBookIds = resDocGiaB.data.map((b) => b._id.toString());
    assert.ok(!bBookIds.includes(sach1._id.toString()));
    assert.ok(!bBookIds.includes(sach2._id.toString()));
    assert.ok(!bBookIds.includes(sach3._id.toString()));
    console.log('✅ Passed Test 5: Hai độc giả nhận gợi ý hoàn toàn khác nhau phù hợp lịch sử');

    // =========================================================================
    // KỊCH BẢN 7: TRƯỜNG HỢP MONGODB CÓ RẤT ÍT SÁCH
    // =========================================================================
    console.log('Test 7: Hệ thống ít sách hơn số lượng limit yêu cầu');
    const resFew = await GoiYService.layGoiYSach({ limit: 100 });
    assert.ok(resFew.data.length <= 5);
    console.log('✅ Passed Test 7: Xử lý an toàn khi số sách ít hơn limit');

    // =========================================================================
    // KỊCH BẢN 8: CHUYỂN ĐỔI TÀI KHOẢN VÀ ĐĂNG XUẤT
    // =========================================================================
    console.log('Test 8: Chuyển đổi giữa các tài khoản và đăng xuất');
    const resUserA = await GoiYService.layGoiYSach({ docGiaId: docGiaA._id });
    const resLogout = await GoiYService.layGoiYSach({ docGiaId: null });
    const resUserB = await GoiYService.layGoiYSach({ docGiaId: docGiaB._id });

    assert.strictEqual(resUserA.caseType, 'B');
    assert.strictEqual(resLogout.caseType, 'A');
    assert.notStrictEqual(resUserA.title, resLogout.title);
    assert.notStrictEqual(
        resUserA.data.map((b) => b._id.toString()).join(','),
        resUserB.data.map((b) => b._id.toString()).join(','),
    );
    console.log('✅ Passed Test 8: Cách ly hoàn toàn giữa các phiên tài khoản');

    // =========================================================================
    // KỊCH BẢN 9 & 10: SÁCH HẾT HÀNG (SOQUYEN = 0) VÀ KHÔNG CHỨA SÁCH ĐÃ MƯỢN
    // =========================================================================
    console.log('Test 9 & 10: Không gợi ý sách hết hàng hoặc sách đã mượn');
    for (const item of resUserA.data) {
        assert.ok(item.soQuyen > 0, 'Sách được gợi ý phải còn hàng');
        assert.notStrictEqual(
            item._id.toString(),
            sach6HetHang._id.toString(),
            'Không được gợi ý sách soQuyen = 0',
        );
        assert.notStrictEqual(
            item._id.toString(),
            sach1._id.toString(),
            'Không được gợi ý sách độc giả đã mượn',
        );
        assert.notStrictEqual(
            item._id.toString(),
            sach4._id.toString(),
            'Không được gợi ý sách độc giả đã mượn',
        );
    }
    console.log('✅ Passed Test 9 & 10: Tồn kho và lịch sử được kiểm tra chính xác');

    console.log('\n🎉 TOÀN BỘ 10 KỊCH BẢN TEST GỢI Ý KNN ĐÃ ĐẠT CHUẨN THÀNH CÔNG!');
}

module.exports = testGoiYSach;

if (require.main === module) {
    testGoiYSach()
        .then(() => disconnectTestDb())
        .catch((err) => {
            console.error('❌ Lỗi Test:', err);
            disconnectTestDb().then(() => process.exit(1));
        });
}
