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
                    <i class="pi pi-lock" style="font-size: 3rem; color: #C53030"></i>
                    <h1 style="font-size: 1.75rem; color: var(--cr-text)">
                        403 — Truy cập bị từ chối
                    </h1>
                    <p>
                        Tài khoản của bạn không có quyền truy cập vào khu vực chức năng này.
                    </p>
                    <div class="cr-items-center">
                        <Button
                            label="Về Trang chủ"
                            icon="pi pi-home"
                            @click="router.push('/')"
                        />
                        <Button
                            label="Đăng nhập tài khoản khác"
                            icon="pi pi-sign-in"
                            severity="secondary"
                            outlined
                            @click="router.push('/dang-nhap')"
                        />
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
