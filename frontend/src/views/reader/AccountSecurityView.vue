<script setup>
import { ref, reactive } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import docGiaService from '@/services/docgia.service';
import { useAuthStore } from '@/stores/auth.store';
import { validatePasswordStrength } from '@/utils/constants';

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
    matKhauCu: '',
    matKhauMoi: '',
    xacNhanMatKhau: '',
});

const errors = reactive({
    matKhauCu: '',
    matKhauMoi: '',
    xacNhanMatKhau: '',
});

function validateField(field) {
    switch (field) {
        case 'matKhauCu': {
            errors.matKhauCu = !form.matKhauCu
                ? 'Vui lòng nhập mật khẩu hiện tại.'
                : '';
            return !errors.matKhauCu;
        }
        case 'matKhauMoi': {
            errors.matKhauMoi = validatePasswordStrength(
                form.matKhauMoi,
                'Mật khẩu mới',
            );
            if (form.xacNhanMatKhau) {
                errors.xacNhanMatKhau =
                    form.xacNhanMatKhau !== form.matKhauMoi
                        ? 'Mật khẩu xác nhận không khớp.'
                        : '';
            }
            return !errors.matKhauMoi;
        }
        case 'xacNhanMatKhau': {
            if (!form.xacNhanMatKhau) {
                errors.xacNhanMatKhau = 'Vui lòng nhập xác nhận mật khẩu mới.';
            } else if (form.xacNhanMatKhau !== form.matKhauMoi) {
                errors.xacNhanMatKhau = 'Mật khẩu xác nhận không khớp.';
            } else {
                errors.xacNhanMatKhau = '';
            }
            return !errors.xacNhanMatKhau;
        }
        default:
            return true;
    }
}

async function handleChangePassword() {
    errorMsg.value = '';
    const v1 = validateField('matKhauCu');
    const v2 = validateField('matKhauMoi');
    const v3 = validateField('xacNhanMatKhau');
    if (!v1 || !v2 || !v3) {
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
        errors.matKhauCu = '';
        errors.matKhauMoi = '';
        errors.xacNhanMatKhau = '';
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: res.message || 'Đổi mật khẩu thành công.',
            life: 3500,
        });
    } catch (err) {
        if (err.message?.toLowerCase().includes('mật khẩu cũ')) {
            errors.matKhauCu = err.message;
        }
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
                novalidate
                @submit.prevent="handleChangePassword"
            >
                <div class="cr-field">
                    <label class="cr-label">Mật khẩu hiện tại *</label>
                    <Password
                        v-model="form.matKhauCu"
                        :feedback="false"
                        toggleMask
                        :invalid="!!errors.matKhauCu"
                        :class="{ 'cr-input-invalid': !!errors.matKhauCu }"
                        fluid
                        @update:modelValue="validateField('matKhauCu')"
                        @blur="validateField('matKhauCu')"
                    />
                    <small v-if="errors.matKhauCu" class="cr-error">
                        {{ errors.matKhauCu }}
                    </small>
                </div>
                <div class="cr-field">
                    <label class="cr-label">Mật khẩu mới * (từ 8 ký tự, hoa, thường, số, ký tự đặc biệt)</label>
                    <Password
                        v-model="form.matKhauMoi"
                        :feedback="false"
                        toggleMask
                        :invalid="!!errors.matKhauMoi"
                        :class="{ 'cr-input-invalid': !!errors.matKhauMoi }"
                        fluid
                        @update:modelValue="validateField('matKhauMoi')"
                        @blur="validateField('matKhauMoi')"
                    />
                    <small v-if="errors.matKhauMoi" class="cr-error">
                        {{ errors.matKhauMoi }}
                    </small>
                </div>
                <div class="cr-field">
                    <label class="cr-label">Xác nhận mật khẩu mới *</label>
                    <Password
                        v-model="form.xacNhanMatKhau"
                        :feedback="false"
                        toggleMask
                        :invalid="!!errors.xacNhanMatKhau"
                        :class="{ 'cr-input-invalid': !!errors.xacNhanMatKhau }"
                        fluid
                        @update:modelValue="validateField('xacNhanMatKhau')"
                        @blur="validateField('xacNhanMatKhau')"
                    />
                    <small v-if="errors.xacNhanMatKhau" class="cr-error">
                        {{ errors.xacNhanMatKhau }}
                    </small>
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
