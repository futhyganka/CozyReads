const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const { taoRegistrationTokenTest } = require('./helpers');
const AuthService = require('../src/services/auth.service');
const { PERMISSIONS, ROLES } = require('../src/constants/permissions');
const { TRANG_THAI_DOC_GIA } = require('../src/constants/business-rules');
const { DocGia } = require('../src/models');

async function testPhanQuyen() {
    console.log('\n--- BẮT ĐẦU TEST: tests/phanquyen.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    console.log('Case 1: Kiểm tra quyền của Guest (Khách)');
    assert(AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_READ));
    assert(AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_SEARCH));
    assert(!AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_WRITE));
    assert(!AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BORROWS_CREATE));

    console.log('Case 2: Kiểm tra quyền của Reader (Độc giả)');
    assert(AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BOOKS_READ));
    assert(AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BORROWS_CREATE));
    assert(
        AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BORROWS_READ_OWN),
    );
    assert(!AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BOOKS_WRITE));

    console.log('Case 3: Kiểm tra quyền của Librarian (Nhân viên)');
    assert(AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.BOOKS_WRITE));
    assert(
        AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.BORROWS_MANAGE),
    );
    assert(!AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.USERS_MANAGE));

    console.log('Case 4: Kiểm tra quyền của Admin (Quản trị viên)');
    assert(AuthService.kiemTraQuyen(ROLES.QUANTRIVIEN, PERMISSIONS.BOOKS_READ));
    assert(
        AuthService.kiemTraQuyen(ROLES.QUANTRIVIEN, PERMISSIONS.BOOKS_WRITE),
    );
    assert(
        AuthService.kiemTraQuyen(ROLES.QUANTRIVIEN, PERMISSIONS.BORROWS_MANAGE),
    );
    assert(
        AuthService.kiemTraQuyen(ROLES.QUANTRIVIEN, PERMISSIONS.USERS_MANAGE),
    );
    assert(
        AuthService.kiemTraQuyen(ROLES.QUANTRIVIEN, PERMISSIONS.ADMIN_MANAGE),
    );

    console.log(
        'Case 5: Kiểm tra đăng nhập với mật khẩu băm bcrypt & kiểm tra trạng thái thẻ độc giả',
    );
    const emailTest = 'auth_test@gmail.com';
    const regToken = await taoRegistrationTokenTest(emailTest);
    const resDangKy = await AuthService.dangKyDocGia({
        registrationToken: regToken,
        email: emailTest,
        password: 'MySecret@123',
        hoLot: 'Vũ',
        ten: 'Hải',
        dienThoai: '0988776655',
    });
    const docGia = await DocGia.findOne({ email: emailTest });

    // Đăng nhập thành công với mật khẩu đúng
    const loginOk = await AuthService.dangNhapDocGia({
        email: 'auth_test@gmail.com',
        password: 'MySecret@123',
    });
    assert.strictEqual(loginOk.email, 'auth_test@gmail.com');

    // Đăng nhập thất bại khi sai mật khẩu
    let biSaiMatKhau = false;
    try {
        await AuthService.dangNhapDocGia({
            email: 'auth_test@gmail.com',
            password: 'wrongPassword',
        });
    } catch (err) {
        biSaiMatKhau = true;
    }
    assert.strictEqual(biSaiMatKhau, true);

    // Khi thẻ độc giả bị tạm khóa -> Chặn đăng nhập
    await DocGia.findByIdAndUpdate(docGia._id, {
        trangThai: TRANG_THAI_DOC_GIA.TAM_KHOA,
    });
    let biChanDangNhapKhoaThe = false;
    try {
        await AuthService.dangNhapDocGia({
            email: 'auth_test@gmail.com',
            password: 'MySecret@123',
        });
    } catch (err) {
        biChanDangNhapKhoaThe = true;
        assert(err.message.includes('tạm khóa'));
    }
    assert.strictEqual(biChanDangNhapKhoaThe, true);

    // Khi độc giả là sinh viên đã tốt nghiệp -> Thông báo yêu cầu đăng ký thẻ tự do
    await DocGia.findByIdAndUpdate(docGia._id, {
        trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
        daTotNghiep: true,
    });
    let biChanViTotNghiep = false;
    try {
        await AuthService.dangNhapDocGia({
            email: 'auth_test@gmail.com',
            password: 'MySecret@123',
        });
    } catch (err) {
        biChanViTotNghiep = true;
        assert(
            err.message.includes('Bạn đã tốt nghiệp') &&
                err.message.includes('đăng ký thẻ độc giả tự do'),
        );
    }
    assert.strictEqual(biChanViTotNghiep, true);

    // Case 6: Chống giả mạo x-user-role, kiểm tra độ mạnh mật khẩu & chống xem/sửa chéo hồ sơ (IDOR)
    console.log(
        'Case 6: Chống giả mạo header x-user-role, kiểm tra mật khẩu mạnh & chống rò rỉ dữ liệu chéo (IDOR)',
    );
    const { authenticate } = require('../src/middlewares/auth.middleware');
    const DocGiaController = require('../src/controllers/docgia.controller');
    const NhanVienController = require('../src/controllers/nhanvien.controller');

    // 6.1: Header x-user-role không được phép nâng quyền lên Admin
    const fakeAdminHeaderReq = { headers: { 'x-user-role': 'quanTriVien' } };
    await authenticate(fakeAdminHeaderReq, {}, () => {});
    assert.strictEqual(
        fakeAdminHeaderReq.user.role,
        ROLES.KHACH,
        'Header x-user-role phải bị bỏ qua và giữ nguyên role khach',
    );

    // 6.2: Mật khẩu yếu hoặc có khoảng trắng bị từ chối khi đăng ký
    const weakToken = await taoRegistrationTokenTest('weak_pass@gmail.com');
    let biChanMatKhauYeu = false;
    try {
        await AuthService.dangKyDocGia({
            registrationToken: weakToken,
            email: 'weak_pass@gmail.com',
            password: 'password123', // Thiếu chữ hoa và ký tự đặc biệt
            hoLot: 'Lê',
            ten: 'Yếu',
            dienThoai: '0912345678',
        });
    } catch (err) {
        biChanMatKhauYeu = true;
        assert.strictEqual(err.statusCode, 400);
    }
    assert.strictEqual(biChanMatKhauYeu, true);

    let biChanMatKhauKhoangTrang = false;
    try {
        await AuthService.dangKyDocGia({
            registrationToken: weakToken,
            email: 'weak_pass@gmail.com',
            password: 'Pass word@123', // Có khoảng trắng ' '
            hoLot: 'Lê',
            ten: 'Khoảng Trắng',
            dienThoai: '0912345678',
        });
    } catch (err) {
        biChanMatKhauKhoangTrang = true;
        assert.strictEqual(err.statusCode, 400);
    }
    assert.strictEqual(biChanMatKhauKhoangTrang, true);

    // 6.3: Độc giả A không được xem/cập nhật hồ sơ của Độc giả B hoặc Nhân viên
    let idorDocGiaError = null;
    await DocGiaController.getChiTietDocGia(
        {
            user: { _id: '507f1f77bcf86cd799439011', role: ROLES.DOCGIA, maDocGia: 'DGA9999999' },
            params: { id: docGia._id.toString() },
        },
        { json: () => {} },
        (err) => {
            idorDocGiaError = err;
        },
    );
    assert(idorDocGiaError && idorDocGiaError.statusCode === 403, 'Phải chặn Độc giả xem hồ sơ độc giả khác');

    let idorNhanVienError = null;
    await NhanVienController.getChiTietNhanVien(
        {
            user: { _id: docGia._id.toString(), role: ROLES.DOCGIA },
            params: { id: '507f1f77bcf86cd799439011' },
        },
        { json: () => {} },
        (err) => {
            idorNhanVienError = err;
        },
    );
    assert(idorNhanVienError && idorNhanVienError.statusCode === 403, 'Phải chặn Độc giả xem hồ sơ nhân viên');

    console.log('✅ tests/phanquyen.test.js PASSED ALL CHECKS!');
}

if (require.main === module) {
    testPhanQuyen()
        .then(() => disconnectTestDb())
        .catch(async (err) => {
            console.error('❌ FAILED:', err);
            await disconnectTestDb();
            process.exit(1);
        });
}

module.exports = testPhanQuyen;
