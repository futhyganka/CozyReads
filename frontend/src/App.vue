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
        const isStaffArea = route.path.startsWith('/quan-ly');
        if (isStaffArea && authStore.isStaff) {
            authStore.clearStaffSession();
            toast.add({
                severity: 'warn',
                summary: 'Phiên đăng nhập nhân viên hết hạn',
                detail: msg || 'Vui lòng đăng nhập lại để tiếp tục.',
                life: 4000,
            });
            router.push('/quan-ly/dang-nhap');
        } else if (!isStaffArea && authStore.isReader) {
            authStore.clearReaderSession();
            toast.add({
                severity: 'warn',
                summary: 'Phiên đăng nhập độc giả hết hạn',
                detail: msg || 'Vui lòng đăng nhập lại để tiếp tục.',
                life: 4000,
            });
            router.push('/dang-nhap');
        }
    });
});
</script>

<template>
    <Toast position="top-right" />
    <ConfirmDialog />
    <router-view />
</template>
