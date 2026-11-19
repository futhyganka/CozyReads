<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from 'primevue/button';
import CozySmartWidget from '@/components/chat/CozySmartWidget.vue';
import logoImg from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();

const isStaffAuth = computed(() => route.path.startsWith('/quan-ly'));
</script>

<template>
    <div class="cr-auth-shell">
        <header class="cr-auth-header">
            <div class="cr-auth-header-inner">
                <div
                    class="cr-items-center"
                    :style="{ cursor: isStaffAuth ? 'default' : 'pointer', gap: '0.75rem' }"
                    @click="!isStaffAuth && router.push('/')"
                >
                    <img
                        :src="logoImg"
                        alt="CozyReads Logo"
                        style="height: 44px; width: auto; object-fit: contain; display: block"
                    />
                    <span v-if="isStaffAuth" class="cr-muted" style="font-weight: 600; font-size: 0.9rem">
                        Hệ thống quản lý thư viện nội bộ
                    </span>
                </div>
                <Button
                    label="Về trang chủ"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    outlined
                    size="small"
                    @click="router.push('/')"
                />
            </div>
        </header>

        <main class="cr-auth-main">
            <div class="cr-auth-box">
                <router-view />
            </div>
        </main>

        <!-- CozySmart AI Widget cho trang khách / độc giả đăng nhập -->
        <CozySmartWidget v-if="!isStaffAuth" />
    </div>
</template>
