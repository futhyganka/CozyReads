<script setup>
import { ref } from 'vue';
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
import { REGEX } from '@/utils/constants';

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

async function handleSendResetOtp() {
    errorMsg.value = '';
    const normalized = email.value.trim().toLowerCase();
    if (!REGEX.EMAIL.test(normalized)) {
        errorMsg.value = 'Địa chỉ email không hợp lệ.';
        return;
    }

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
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleVerifyOtp() {
    errorMsg.value = '';
    if (!/^\d{6}$/.test(otp.value.trim())) {
        errorMsg.value = 'Vui lòng nhập mã OTP 6 chữ số.';
        return;
    }

    loading.value = true;
    try {
        const res = await authService.xacThucOtp(email.value, otp.value.trim());
        verificationToken.value = res.verificationToken || res.registrationToken;
        otp.value = '';
        activeStep.value = '3';
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleResetPassword() {
    errorMsg.value = '';
    if (!matKhauMoi.value || matKhauMoi.value.length < 6) {
        errorMsg.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        return;
    }
    if (matKhauMoi.value !== xacNhanMatKhau.value) {
        errorMsg.value = 'Mật khẩu xác nhận không khớp.';
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
                            @submit.prevent="handleSendResetOtp"
                        >
                            <div class="cr-field">
                                <label class="cr-label">Email tài khoản độc giả</label>
                                <InputText
                                    v-model="email"
                                    type="email"
                                    placeholder="nhapemail@example.com"
                                    fluid
                                />
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
                            @submit.prevent="handleVerifyOtp"
                        >
                            <Message severity="info" :closable="false">
                                Đã gửi mã OTP tới <strong>{{ email }}</strong>.
                            </Message>
                            <div class="cr-field">
                                <label class="cr-label">Mã OTP (6 chữ số)</label>
                                <InputText
                                    v-model="otp"
                                    maxlength="6"
                                    placeholder="Nhập 6 chữ số"
                                    fluid
                                />
                            </div>
                            <div class="cr-flex cr-gap-sm">
                                <Button
                                    type="button"
                                    label="Quay lại"
                                    severity="secondary"
                                    outlined
                                    @click="activeStep = '1'"
                                />
                                <Button
                                    type="submit"
                                    label="Xác nhận OTP"
                                    icon="pi pi-check"
                                    :loading="loading"
                                    fluid
                                />
                            </div>
                        </form>
                    </StepPanel>

                    <StepPanel value="3">
                        <form
                            class="cr-flex-col cr-gap-md"
                            @submit.prevent="handleResetPassword"
                        >
                            <div class="cr-field">
                                <label class="cr-label">Mật khẩu mới *</label>
                                <Password
                                    v-model="matKhauMoi"
                                    toggleMask
                                    :feedback="false"
                                    placeholder="Ít nhất 6 ký tự"
                                    fluid
                                />
                            </div>
                            <div class="cr-field">
                                <label class="cr-label">Nhập lại mật khẩu mới *</label>
                                <Password
                                    v-model="xacNhanMatKhau"
                                    toggleMask
                                    :feedback="false"
                                    placeholder="Xác nhận mật khẩu mới"
                                    fluid
                                />
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
