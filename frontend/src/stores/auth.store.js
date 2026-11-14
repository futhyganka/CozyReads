import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { TOKEN_STORAGE_KEY } from '@/services/api';
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
    const token = ref(localStorage.getItem(TOKEN_STORAGE_KEY) || null);
    const userProfile = ref(null);
    const role = ref(ROLES.KHACH);
    const isInitialized = ref(false);
    const loading = ref(false);

    const isAuthenticated = computed(
        () => Boolean(token.value && role.value && role.value !== ROLES.KHACH),
    );
    const isReader = computed(() => role.value === ROLES.DOCGIA);
    const isStaff = computed(
        () =>
            role.value === ROLES.NHANVIEN || role.value === ROLES.QUANTRIVIEN,
    );
    const isAdmin = computed(() => role.value === ROLES.QUANTRIVIEN);

    const userId = computed(() => {
        if (userProfile.value?._id) return userProfile.value._id;
        if (!token.value) return null;
        return parseJwtPayload(token.value)?._id || null;
    });

    const displayName = computed(() => {
        if (!userProfile.value) return 'Tài khoản';
        if (role.value === ROLES.DOCGIA) {
            return `${userProfile.value.hoLot || ''} ${userProfile.value.ten || ''}`.trim() || userProfile.value.maDocGia;
        }
        return userProfile.value.hoTenNv || userProfile.value.msnv || 'Nhân viên';
    });

    function setToken(newToken) {
        token.value = newToken;
        if (newToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    }

    function clearSession() {
        setToken(null);
        userProfile.value = null;
        role.value = ROLES.KHACH;
    }

    async function loginReader({ identifier, password }) {
        loading.value = true;
        try {
            const res = await authService.dangNhapDocGia({ identifier, password });
            const data = res.data;
            setToken(data.token);
            userProfile.value = data.docGia;
            role.value = ROLES.DOCGIA;
            isInitialized.value = true;
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
            setToken(data.token);
            userProfile.value = data.nhanVien;
            role.value = mapStaffChucVuToRole(data.nhanVien?.chucVu) || data.role;
            isInitialized.value = true;
            return data;
        } finally {
            loading.value = false;
        }
    }

    async function restoreSession(force = false) {
        if (isInitialized.value && !force) return;

        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!savedToken) {
            clearSession();
            isInitialized.value = true;
            return;
        }

        const payload = parseJwtPayload(savedToken);
        if (!payload || !payload._id || (payload.exp && payload.exp * 1000 < Date.now())) {
            clearSession();
            isInitialized.value = true;
            return;
        }

        token.value = savedToken;
        const jwtRole = payload.role || payload.maVaiTro;

        try {
            if (jwtRole === ROLES.DOCGIA) {
                const res = await docGiaService.getChiTietDocGia(payload._id);
                const dg = res.data;
                if (!dg || dg.trangThaiTaiKhoan === 'tamKhoa' || dg.trangThaiTaiKhoan === 'daHuy') {
                    clearSession();
                } else {
                    userProfile.value = dg;
                    role.value = ROLES.DOCGIA;
                }
            } else if (jwtRole === ROLES.NHANVIEN || jwtRole === ROLES.QUANTRIVIEN) {
                const res = await nhanVienService.getChiTietNhanVien(payload._id);
                const nv = res.data;
                const verifiedRole = mapStaffChucVuToRole(nv?.chucVu);
                if (!nv || nv.daNghiViec || verifiedRole === ROLES.KHACH) {
                    clearSession();
                } else {
                    userProfile.value = nv;
                    role.value = verifiedRole;
                }
            } else {
                clearSession();
            }
        } catch {
            clearSession();
        } finally {
            isInitialized.value = true;
        }
    }

    async function refreshProfile() {
        await restoreSession(true);
    }

    function logout() {
        clearSession();
    }

    return {
        token,
        userProfile,
        role,
        isInitialized,
        loading,
        isAuthenticated,
        isReader,
        isStaff,
        isAdmin,
        userId,
        displayName,
        loginReader,
        loginStaff,
        restoreSession,
        refreshProfile,
        logout,
        clearSession,
    };
});
