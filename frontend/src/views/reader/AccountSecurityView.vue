<script setup>
import { ref, reactive } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import docGiaService from '@/services/docgia.service';
import { useAuthStore } from '@/stores/auth.store';

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
    matKhauCu: '',
    matKhauMoi: '',
    xacNhanMatKhau: '',
});

async function handleChangePassword() {
    errorMsg.value = '';
    if (!form.matKhauCu) {
        errorMsg.value = 'Vui lòng nhập mật khẩu hiện tại.';
        return;
    }
    if (!form.matKhauMoi || form.matKhauMoi.length < 6) {
        errorMsg.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        return;
    }
    if (form.matKhauMoi !== form.xacNhanMatKhau) {
        errorMsg.value = 'Mật khẩu xác nhận không khớp.';
        return;
    }

    loading.value = true;
    try {
        const res = await docGiaService.doiMatKhau(authStore.userId, {
            matKhauCu: form.matKhauCu,
            matKhauMoi: form.matKhauMoi,
        });
        form.matKhauCu = '';
        form.matKhauMoi = '';
        form.xacNhanMatKhau = '';
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: res.message || 'Đổi mật khẩu thành công.',
            life: 3500,
        });
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Card>
        <template #title>Bảo mật Tài khoản & Đổi Mật khẩu</template>
        <template #subtitle>
            Thay đổi mật khẩu định kỳ để bảo vệ tài khoản độc giả của bạn
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <form
                class="cr-flex-col cr-gap-md"
                style="max-width: 460px"
                @submit.prevent="handleChangePassword"
            >
                <div class="cr-field">
                    <label class="cr-label">Mật khẩu hiện tại *</label>
                    <Password
                        v-model="form.matKhauCu"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Mật khẩu mới * (tối thiểu 6 ký tự)</label>
                    <Password
                        v-model="form.matKhauMoi"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Xác nhận mật khẩu mới *</label>
                    <Password
                        v-model="form.xacNhanMatKhau"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                </div>
                <div>
                    <Button
                        type="submit"
                        label="Cập nhật Mật khẩu"
                        icon="pi pi-lock"
                        :loading="loading"
                    />
                </div>
            </form>
        </template>
    </Card>
</template>
