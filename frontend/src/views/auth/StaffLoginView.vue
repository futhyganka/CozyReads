<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const errorMsg = ref('');

const staffForm = reactive({
    msnv: '',
    password: '',
});

async function handleStaffLogin() {
    errorMsg.value = '';
    if (!staffForm.msnv.trim() || !staffForm.password) {
        errorMsg.value = 'Vui lòng nhập Mã số nhân viên (MSNV) và mật khẩu.';
        return;
    }

    try {
        const res = await authStore.loginStaff({
            msnv: staffForm.msnv.trim().toUpperCase(),
            password: staffForm.password,
        });
        toast.add({
            severity: 'success',
            summary: 'Đăng nhập thành công',
            detail: `Xin chào ${res.nhanVien?.hoTenNv || res.nhanVien?.msnv}`,
            life: 3000,
        });
        const redirectPath =
            route.query.redirect &&
            String(route.query.redirect).startsWith('/quan-ly')
                ? String(route.query.redirect)
                : '/quan-ly';
        router.push(redirectPath);
    } catch (err) {
        errorMsg.value = err.message;
    }
}
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-col cr-flex-center cr-gap-xs" style="text-align: center">
                <Tag value="Management Portal" severity="secondary" icon="pi pi-shield" />
                <span>Đăng nhập Nội bộ Nhân viên & Quản trị</span>
            </div>
        </template>
        <template #subtitle>
            <div style="text-align: center">
                Khu vực dành riêng cho Thủ thư, Quản lý và Quản trị viên hệ thống CozyReads
            </div>
        </template>
        <template #content>
            <Message
                v-if="errorMsg"
                severity="error"
                style="margin-bottom: 1rem"
            >
                {{ errorMsg }}
            </Message>

            <form
                class="cr-flex-col cr-gap-md"
                @submit.prevent="handleStaffLogin"
            >
                <div class="cr-field">
                    <label class="cr-label" for="staff-msnv">
                        Mã số nhân viên (MSNV)
                    </label>
                    <InputText
                        id="staff-msnv"
                        v-model="staffForm.msnv"
                        placeholder="VD: SA000000 hoặc SA000001"
                        fluid
                    />
                </div>

                <div class="cr-field">
                    <label class="cr-label" for="staff-pass">
                        Mật khẩu
                    </label>
                    <Password
                        inputId="staff-pass"
                        v-model="staffForm.password"
                        :feedback="false"
                        toggleMask
                        placeholder="Nhập mật khẩu nhân viên"
                        fluid
                    />
                </div>

                <Button
                    type="submit"
                    label="Đăng nhập Cổng Quản lý"
                    icon="pi pi-briefcase"
                    :loading="authStore.loading"
                    fluid
                />
            </form>
        </template>
    </Card>
</template>
