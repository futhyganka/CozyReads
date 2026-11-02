const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
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
    const { docGia } = await AuthService.dangKyDocGia({
        email: 'auth_test@gmail.com',
        password: 'mySecretPassword',
        hoLot: 'Vũ',
        ten: 'Hải',
        dienThoai: '0988776655',
    });

    // Đăng nhập thành công với mật khẩu đúng
    const loginOk = await AuthService.dangNhap({
        email: 'auth_test@gmail.com',
        password: 'mySecretPassword',
    });
    assert.strictEqual(loginOk.email, 'auth_test@gmail.com');

    // Đăng nhập thất bại khi sai mật khẩu
    let biSaiMatKhau = false;
    try {
        await AuthService.dangNhap({
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
        await AuthService.dangNhap({
            email: 'auth_test@gmail.com',
            password: 'mySecretPassword',
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
        await AuthService.dangNhap({
            email: 'auth_test@gmail.com',
            password: 'mySecretPassword',
        });
    } catch (err) {
        biChanViTotNghiep = true;
        assert(
            err.message.includes('Bạn đã tốt nghiệp') &&
                err.message.includes('đăng ký thẻ độc giả tự do'),
        );
    }
    assert.strictEqual(biChanViTotNghiep, true);

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
