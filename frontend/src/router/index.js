import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { ROLES } from '@/utils/constants';

import ReaderLayout from '@/layouts/ReaderLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import AccountLayout from '@/layouts/AccountLayout.vue';
import ManagementLayout from '@/layouts/ManagementLayout.vue';

const routes = [
    // =========================================================================
    // NHÁNH 1: READER PORTAL (Vào thẳng Trang chủ được, Đăng nhập riêng tại /dang-nhap)
    // =========================================================================
    {
        path: '/',
        component: ReaderLayout,
        children: [
            {
                path: '',
                name: 'home',
                component: () => import('@/views/reader/HomeView.vue'),
                meta: { title: 'Trang chủ — CozyReads' },
            },
            {
                path: 'kham-pha',
                name: 'explore-books',
                component: () => import('@/views/reader/ExploreBooksView.vue'),
                meta: { title: 'Khám phá Sách — CozyReads' },
            },
            {
                path: 'sach/:id',
                name: 'book-detail',
                component: () => import('@/views/reader/BookDetailView.vue'),
                meta: { title: 'Chi tiết Sách — CozyReads' },
            },
            {
                path: 'gioi-thieu',
                name: 'about',
                component: () => import('@/views/reader/AboutView.vue'),
                meta: { title: 'Giới thiệu — CozyReads' },
            },
            {
                path: 'chinh-sach',
                name: 'policy',
                component: () => import('@/views/reader/PolicyView.vue'),
                meta: { title: 'Chính sách Thư viện — CozyReads' },
            },
            {
                path: 'lien-he',
                name: 'contact',
                component: () => import('@/views/reader/ContactView.vue'),
                meta: { title: 'Liên hệ — CozyReads' },
            },
            {
                path: 'gop-y',
                name: 'feedback',
                component: () => import('@/views/reader/FeedbackView.vue'),
                meta: { title: 'Góp ý — CozyReads' },
            },
            {
                path: 'tai-khoan',
                component: AccountLayout,
                meta: {
                    requiresReaderAuth: true,
                    roles: [ROLES.DOCGIA],
                },
                children: [
                    {
                        path: '',
                        name: 'account-overview',
                        component: () =>
                            import('@/views/reader/AccountOverviewView.vue'),
                        meta: { title: 'Tổng quan Tài khoản — CozyReads' },
                    },
                    {
                        path: 'ho-so',
                        name: 'reader-profile',
                        component: () =>
                            import('@/views/reader/ReaderProfileView.vue'),
                        meta: { title: 'Hồ sơ Cá nhân — CozyReads' },
                    },
                    {
                        path: 'the-doc-gia',
                        name: 'reader-card',
                        component: () =>
                            import('@/views/reader/ReaderCardPointsView.vue'),
                        meta: { title: 'Thẻ Độc giả & Điểm uy tín — CozyReads' },
                    },
                    {
                        path: 'giu-sach',
                        name: 'reader-reservations',
                        component: () =>
                            import('@/views/reader/ReaderReservationsView.vue'),
                        meta: { title: 'Giữ sách trực tuyến — CozyReads' },
                    },
                    {
                        path: 'dang-muon',
                        name: 'reader-active-borrows',
                        component: () =>
                            import('@/views/reader/ReaderActiveBorrowsView.vue'),
                        meta: { title: 'Sách đang mượn — CozyReads' },
                    },
                    {
                        path: 'lich-su-muon',
                        name: 'reader-borrow-history',
                        component: () =>
                            import('@/views/reader/ReaderBorrowHistoryView.vue'),
                        meta: { title: 'Lịch sử Mượn trả — CozyReads' },
                    },
                    {
                        path: 'thanh-toan',
                        name: 'reader-payments',
                        component: () =>
                            import('@/views/reader/ReaderPaymentsView.vue'),
                        meta: { title: 'Phí & Thanh toán — CozyReads' },
                    },
                    {
                        path: 'bao-mat',
                        name: 'account-security',
                        component: () =>
                            import('@/views/reader/AccountSecurityView.vue'),
                        meta: { title: 'Bảo mật Tài khoản — CozyReads' },
                    },
                ],
            },
            {
                path: '403',
                name: 'forbidden',
                component: () => import('@/views/system/ForbiddenView.vue'),
                meta: { title: 'Truy cập bị từ chối — CozyReads' },
            },
        ],
    },

    // TRANG XÁC THỰC RIÊNG CỦA NHÁNH ĐỘC GIẢ
    {
        path: '/',
        component: AuthLayout,
        meta: { readerGuestOnly: true },
        children: [
            {
                path: 'dang-nhap',
                name: 'reader-login',
                component: () => import('@/views/auth/LoginView.vue'),
                meta: { title: 'Đăng nhập Độc giả — CozyReads' },
            },
            {
                path: 'dang-ky',
                name: 'register',
                component: () => import('@/views/auth/RegisterView.vue'),
                meta: { title: 'Đăng ký Thẻ Độc giả — CozyReads' },
            },
            {
                path: 'quen-mat-khau',
                name: 'forgot-password',
                component: () => import('@/views/auth/ForgotPasswordView.vue'),
                meta: { title: 'Quên mật khẩu — CozyReads' },
            },
        ],
    },

    // =========================================================================
    // NHÁNH 2: MANAGEMENT PORTAL (Bắt buộc đăng nhập tại /quan-ly/dang-nhap mới vào được)
    // =========================================================================
    {
        path: '/quan-ly',
        component: AuthLayout,
        meta: { staffGuestOnly: true },
        children: [
            {
                path: 'dang-nhap',
                name: 'staff-login',
                component: () => import('@/views/auth/StaffLoginView.vue'),
                meta: { title: 'Đăng nhập Nhân viên & Quản trị — CozyReads' },
            },
        ],
    },
    {
        path: '/quan-ly',
        component: ManagementLayout,
        meta: {
            requiresStaffAuth: true,
            roles: [ROLES.NHANVIEN, ROLES.QUANTRIVIEN],
        },
        children: [
            {
                path: '',
                name: 'mgmt-dashboard',
                component: () =>
                    import('@/views/management/StaffDashboardView.vue'),
                meta: { title: 'Dashboard Quản lý — CozyReads' },
            },
            {
                path: 'sach',
                name: 'mgmt-books',
                component: () =>
                    import('@/views/management/ManageBooksView.vue'),
                meta: { title: 'Quản lý Đầu sách — CozyReads' },
            },
            {
                path: 'doc-gia',
                name: 'mgmt-readers',
                component: () =>
                    import('@/views/management/ManageReadersView.vue'),
                meta: { title: 'Quản lý Độc giả — CozyReads' },
            },
            {
                path: 'muon-giu-sach',
                name: 'mgmt-borrows',
                component: () =>
                    import(
                        '@/views/management/BorrowReserveManagementView.vue'
                    ),
                meta: { title: 'Mượn & Giữ sách — CozyReads' },
            },
            {
                path: 'tra-sach',
                name: 'mgmt-returns',
                component: () =>
                    import('@/views/management/ReturnBookManagementView.vue'),
                meta: { title: 'Tiếp nhận Trả sách — CozyReads' },
            },
            {
                path: 'bao-mat-sach',
                name: 'mgmt-lost-books',
                component: () =>
                    import('@/views/management/LostBookManagementView.vue'),
                meta: { title: 'Báo mất & Bồi thường — CozyReads' },
            },
            {
                path: 'danh-muc',
                name: 'mgmt-categories',
                component: () =>
                    import('@/views/management/ManageCategoriesView.vue'),
                meta: { title: 'Quản lý Danh mục — CozyReads' },
            },
            {
                path: 'tac-gia',
                name: 'mgmt-authors',
                component: () =>
                    import('@/views/management/ManageAuthorsView.vue'),
                meta: { title: 'Quản lý Tác giả — CozyReads' },
            },
            {
                path: 'nha-xuat-ban',
                name: 'mgmt-publishers',
                component: () =>
                    import('@/views/management/ManagePublishersView.vue'),
                meta: { title: 'Quản lý Nhà xuất bản — CozyReads' },
            },
            {
                path: 'thanh-toan',
                name: 'mgmt-payments',
                component: () =>
                    import('@/views/management/ManagePaymentsView.vue'),
                meta: { title: 'Quản lý Thanh toán — CozyReads' },
            },
            {
                path: 'ho-so',
                name: 'mgmt-profile',
                component: () =>
                    import('@/views/management/StaffProfileView.vue'),
                meta: { title: 'Hồ sơ Nhân viên — CozyReads' },
            },
            {
                path: 'admin/dashboard',
                name: 'admin-dashboard',
                component: () =>
                    import(
                        '@/views/management/admin/AdminDashboardView.vue'
                    ),
                meta: {
                    title: 'Dashboard Quản trị — CozyReads',
                    roles: [ROLES.QUANTRIVIEN],
                },
            },
            {
                path: 'admin/nhan-vien',
                name: 'admin-staff',
                component: () =>
                    import('@/views/management/admin/ManageStaffView.vue'),
                meta: {
                    title: 'Quản lý Nhân sự — CozyReads',
                    roles: [ROLES.QUANTRIVIEN],
                },
            },
            {
                path: 'admin/tai-khoan',
                name: 'admin-accounts',
                component: () =>
                    import('@/views/management/admin/ManageAccountsView.vue'),
                meta: {
                    title: 'Quản lý Tài khoản — CozyReads',
                    roles: [ROLES.QUANTRIVIEN],
                },
            },
            {
                path: 'admin/bao-cao',
                name: 'admin-reports',
                component: () =>
                    import('@/views/management/admin/AdminReportsView.vue'),
                meta: {
                    title: 'Báo cáo Thống kê — CozyReads',
                    roles: [ROLES.QUANTRIVIEN],
                },
            },
        ],
    },

    // Catch-all 404
    {
        path: '/:pathMatch(.*)*',
        component: ReaderLayout,
        children: [
            {
                path: '',
                name: 'not-found',
                component: () => import('@/views/system/NotFoundView.vue'),
                meta: { title: 'Không tìm thấy trang — CozyReads' },
            },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior() {
        return { top: 0 };
    },
});

router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    if (!authStore.isInitialized) {
        await authStore.restoreSession();
    }

    if (to.meta?.title) {
        document.title = String(to.meta.title);
    }

    const isReaderGuestOnly = to.matched.some(
        (record) => record.meta?.readerGuestOnly,
    );
    const isStaffGuestOnly = to.matched.some(
        (record) => record.meta?.staffGuestOnly,
    );
    const requiresReaderAuth = to.matched.some(
        (record) => record.meta?.requiresReaderAuth,
    );
    const requiresStaffAuth = to.matched.some(
        (record) => record.meta?.requiresStaffAuth,
    );

    // 1. Trang đăng nhập Nhân viên (/quan-ly/dang-nhap)
    if (isStaffGuestOnly) {
        if (authStore.isStaff) {
            return '/quan-ly';
        }
        return true;
    }

    // 2. Trang đăng nhập / đăng ký Độc giả (/dang-nhap, /dang-ky, /quen-mat-khau)
    if (isReaderGuestOnly) {
        if (authStore.isReader) {
            return '/tai-khoan';
        }
        return true;
    }

    // 3. Nhánh Nhân viên (/quan-ly/...) -> Bắt buộc đăng nhập Nhân viên / Admin
    if (requiresStaffAuth) {
        if (!authStore.isStaff) {
            return {
                path: '/quan-ly/dang-nhap',
                query: { redirect: to.fullPath },
            };
        }

        // Kiểm tra quyền Admin cho các route /quan-ly/admin/...
        const matchedWithRoles = [...to.matched]
            .reverse()
            .find((r) => Array.isArray(r.meta?.roles));

        if (matchedWithRoles) {
            const allowedRoles = matchedWithRoles.meta.roles;
            if (!allowedRoles.includes(authStore.role)) {
                return { path: '/403' };
            }
        }
        return true;
    }

    // 4. Khu vực Tài khoản Độc giả (/tai-khoan/...) -> Bắt buộc đăng nhập Độc giả
    if (requiresReaderAuth) {
        if (!authStore.isReader) {
            return {
                path: '/dang-nhap',
                query: { redirect: to.fullPath },
            };
        }
        return true;
    }

    return true;
});

export default router;
