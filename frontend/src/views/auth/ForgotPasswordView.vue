<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import authService from '@/services/auth.service';
import { REGEX, validatePasswordStrength } from '@/utils/constants';

const router = useRouter();
const toast = useToast();

const activeStep = ref('1');
const loading = ref(false);
const errorMsg = ref('');

const email = ref('');
const otp = ref('');
const verificationToken = ref('');
const matKhauMoi = ref('');
const xacNhanMatKhau = ref('');

const errors = reactive({
    email: '',
    otp: '',
    matKhauMoi: '',
    xacNhanMatKhau: '',
});

function validateField(field) {
    switch (field) {
        case 'email': {
            const val = email.value.trim().toLowerCase();
            if (!val) {
                errors.email = 'Vui lòng nhập địa chỉ email.';
            } else if (!REGEX.EMAIL.test(val)) {
                errors.email = 'Địa chỉ email không hợp lệ.';
            } else {
                errors.email = '';
            }
            return !errors.email;
        }
        case 'otp': {
            const val = otp.value.trim();
            if (!val) {
                errors.otp = 'Vui lòng nhập mã OTP.';
            } else if (!/^\d{6}$/.test(val)) {
                errors.otp = 'Mã OTP phải gồm đúng 6 chữ số.';
            } else {
                errors.otp = '';
            }
            return !errors.otp;
        }
        case 'matKhauMoi': {
            errors.matKhauMoi = validatePasswordStrength(
                matKhauMoi.value,
                'Mật khẩu mới',
            );
            if (xacNhanMatKhau.value) {
                errors.xacNhanMatKhau =
                    xacNhanMatKhau.value !== matKhauMoi.value
                        ? 'Mật khẩu xác nhận không khớp.'
                        : '';
            }
            return !errors.matKhauMoi;
        }
        case 'xacNhanMatKhau': {
            if (!xacNhanMatKhau.value) {
                errors.xacNhanMatKhau = 'Vui lòng nhập lại mật khẩu mới.';
            } else if (xacNhanMatKhau.value !== matKhauMoi.value) {
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

async function handleSendResetOtp() {
    errorMsg.value = '';
    if (!validateField('email')) {
        return;
    }
    const normalized = email.value.trim().toLowerCase();

    loading.value = true;
    try {
        const res = await authService.guiOtpQuenMatKhau(normalized);
        email.value = normalized;
        toast.add({
            severity: 'success',
            summary: 'Đã gửi mã OTP',
            detail: res.message || 'Vui lòng kiểm tra email để lấy mã OTP.',
            life: 4000,
        });
        activeStep.value = '2';
    } catch (err) {
        errors.email = err.message;
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleVerifyOtp() {
    errorMsg.value = '';
    if (!validateField('otp')) {
        return;
    }

    loading.value = true;
    try {
        const res = await authService.xacThucOtp(email.value, otp.value.trim());
        verificationToken.value = res.verificationToken || res.registrationToken;
        otp.value = '';
        errors.otp = '';
        activeStep.value = '3';
    } catch (err) {
        errors.otp = err.message;
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleResetPassword() {
    errorMsg.value = '';
    const v1 = validateField('matKhauMoi');
    const v2 = validateField('xacNhanMatKhau');
    if (!v1 || !v2) {
        return;
    }

    loading.value = true;
    try {
        const res = await authService.datLaiMatKhau({
            email: email.value,
            verificationToken: verificationToken.value,
            matKhauMoi: matKhauMoi.value,
        });
        verificationToken.value = '';
        matKhauMoi.value = '';
        xacNhanMatKhau.value = '';
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: res.message || 'Đặt lại mật khẩu thành công.',
            life: 4000,
        });
        router.push('/dang-nhap');
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Card>
        <template #title>
            <div style="text-align: center">Khôi phục Mật khẩu Độc giả</div>
        </template>
        <template #subtitle>
            <div style="text-align: center">
                Xác thực OTP qua email đã đăng ký để đặt lại mật khẩu mới
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

            <Stepper v-model:value="activeStep" linear>
                <StepList>
                    <Step value="1">1. Nhập Email</Step>
                    <Step value="2">2. Xác thực OTP</Step>
                    <Step value="3">3. Mật khẩu mới</Step>
                </StepList>

                <StepPanels>
                    <StepPanel value="1">
                        <form
                            class="cr-flex-col cr-gap-md"
                            novalidate
                            @submit.prevent="handleSendResetOtp"
                        >
                            <div class="cr-field">
                                <label class="cr-label">Email tài khoản độc giả *</label>
                                <InputText
                                    v-model="email"
                                    type="email"
                                    placeholder="nhapemail@example.com"
                                    :invalid="!!errors.email"
                                    :class="{ 'cr-input-invalid': !!errors.email }"
                                    fluid
                                    @update:modelValue="validateField('email')"
                                    @blur="validateField('email')"
                                />
                                <small v-if="errors.email" class="cr-error">
                                    {{ errors.email }}
                                </small>
                            </div>
                            <Button
                                type="submit"
                                label="Gửi mã OTP khôi phục"
                                icon="pi pi-send"
                                :loading="loading"
                                fluid
                            />
                        </form>
                    </StepPanel>

                    <StepPanel value="2">
                        <form
                            class="cr-flex-col cr-gap-md"
                            novalidate
                            @submit.prevent="handleVerifyOtp"
                        >
                            <Message severity="info" :closable="false">
                                Đã gửi mã OTP tới <strong>{{ email }}</strong>.
                            </Message>
                            <div class="cr-field">
                                <label class="cr-label">Mã OTP (6 chữ số) *</label>
                                <InputText
                                    v-model="otp"
                                    maxlength="6"
                                    placeholder="Nhập 6 chữ số"
                                    :invalid="!!errors.otp"
                                    :class="{ 'cr-input-invalid': !!errors.otp }"
                                    fluid
                                    @update:modelValue="validateField('otp')"
                                    @blur="validateField('otp')"
                                />
                                <small v-if="errors.otp" class="cr-error">
                                    {{ errors.otp }}
                                </small>
                            </div>
                            <div class="cr-flex-col cr-gap-sm">
                                <Button
                                    type="submit"
                                    label="Xác nhận OTP"
                                    icon="pi pi-check"
                                    :loading="loading"
                                    fluid
                                />
                                <Button
                                    type="button"
                                    label="Quay lại đổi Email"
                                    icon="pi pi-arrow-left"
                                    severity="secondary"
                                    outlined
                                    fluid
                                    @click="activeStep = '1'"
                                />
                            </div>
                        </form>
                    </StepPanel>

                    <StepPanel value="3">
                        <form
                            class="cr-flex-col cr-gap-md"
                            novalidate
                            @submit.prevent="handleResetPassword"
                        >
                            <div class="cr-field">
                                <label class="cr-label">Mật khẩu mới *</label>
                                <Password
                                    v-model="matKhauMoi"
                                    toggleMask
                                    :feedback="false"
                                    placeholder="Từ 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt"
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
                                <label class="cr-label">Nhập lại mật khẩu mới *</label>
                                <Password
                                    v-model="xacNhanMatKhau"
                                    toggleMask
                                    :feedback="false"
                                    placeholder="Xác nhận mật khẩu mới"
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
                            <Button
                                type="submit"
                                label="Đặt lại Mật khẩu"
                                icon="pi pi-check-circle"
                                :loading="loading"
                                fluid
                            />
                        </form>
                    </StepPanel>
                </StepPanels>
            </Stepper>

            <div class="cr-muted" style="text-align: center; margin-top: 1rem">
                Nhớ mật khẩu?
                <router-link to="/dang-nhap">Quay lại Đăng nhập</router-link>
            </div>
        </template>
    </Card>
</template>
