const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const {
    TacGia,
    DanhMuc,
    NhaXuatBan,
    Sach,
    NhanVien,
    DocGia,
    TheoDoiMuonSach,
    KyThanhToan,
} = require('../src/models');
const TacGiaService = require('../src/services/tacgia.service');
const DanhMucService = require('../src/services/danhmuc.service');
const NhaXuatBanService = require('../src/services/nhaxuatban.service');
const SachService = require('../src/services/sach.service');
const NhanVienService = require('../src/services/nhanvien.service');
const DocGiaService = require('../src/services/docgia.service');
const MuonTraService = require('../src/services/muontra.service');
const KyThanhToanService = require('../src/services/kythanhtoan.service');
const AuthService = require('../src/services/auth.service');

async function testCRUDToanBo() {
    console.log('\n--- BẮT ĐẦU TEST TOÀN DIỆN CRUD 8 THỰC THỂ & API & AUTH ---');
    await connectTestDb();
    await clearTestDb();

    // 1. TACGIA CRUD
    console.log('1. Kiểm thử CRUD TACGIA');
    const tg = await TacGiaService.themTacGia({
        tenTg: 'Tô Hoài',
        quocTich: 'Việt Nam',
    });
    assert(tg._id);
    assert.strictEqual(tg.tenTg, 'Tô Hoài');

    const tgList = await TacGiaService.getDanhSachTacGia({ search: 'Hoài' });
    assert.strictEqual(tgList.total, 1);

    const tgDetail = await TacGiaService.getChiTietTacGia(tg._id.toString());
    assert.strictEqual(tgDetail.maTG, tg.maTG);

    const tgUpdated = await TacGiaService.capNhatTacGia(tg._id, {
        tenTg: 'Tô Hoài (Đã sửa)',
    });
    assert.strictEqual(tgUpdated.tenTg, 'Tô Hoài (Đã sửa)');

    // 2. DANHMUC CRUD
    console.log('2. Kiểm thử CRUD DANHMUC');
    const dm = await DanhMucService.themDanhMuc({
        tenDm: 'Thiếu nhi',
        moTa: 'Sách dành cho thiếu nhi',
    });
    assert(dm._id);

    const dmList = await DanhMucService.getDanhSachDanhMuc({ search: 'Thiếu' });
    assert.strictEqual(dmList.total, 1);

    const dmUpdated = await DanhMucService.capNhatDanhMuc(dm._id, {
        tenDm: 'Văn học thiếu nhi',
    });
    assert.strictEqual(dmUpdated.tenDm, 'Văn học thiếu nhi');

    // 3. NHAXUATBAN CRUD
    console.log('3. Kiểm thử CRUD NHAXUATBAN');
    const nxb = await NhaXuatBanService.themNhaXuatBan({
        tenNxb: 'Kim Đồng',
        diaChi: 'Hà Nội',
    });
    assert(nxb._id);

    const nxbList = await NhaXuatBanService.getDanhSachNhaXuatBan({ search: 'Kim' });
    assert.strictEqual(nxbList.total, 1);

    const nxbUpdated = await NhaXuatBanService.capNhatNhaXuatBan(nxb._id, {
        diaChi: 'TP.HCM',
    });
    assert.strictEqual(nxbUpdated.diaChi, 'TP.HCM');

    // 4. SACH CRUD & liên kết TG, DM, NXB
    console.log('4. Kiểm thử CRUD SACH');
    const sach = await SachService.themSach({
        tenSach: 'Dế Mèn Phiêu Lưu Ký',
        donGia: 45000,
        soQuyen: 5,
        namXuatBan: 2021,
        maNXB: nxb._id,
        tacGia: tg._id,
        danhMuc: dm._id,
    });
    assert(sach._id);
    assert.strictEqual(sach.tenSach, 'Dế Mèn Phiêu Lưu Ký');

    // Không thể xóa tác giả, danh mục, NXB khi sách đang liên kết
    let biChanXoaTG = false;
    try {
        await TacGiaService.xoaTacGia(tg._id);
    } catch {
        biChanXoaTG = true;
    }
    assert.strictEqual(biChanXoaTG, true, 'Phải chặn xóa tác giả khi có sách liên kết');

    // 5. NHANVIEN CRUD & Phân quyền chức vụ
    console.log('5. Kiểm thử CRUD NHANVIEN & Đăng nhập');
    const nv = await NhanVienService.taoNhanVien({
        hoTenNv: 'Nguyễn Quản Trị',
        password: 'adminPassword123',
        chucVu: 'admin',
        diaChi: 'Cần Thơ',
        soDienThoai: '0909999888',
        luong: 15000000,
    });
    assert(nv._id);
    assert.strictEqual(nv.chucVu, 'admin');

    const nvLogin = await AuthService.dangNhapNhanVien({
        msnv: nv.msnv,
        password: 'adminPassword123',
    });
    assert.strictEqual(nvLogin.role, 'quanTriVien');
    assert(nvLogin.token);

    // Đổi mật khẩu nhân viên
    const doiMKNV = await NhanVienService.doiMatKhau(nv._id, {
        matKhauCu: 'adminPassword123',
        matKhauMoi: 'newAdminPassword456',
    });
    assert.strictEqual(doiMKNV.success, true);

    // 6. DOCGIA CRUD & Tạo tại quầy & Đăng ký online
    console.log('6. Kiểm thử CRUD DOCGIA & Tạo tại quầy');
    const dgQuay = await DocGiaService.taoDocGiaTaiQuay({
        hoLot: 'Lý',
        ten: 'Hải',
        dienThoai: '0918112233',
        diaChi: 'Hà Nội',
        loaiDocGia: 'docGia_tuDo',
    });
    assert(dgQuay._id);
    assert.strictEqual(dgQuay.diemDocGia, 100);

    const dgOnline = await AuthService.dangKyDocGia({
        email: 'online_reader@gmail.com',
        password: 'onlinePassword123',
        hoLot: 'Ngô',
        ten: 'Bảo',
        dienThoai: '0977112233',
    });
    assert(dgOnline.token);

    const dgLogin = await AuthService.dangNhapDocGia({
        email: 'online_reader@gmail.com',
        password: 'onlinePassword123',
    });
    assert.strictEqual(dgLogin.role, 'docGia');
    assert(dgLogin.token);

    // 7. THEODOIMUONSACH CRUD
    console.log('7. Kiểm thử CRUD THEODOIMUONSACH');
    const phieuMuon = await MuonTraService.taoPhieuMuon({
        docGiaId: dgOnline.docGia._id,
        sachId: sach._id,
        msnvMuonId: nv._id,
        soNgayMuon: 14,
    });
    assert(phieuMuon._id);
    assert.strictEqual(phieuMuon.trangThai, 'dangMuon');

    const sachSauMuon = await Sach.findById(sach._id);
    assert.strictEqual(sachSauMuon.soQuyen, 4);

    // Chặn xóa sách đang mượn
    let biChanXoaSach = false;
    try {
        await SachService.xoaSach(sach._id);
    } catch {
        biChanXoaSach = true;
    }
    assert.strictEqual(biChanXoaSach, true, 'Không được xóa sách đang được mượn');

    // 8. KYTHANHTOAN CRUD
    console.log('8. Kiểm thử CRUD KYTHANHTOAN');
    const tt = await KyThanhToanService.taoThanhToan({
        loai: 'phi_giaHan',
        soTien: 20000,
        maDocGia: dgQuay._id,
        goiGiaHan: '1_thang',
        phuongThuc: 'tienMat',
    });
    assert(tt._id);
    assert.strictEqual(tt.trangThai, 'choXacNhan');

    // Nhân viên xác nhận thanh toán
    const ttXacNhan = await KyThanhToanService.xacNhanThanhToan({
        thanhToanId: tt._id,
        msnvId: nv._id,
    });
    assert.strictEqual(ttXacNhan.trangThai, 'daThanhToan');
    assert.strictEqual(ttXacNhan.msnv.toString(), nv._id.toString());

    // Trả sách
    const traRes = await MuonTraService.traSach({
        luotMuonId: phieuMuon._id,
        msnvTraId: nv._id,
        ngayTra: new Date(Date.now() + 100000),
    });
    assert.strictEqual(traRes.phieuMuon.trangThai, 'daTra');

    const sachSauTra = await Sach.findById(sach._id);
    assert.strictEqual(sachSauTra.soQuyen, 5);

    console.log('✅ TẤT CẢ CÁC THỰC THỂ & NGHIỆP VỤ CRUD HOẠT ĐỘNG HOÀN HẢO!');
}

if (require.main === module) {
    testCRUDToanBo()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED CRUD TEST:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testCRUDToanBo;
