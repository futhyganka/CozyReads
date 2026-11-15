import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
    READER_TOKEN_STORAGE_KEY,
    STAFF_TOKEN_STORAGE_KEY,
    isStaffPortalPath,
} from '@/services/api';
import authService from '@/services/auth.service';
import docGiaService from '@/services/docgia.service';
import nhanVienService from '@/services/nhanvien.service';
import { ROLES, CHUC_VU_NHAN_VIEN } from '@/utils/constants';

function parseJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

function mapStaffChucVuToRole(chucVu) {
    if (chucVu === CHUC_VU_NHAN_VIEN.ADMIN) return ROLES.QUANTRIVIEN;
    if (
        chucVu === CHUC_VU_NHAN_VIEN.NHAN_VIEN ||
        chucVu === CHUC_VU_NHAN_VIEN.QUAN_LY
    ) {
        return ROLES.NHANVIEN;
    }
    return ROLES.KHACH;
}

export const useAuthStore = defineStore('auth', () => {
    // Tách biệt hoàn toàn phiên Độc giả và phiên Nhân viên/Admin trong localStorage
    const readerToken = ref(localStorage.getItem(READER_TOKEN_STORAGE_KEY) || null);
    const readerProfile = ref(null);

    const staffToken = ref(localStorage.getItem(STAFF_TOKEN_STORAGE_KEY) || null);
    const staffProfile = ref(null);
    const staffRole = ref(ROLES.KHACH);

    // Reactive route scope ('reader' | 'staff') được cập nhật theo router navigation
    const activeScope = ref(isStaffPortalPath() ? 'staff' : 'reader');

    const readerInitialized = ref(false);
    const staffInitialized = ref(false);
    const isInitialized = computed(() =>
        activeScope.value === 'staff'
            ? staffInitialized.value
            : readerInitialized.value,
    );
    const loading = ref(false);

    function syncScopeByPath(path = window.location.pathname) {
        activeScope.value = isStaffPortalPath(path) ? 'staff' : 'reader';
    }

    const isReader = computed(() =>
        Boolean(readerToken.value && readerProfile.value),
    );
    const isStaff = computed(() =>
        Boolean(
            staffToken.value &&
                staffProfile.value &&
                (staffRole.value === ROLES.NHANVIEN ||
                    staffRole.value === ROLES.QUANTRIVIEN),
        ),
    );
    const isAdmin = computed(
        () => isStaff.value && staffRole.value === ROLES.QUANTRIVIEN,
    );

    const token = computed(() =>
        activeScope.value === 'staff' ? staffToken.value : readerToken.value,
    );

    const userProfile = computed(() =>
        activeScope.value === 'staff' ? staffProfile.value : readerProfile.value,
    );

    const role = computed(() => {
        if (activeScope.value === 'staff') {
            return isStaff.value ? staffRole.value : ROLES.KHACH;
        }
        return isReader.value ? ROLES.DOCGIA : ROLES.KHACH;
    });

    const isAuthenticated = computed(() =>
        activeScope.value === 'staff' ? isStaff.value : isReader.value,
    );

    const userId = computed(() => {
        if (userProfile.value?._id) return userProfile.value._id;
        if (!token.value) return null;
        return parseJwtPayload(token.value)?._id || null;
    });

    const displayName = computed(() => {
        if (activeScope.value === 'staff') {
            if (!staffProfile.value) return 'Nhân viên';
            return (
                staffProfile.value.hoTenNv ||
                staffProfile.value.msnv ||
                'Nhân viên'
            );
        }
        if (!readerProfile.value) return 'Tài khoản';
        return (
            `${readerProfile.value.hoLot || ''} ${readerProfile.value.ten || ''}`.trim() ||
            readerProfile.value.maDocGia ||
            'Tài khoản'
        );
    });

    function setReaderToken(newToken) {
        readerToken.value = newToken;
        if (newToken) {
            localStorage.setItem(READER_TOKEN_STORAGE_KEY, newToken);
        } else {
            localStorage.removeItem(READER_TOKEN_STORAGE_KEY);
        }
    }

    function setStaffToken(newToken) {
        staffToken.value = newToken;
        if (newToken) {
            localStorage.setItem(STAFF_TOKEN_STORAGE_KEY, newToken);
        } else {
            localStorage.removeItem(STAFF_TOKEN_STORAGE_KEY);
        }
    }

    function clearReaderSession() {
        setReaderToken(null);
        readerProfile.value = null;
    }

    function clearStaffSession() {
        setStaffToken(null);
        staffProfile.value = null;
        staffRole.value = ROLES.KHACH;
    }

    function clearSession(scope = activeScope.value) {
        if (scope === 'staff') {
            clearStaffSession();
        } else if (scope === 'reader') {
            clearReaderSession();
        } else {
            clearReaderSession();
            clearStaffSession();
        }
    }

    async function loginReader({ identifier, password }) {
        loading.value = true;
        try {
            const res = await authService.dangNhapDocGia({ identifier, password });
            const data = res.data;
            setReaderToken(data.token);
            readerProfile.value = data.docGia;
            activeScope.value = 'reader';
            readerInitialized.value = true;
            return data;
        } finally {
            loading.value = false;
        }
    }

    async function loginStaff({ msnv, password }) {
        loading.value = true;
        try {
            const res = await authService.dangNhapNhanVien({ msnv, password });
            const data = res.data;
            setStaffToken(data.token);
            staffProfile.value = data.nhanVien;
            staffRole.value =
                mapStaffChucVuToRole(data.nhanVien?.chucVu) || data.role;
            activeScope.value = 'staff';
            staffInitialized.value = true;
            return data;
        } finally {
            loading.value = false;
        }
    }

    async function restoreReaderSession() {
        const saved = localStorage.getItem(READER_TOKEN_STORAGE_KEY);
        if (!saved) {
            clearReaderSession();
            return;
        }
        const payload = parseJwtPayload(saved);
        const jwtRole = payload?.role || payload?.maVaiTro;
        if (
            !payload ||
            !payload._id ||
            jwtRole !== ROLES.DOCGIA ||
            (payload.exp && payload.exp * 1000 < Date.now())
        ) {
            clearReaderSession();
            return;
        }
        readerToken.value = saved;
        try {
            const res = await docGiaService.getChiTietDocGia(payload._id);
            const dg = res.data;
            if (
                !dg ||
                dg.trangThaiTaiKhoan === 'tamKhoa' ||
                dg.trangThaiTaiKhoan === 'daHuy'
            ) {
                clearReaderSession();
            } else {
                readerProfile.value = dg;
            }
        } catch {
            clearReaderSession();
        }
    }

    async function restoreStaffSession() {
        const saved = localStorage.getItem(STAFF_TOKEN_STORAGE_KEY);
        if (!saved) {
            clearStaffSession();
            return;
        }
        const payload = parseJwtPayload(saved);
        const jwtRole = payload?.role || payload?.maVaiTro;
        if (
            !payload ||
            !payload._id ||
            (jwtRole !== ROLES.NHANVIEN && jwtRole !== ROLES.QUANTRIVIEN) ||
            (payload.exp && payload.exp * 1000 < Date.now())
        ) {
            clearStaffSession();
            return;
        }
        staffToken.value = saved;
        try {
            const res = await nhanVienService.getChiTietNhanVien(payload._id);
            const nv = res.data;
            const verifiedRole = mapStaffChucVuToRole(nv?.chucVu);
            if (!nv || nv.daNghiViec || verifiedRole === ROLES.KHACH) {
                clearStaffSession();
            } else {
                staffProfile.value = nv;
                staffRole.value = verifiedRole;
            }
        } catch {
            clearStaffSession();
        }
    }

    async function restoreSession(force = false, targetPath = window.location.pathname) {
        syncScopeByPath(targetPath);

        // Migrate token cũ (nếu có từ phiên bản trước) sang đúng kho lưu trữ
        const legacyToken = localStorage.getItem('cr_auth_token');
        if (legacyToken) {
            const legacyPayload = parseJwtPayload(legacyToken);
            const legacyRole = legacyPayload?.role || legacyPayload?.maVaiTro;
            if (legacyRole === ROLES.DOCGIA && !localStorage.getItem(READER_TOKEN_STORAGE_KEY)) {
                localStorage.setItem(READER_TOKEN_STORAGE_KEY, legacyToken);
            } else if (
                (legacyRole === ROLES.NHANVIEN || legacyRole === ROLES.QUANTRIVIEN) &&
                !localStorage.getItem(STAFF_TOKEN_STORAGE_KEY)
            ) {
                localStorage.setItem(STAFF_TOKEN_STORAGE_KEY, legacyToken);
            }
            localStorage.removeItem('cr_auth_token');
        }

        if (activeScope.value === 'staff') {
            if (!staffInitialized.value || force) {
                await restoreStaffSession();
                staffInitialized.value = true;
            }
        } else {
            if (!readerInitialized.value || force) {
                await restoreReaderSession();
                readerInitialized.value = true;
            }
        }
    }

    async function refreshProfile() {
        syncScopeByPath();
        if (activeScope.value === 'staff') {
            await restoreStaffSession();
        } else {
            await restoreReaderSession();
        }
    }

    function logout(scope = activeScope.value) {
        clearSession(scope);
    }

    return {
        token,
        userProfile,
        role,
        readerToken,
        readerProfile,
        staffToken,
        staffProfile,
        staffRole,
        activeScope,
        isInitialized,
        loading,
        isAuthenticated,
        isReader,
        isStaff,
        isAdmin,
        userId,
        displayName,
        syncScopeByPath,
        loginReader,
        loginStaff,
        restoreSession,
        refreshProfile,
        logout,
        clearSession,
        clearReaderSession,
        clearStaffSession,
    };
});
