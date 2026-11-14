<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from 'primevue/button';
import logoImg from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();

const isStaffAuth = computed(() => route.path.startsWith('/quan-ly'));
</script>

<template>
    <div class="cr-auth-shell">
        <div class="cr-auth-box">
            <div class="cr-flex-between" style="margin-bottom: 1.25rem">
                <div
                    class="cr-flex-col cr-gap-xs"
                    :style="{ cursor: isStaffAuth ? 'default' : 'pointer' }"
                    @click="!isStaffAuth && router.push('/')"
                >
                    <img
                        :src="logoImg"
                        alt="CozyReads Logo"
                        style="height: 48px; width: auto; object-fit: contain; display: block"
                    />
                    <div v-if="isStaffAuth" class="cr-muted" style="font-size: 0.75rem">
                        Hệ thống Quản lý Thư viện Nội bộ
                    </div>
                </div>
                <Button
                    v-if="!isStaffAuth"
                    label="Về trang chủ"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    text
                    size="small"
                    @click="router.push('/')"
                />
            </div>

            <router-view />
        </div>
    </div>
</template>
