<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import PanelMenu from 'primevue/panelmenu';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import { useAuthStore } from '@/stores/auth.store';
import StatusTag from '@/components/common/StatusTag.vue';
import logoImg from '@/assets/logo.png';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const mobileDrawerVisible = ref(false);

const navigate = (path) => {
    mobileDrawerVisible.value = false;
    router.push(path);
};

const menuGroups = computed(() => {
    const groups = [
        {
            label: 'Nghiệp vụ Quầy Thư viện',
            icon: 'pi pi-briefcase',
            expanded: true,
            items: [
                {
                    label: 'Dashboard Tổng quan',
                    icon: 'pi pi-home',
                    command: () => navigate('/quan-ly'),
                },
                {
                    label: 'Mượn & Giữ sách',
                    icon: 'pi pi-arrow-right-arrow-left',
                    command: () => navigate('/quan-ly/muon-giu-sach'),
                },
                {
                    label: 'Tiếp nhận Trả sách',
                    icon: 'pi pi-check-square',
                    command: () => navigate('/quan-ly/tra-sach'),
                },
                {
                    label: 'Báo mất / Hỏng sách',
                    icon: 'pi pi-exclamation-triangle',
                    command: () => navigate('/quan-ly/bao-mat-sach'),
                },
                {
                    label: 'Quản lý Thanh toán',
                    icon: 'pi pi-wallet',
                    command: () => navigate('/quan-ly/thanh-toan'),
                },
                {
                    label: 'Quản lý liên hệ',
                    icon: 'pi pi-envelope',
                    command: () => navigate('/quan-ly/lien-he'),
                },
                {
                    label: 'Quản lý góp ý',
                    icon: 'pi pi-comment',
                    command: () => navigate('/quan-ly/gop-y'),
                },
            ],
        },
        {
            label: 'Kho sách & Độc giả',
            icon: 'pi pi-database',
            expanded: true,
            items: [
                {
                    label: 'Quản lý Đầu sách',
                    icon: 'pi pi-book',
                    command: () => navigate('/quan-ly/sach'),
                },
                {
                    label: 'Quản lý Độc giả',
                    icon: 'pi pi-users',
                    command: () => navigate('/quan-ly/doc-gia'),
                },
                {
                    label: 'Danh mục Sách',
                    icon: 'pi pi-tags',
                    command: () => navigate('/quan-ly/danh-muc'),
                },
                {
                    label: 'Tác giả',
                    icon: 'pi pi-pencil',
                    command: () => navigate('/quan-ly/tac-gia'),
                },
                {
                    label: 'Nhà xuất bản',
                    icon: 'pi pi-building',
                    command: () => navigate('/quan-ly/nha-xuat-ban'),
                },
            ],
        },
        {
            label: 'Tài khoản Nhân viên',
            icon: 'pi pi-user',
            expanded: true,
            items: [
                {
                    label: 'Hồ sơ & Đổi mật khẩu',
                    icon: 'pi pi-id-card',
                    command: () => navigate('/quan-ly/ho-so'),
                },
            ],
        },
    ];

    if (authStore.isAdmin) {
        groups.push({
            label: 'Quản trị Hệ thống (Admin)',
            icon: 'pi pi-shield',
            expanded: true,
            items: [
                {
                    label: 'Dashboard Quản trị',
                    icon: 'pi pi-chart-bar',
                    command: () => navigate('/quan-ly/admin/dashboard'),
                },
                {
                    label: 'Quản lý Nhân viên',
                    icon: 'pi pi-sitemap',
                    command: () => navigate('/quan-ly/admin/nhan-vien'),
                },
                {
                    label: 'Quản lý Tài khoản',
                    icon: 'pi pi-user-edit',
                    command: () => navigate('/quan-ly/admin/tai-khoan'),
                },
                {
                    label: 'Báo cáo Thống kê',
                    icon: 'pi pi-chart-line',
                    command: () => navigate('/quan-ly/admin/bao-cao'),
                },
            ],
        });
    }

    return groups;
});

function handleLogout() {
    authStore.logout('staff');
    toast.add({
        severity: 'info',
        summary: 'Đã đăng xuất',
        detail: 'Phiên làm việc nhân viên đã kết thúc.',
        life: 3000,
    });
    router.push('/quan-ly/dang-nhap');
}
</script>

<template>
    <div class="cr-mgmt-shell">
        <aside class="cr-mgmt-sidebar">
            <div
                class="cr-flex-col cr-gap-xs"
                style="padding: 0.25rem 0.5rem; cursor: pointer"
                @click="router.push('/quan-ly')"
            >
                <img
                    :src="logoImg"
                    alt="CozyReads Logo"
                    style="height: 44px; width: auto; object-fit: contain; align-self: flex-start; display: block"
                />
                <div style="font-size: 0.75rem; color: var(--cr-text-muted); font-weight: 600">
                    Management Portal
                </div>
            </div>

            <Divider style="margin: 0.25rem 0" />

            <div style="flex: 1; overflow-y: auto">
                <PanelMenu :model="menuGroups" multiple />
            </div>

            <Divider style="margin: 0.25rem 0" />

            <div class="cr-flex-col cr-gap-xs" style="padding: 0 0.25rem">
                <Button
                    label="Đăng xuất Nhân viên"
                    icon="pi pi-sign-out"
                    severity="danger"
                    outlined
                    size="small"
                    fluid
                    @click="handleLogout"
                />
            </div>
        </aside>

        <div class="cr-mgmt-main">
            <header class="cr-mgmt-topbar">
                <div class="cr-items-center">
                    <Button
                        icon="pi pi-bars"
                        severity="secondary"
                        outlined
                        size="small"
                        class="cr-mobile-only"
                        @click="mobileDrawerVisible = true"
                    />
                    <span style="font-weight: 700; font-size: 1.05rem">
                        Hệ thống Quản lý Thư viện CozyReads
                    </span>
                </div>

                <div class="cr-items-center cr-flex-wrap">
                    <StatusTag
                        v-if="authStore.userProfile?.chucVu"
                        type="chucVu"
                        :value="authStore.userProfile.chucVu"
                    />
                    <Tag
                        v-if="authStore.userProfile?.msnv"
                        :value="authStore.userProfile.msnv"
                        severity="secondary"
                    />
                    <Button
                        :label="authStore.displayName"
                        icon="pi pi-user"
                        severity="secondary"
                        text
                        size="small"
                        @click="router.push('/quan-ly/ho-so')"
                    />
                </div>
            </header>

            <main class="cr-mgmt-content">
                <router-view />
            </main>
        </div>

        <Drawer v-model:visible="mobileDrawerVisible">
            <template #header>
                <img
                    :src="logoImg"
                    alt="CozyReads Logo"
                    style="height: 36px; width: auto; object-fit: contain; display: block"
                />
            </template>
            <div class="cr-flex-col cr-gap-md">
                <PanelMenu :model="menuGroups" multiple />
                <Divider />
                <Button
                    label="Đăng xuất Nhân viên"
                    icon="pi pi-sign-out"
                    severity="danger"
                    outlined
                    fluid
                    @click="handleLogout"
                />
            </div>
        </Drawer>
    </div>
</template>
