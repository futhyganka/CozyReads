const assert = require('assert');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('./setup');
const AuthService = require('../src/services/auth.service');
const {
    PERMISSIONS,
    ROLES,
    ROLE_PERMISSIONS,
} = require('../src/constants/permissions');

async function testPhanQuyen() {
    console.log('\n--- BẮT ĐẦU TEST: tests/phanquyen.test.js ---');
    await connectTestDb();
    await clearTestDb();
    await AuthService.khoiTaoVaiTroMacDinh();

    console.log('Case 1: Kiểm tra quyền của Guest (Khách)');
    // Guest chỉ được đọc và tìm kiếm sách
    assert(AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_READ));
    assert(AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_SEARCH));
    assert(!AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BOOKS_WRITE));
    assert(!AuthService.kiemTraQuyen(ROLES.KHACH, PERMISSIONS.BORROWS_CREATE));

    console.log('Case 2: Kiểm tra quyền của Reader (Độc giả)');
    // Độc giả được đọc sách, tìm kiếm, tạo phiếu mượn, xem lịch sử của mình
    assert(AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BOOKS_READ));
    assert(AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BORROWS_CREATE));
    assert(
        AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BORROWS_READ_OWN),
    );
    assert(!AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BOOKS_WRITE));
    assert(!AuthService.kiemTraQuyen(ROLES.DOCGIA, PERMISSIONS.BORROWS_MANAGE));

    console.log('Case 3: Kiểm tra quyền của Librarian (Nhân viên)');
    // Nhân viên được thêm/sửa/xóa sách, quản lý tất cả phiếu mượn, nhưng không có quyền admin/users
    assert(AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.BOOKS_WRITE));
    assert(
        AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.BORROWS_MANAGE),
    );
    assert(!AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.USERS_MANAGE));
    assert(!AuthService.kiemTraQuyen(ROLES.NHANVIEN, PERMISSIONS.ADMIN_MANAGE));

    console.log('Case 4: Kiểm tra quyền của Admin (Quản trị viên)');
    // Admin có toàn quyền kế thừa mọi quyền
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
