/**
 * Bảng phân quyền (Permissions Matrix) cho các vai trò trong CozyReads
 *
 * Permission       Mô tả                           Guest   Reader  Librarian   Admin
 * books:read       Xem danh sách / chi tiết sách   ✅      ✅      ✅          ✅
 * books:search     Tìm kiếm sách                   ✅      ✅      ✅          ✅
 * books:write      Thêm/sửa/xóa sách               ❌      ❌      ✅          ✅
 * borrows:create   Tạo phiếu mượn                  ❌      ✅      ✅          ✅
 * borrows:read-own Xem lịch sử mượn của mình       ❌      ✅      ✅          ✅
 * borrows:manage   Xem + xử lý tất cả phiếu mượn   ❌      ❌      ✅          ✅
 * users:manage     Quản lý tài khoản               ❌      ❌      ❌          ✅
 * admin:manage     Toàn quyền admin                ❌      ❌      ❌          ✅
 */

const PERMISSIONS = {
    BOOKS_READ: 'books:read',
    BOOKS_SEARCH: 'books:search',
    BOOKS_WRITE: 'books:write',
    BORROWS_CREATE: 'borrows:create',
    BORROWS_READ_OWN: 'borrows:read-own',
    BORROWS_MANAGE: 'borrows:manage',
    USERS_MANAGE: 'users:manage',
    ADMIN_MANAGE: 'admin:manage',
};

const ROLES = {
    KHACH: 'khach',
    DOCGIA: 'docGia',
    NHANVIEN: 'nhanVien',
    QUANTRIVIEN: 'quanTriVien',
};

const ROLE_PERMISSIONS = {
    [ROLES.KHACH]: [PERMISSIONS.BOOKS_READ, PERMISSIONS.BOOKS_SEARCH],
    [ROLES.DOCGIA]: [
        PERMISSIONS.BOOKS_READ,
        PERMISSIONS.BOOKS_SEARCH,
        PERMISSIONS.BORROWS_CREATE,
        PERMISSIONS.BORROWS_READ_OWN,
    ],
    [ROLES.NHANVIEN]: [
        PERMISSIONS.BOOKS_READ,
        PERMISSIONS.BOOKS_SEARCH,
        PERMISSIONS.BOOKS_WRITE,
        PERMISSIONS.BORROWS_CREATE,
        PERMISSIONS.BORROWS_READ_OWN,
        PERMISSIONS.BORROWS_MANAGE,
    ],
    [ROLES.QUANTRIVIEN]: [
        PERMISSIONS.BOOKS_READ,
        PERMISSIONS.BOOKS_SEARCH,
        PERMISSIONS.BOOKS_WRITE,
        PERMISSIONS.BORROWS_CREATE,
        PERMISSIONS.BORROWS_READ_OWN,
        PERMISSIONS.BORROWS_MANAGE,
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.ADMIN_MANAGE,
    ],
};

module.exports = {
    PERMISSIONS,
    ROLES,
    ROLE_PERMISSIONS,
};
