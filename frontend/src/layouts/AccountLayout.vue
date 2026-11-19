<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import PanelMenu from 'primevue/panelmenu';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import { useAuthStore } from '@/stores/auth.store';
import StatusTag from '@/components/common/StatusTag.vue';
import { getLoaiDocGiaLabel } from '@/utils/formatters';

const router = useRouter();
const authStore = useAuthStore();
const mobileDrawerVisible = ref(false);

const navigate = (path) => {
    mobileDrawerVisible.value = false;
    router.push(path);
};

const accountMenuItems = computed(() => [
    {
        label: 'Tài khoản & Thẻ thư viện',
        icon: 'pi pi-id-card',
        expanded: true,
        items: [
            {
                label: 'Tổng quan tài khoản',
                icon: 'pi pi-chart-pie',
                command: () => navigate('/tai-khoan'),
            },
            {
                label: 'Hồ sơ cá nhân',
                icon: 'pi pi-user-edit',
                command: () => navigate('/tai-khoan/ho-so'),
            },
            {
                label: 'Thẻ độc giả & Điểm uy tín',
                icon: 'pi pi-star',
                command: () => navigate('/tai-khoan/the-doc-gia'),
            },
            {
                label: 'Bảo mật & Đổi mật khẩu',
                icon: 'pi pi-lock',
                command: () => navigate('/tai-khoan/bao-mat'),
            },
        ],
    },
    {
        label: 'Hoạt động mượn & phí',
        icon: 'pi pi-book',
        expanded: true,
        items: [
            {
                label: 'Yêu cầu giữ sách (24h)',
                icon: 'pi pi-bookmark',
                command: () => navigate('/tai-khoan/giu-sach'),
            },
            {
                label: 'Sách đang mượn',
                icon: 'pi pi-folder-open',
                command: () => navigate('/tai-khoan/dang-muon'),
            },
            {
                label: 'Lịch sử mượn trả',
                icon: 'pi pi-history',
                command: () => navigate('/tai-khoan/lich-su-muon'),
            },
            {
                label: 'Phí & Lịch sử thanh toán',
                icon: 'pi pi-wallet',
                command: () => navigate('/tai-khoan/thanh-toan'),
            },
        ],
    },
]);
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div class="cr-items-center" style="gap: 0.875rem">
                <div
                    style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--cr-border); overflow: hidden; background: var(--cr-sage-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                >
                    <img
                        v-if="authStore.userProfile?.avatar"
                        :src="authStore.userProfile.avatar"
                        alt="Avatar"
                        referrerpolicy="no-referrer"
                        style="width: 100%; height: 100%; object-fit: cover"
                    />
                    <i
                        v-else
                        class="pi pi-user"
                        style="font-size: 1.35rem; color: var(--cr-sage-dark)"
                    ></i>
                </div>
                <div>
                    <h1 class="cr-page-title">Trang độc giả</h1>
                    <p class="cr-page-subtitle">
                        {{ authStore.userProfile?.maDocGia }} - {{ authStore.displayName }}
                    </p>
                </div>
            </div>
            <div class="cr-items-center">
                <Button
                    label="Menu tài khoản"
                    icon="pi pi-bars"
                    severity="secondary"
                    outlined
                    class="cr-mobile-only"
                    @click="mobileDrawerVisible = true"
                />
                <StatusTag
                    v-if="authStore.userProfile"
                    type="docGia"
                    :value="authStore.userProfile.trangThaiTaiKhoan"
                />
                <Tag
                    v-if="authStore.userProfile"
                    :value="getLoaiDocGiaLabel(authStore.userProfile.loaiDocGia)"
                    severity="secondary"
                />
            </div>
        </div>

        <div class="cr-grid-sidebar">
            <aside class="cr-account-sidebar">
                <Card>
                    <template #content>
                        <PanelMenu :model="accountMenuItems" multiple />
                    </template>
                </Card>
            </aside>

            <section style="min-width: 0">
                <router-view />
            </section>
        </div>

        <Drawer v-model:visible="mobileDrawerVisible" header="Menu tài khoản">
            <PanelMenu :model="accountMenuItems" multiple />
        </Drawer>
    </div>
</template>
