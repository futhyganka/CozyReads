<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import { useAuthStore } from '@/stores/auth.store';
import logoImg from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const menuItems = computed(() => [
    {
        label: 'Trang chủ',
        icon: 'pi pi-home',
        command: () => router.push('/'),
    },
    {
        label: 'Khám phá sách',
        icon: 'pi pi-compass',
        command: () => router.push('/kham-pha'),
    },
    {
        label: 'Giới thiệu',
        icon: 'pi pi-info-circle',
        command: () => router.push('/gioi-thieu'),
    },
    {
        label: 'Chính sách',
        icon: 'pi pi-shield',
        command: () => router.push('/chinh-sach'),
    },
    {
        label: 'Liên hệ',
        icon: 'pi pi-envelope',
        command: () => router.push('/lien-he'),
    },
    {
        label: 'Góp ý',
        icon: 'pi pi-comment',
        command: () => router.push('/gop-y'),
    },
]);

function handleLogout() {
    authStore.logout('reader');
    toast.add({
        severity: 'info',
        summary: 'Đã đăng xuất',
        detail: 'Hẹn gặp lại bạn tại thư viện CozyReads.',
        life: 3000,
    });
    if (route.path.startsWith('/tai-khoan')) {
        router.push('/dang-nhap');
    }
}
</script>

<template>
    <div class="cr-app-shell">
        <header style="border-bottom: 1px solid var(--cr-border); background: var(--cr-card); position: sticky; top: 0; z-index: 30;">
            <div class="cr-container">
                <Menubar :model="menuItems" style="border: none; padding: 0.75rem 0;">
                    <template #start>
                        <div
                            class="cr-items-center"
                            style="cursor: pointer; margin-right: 1.5rem"
                            @click="router.push('/')"
                        >
                            <img
                                :src="logoImg"
                                alt="CozyReads Logo"
                                style="height: 44px; width: auto; object-fit: contain; display: block"
                            />
                        </div>
                    </template>
                    <template #end>
                        <div class="cr-items-center cr-flex-wrap">
                            <template v-if="authStore.isReader">
                                <Tag
                                    v-if="authStore.userProfile?.diemDocGia !== undefined"
                                    :value="`${authStore.userProfile.diemDocGia} điểm uy tín`"
                                    severity="success"
                                    icon="pi pi-star-fill"
                                />
                                <Button
                                    :label="authStore.displayName"
                                    icon="pi pi-user"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    @click="router.push('/tai-khoan')"
                                />
                                <Button
                                    icon="pi pi-sign-out"
                                    severity="secondary"
                                    text
                                    rounded
                                    aria-label="Đăng xuất"
                                    @click="handleLogout"
                                />
                            </template>
                            <template v-else>
                                <Button
                                    label="Đăng nhập"
                                    icon="pi pi-sign-in"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    @click="router.push('/dang-nhap')"
                                />
                                <Button
                                    label="Đăng ký thẻ"
                                    icon="pi pi-user-plus"
                                    size="small"
                                    @click="router.push('/dang-ky')"
                                />
                            </template>
                        </div>
                    </template>
                </Menubar>
            </div>
        </header>

        <main class="cr-main-grow">
            <router-view />
        </main>

        <footer class="cr-footer">
            <div class="cr-container">
                <div class="cr-grid-stats">
                    <div class="cr-flex-col cr-gap-xs">
                        <div class="cr-items-center">
                            <img
                                :src="logoImg"
                                alt="CozyReads Logo"
                                style="height: 40px; width: auto; object-fit: contain; display: block"
                            />
                        </div>
                        <p class="cr-muted">
                            Hệ thống quản lý mượn trả sách, thẻ độc giả và điểm uy tín trực tuyến thân thiện, minh bạch.
                        </p>
                    </div>
                    <div class="cr-flex-col cr-gap-xs">
                        <strong>Liên kết nhanh</strong>
                        <div class="cr-flex-col cr-gap-xs">
                            <router-link to="/kham-pha">Tra cứu & Khám phá sách</router-link>
                            <router-link to="/chinh-sach">Quy định điểm uy tín & Mượn trả</router-link>
                            <router-link to="/gioi-thieu">Giới thiệu thư viện</router-link>
                        </div>
                    </div>
                    <div class="cr-flex-col cr-gap-xs">
                        <strong>Giờ mở cửa quầy thư viện</strong>
                        <p class="cr-muted">Thứ 2 - Thứ 7: 07:30 - 17:30</p>
                        <p class="cr-muted">Hỗ trợ giữ sách trực tuyến: 24/7 (nhận sách tại quầy trong 24h)</p>
                    </div>
                    <div class="cr-flex-col cr-gap-xs">
                        <strong>Tác giả phát triển</strong>
                        <div class="cr-items-center cr-muted">
                            <i class="pi pi-user" style="color: var(--cr-primary)"></i>
                            <span>Tác giả: <strong style="color: var(--cr-text)">Ngân</strong></span>
                        </div>
                        <div class="cr-items-center cr-muted">
                            <i class="pi pi-envelope" style="color: var(--cr-primary)"></i>
                            <a href="mailto:nganb2410735@student.ctu.edu.vn">
                                nganb2410735@student.ctu.edu.vn
                            </a>
                        </div>
                        <div class="cr-items-center cr-muted">
                            <i class="pi pi-github" style="color: var(--cr-primary)"></i>
                            <a
                                href="https://github.com/futhyganka"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                github.com/futhyganka
                            </a>
                        </div>
                    </div>
                </div>
                <Divider />
                <div class="cr-flex-between cr-flex-wrap cr-muted">
                    <span>© 2026 CozyReads Library Management System — Phát triển bởi <strong>Ngân</strong> (<a href="https://github.com/futhyganka" target="_blank" rel="noopener noreferrer">futhyganka</a>).</span>
                    <span>Email: <a href="mailto:nganb2410735@student.ctu.edu.vn">nganb2410735@student.ctu.edu.vn</a></span>
                </div>
            </div>
        </footer>
    </div>
</template>
