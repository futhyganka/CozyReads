<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { registerUnauthorizedHandler } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

onMounted(() => {
    registerUnauthorizedHandler((msg) => {
        if (authStore.isAuthenticated) {
            const wasStaffArea =
                route.path.startsWith('/quan-ly') || authStore.isStaff;
            authStore.clearSession();
            toast.add({
                severity: 'warn',
                summary: 'Phiên đăng nhập hết hạn',
                detail: msg || 'Vui lòng đăng nhập lại để tiếp tục.',
                life: 4000,
            });
            router.push(wasStaffArea ? '/quan-ly/dang-nhap' : '/dang-nhap');
        }
    });
});
</script>

<template>
    <Toast position="top-right" />
    <ConfirmDialog />
    <router-view />
</template>
