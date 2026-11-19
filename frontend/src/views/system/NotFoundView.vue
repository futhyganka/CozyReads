<script setup>
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';

const router = useRouter();
</script>

<template>
    <div class="cr-container cr-page">
        <Card>
            <template #content>
                <div class="cr-empty-state cr-flex-col cr-flex-center cr-gap-md">
                    <i class="pi pi-compass" style="font-size: 3rem; color: var(--cr-primary)"></i>
                    <h1 style="font-size: 1.75rem; color: var(--cr-text)">
                        404 — Không tìm thấy trang
                    </h1>
                    <p>Đường dẫn bạn truy cập không tồn tại trong hệ thống CozyReads.</p>
                    <Button
                        label="Quay về trang chủ"
                        icon="pi pi-home"
                        @click="router.push('/')"
                    />
                </div>
            </template>
        </Card>
    </div>
</template>
