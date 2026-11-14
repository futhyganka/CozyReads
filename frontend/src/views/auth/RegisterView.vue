<script setup>
import { ref, reactive, onUnmounted } from 'vue';
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
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import authService from '@/services/auth.service';
import {
    LOAI_DOC_GIA_OPTIONS,
    GOI_GIA_HAN_OPTIONS,
    PHAI_OPTIONS,
    REGEX,
} from '@/utils/constants';

const router = useRouter();
const toast = useToast();

const activeStep = ref('1');
const loading = ref(false);
const errorMsg = ref('');
const cooldown = ref(0);
let timerId = null;

// Lưu trong bộ nhớ tạm của component, tuyệt đối không lưu vào localStorage
const otpCode = ref('');
const registrationToken = ref('');
const registeredResult = ref(null);

const form = reactive({
    email: '',
    hoLot: '',
    ten: '',
    dienThoai: '',
    password: '',
    confirmPassword: '',
    loaiDocGia: 'docGia_tuDo',
    chuKyThanhToan: '1_thang',
    ngaySinh: null,
    phai: 'khac',
    diaChi: '',
});

function startCooldown(seconds = 60) {
    cooldown.value = seconds;
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        if (cooldown.value > 0) {
            cooldown.value -= 1;
        } else {
            clearInterval(timerId);
        }
    }, 1000);
}

onUnmounted(() => {
    if (timerId) clearInterval(timerId);
});

async function handleSendOtp() {
    errorMsg.value = '';
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!REGEX.EMAIL.test(trimmedEmail)) {
        errorMsg.value = 'Vui lòng nhập địa chỉ email hợp lệ.';
        return;
    }

    loading.value = true;
    try {
        const res = await authService.guiOtpDangKy(trimmedEmail);
        form.email = trimmedEmail;
        startCooldown(60);
        toast.add({
            severity: 'success',
            summary: 'Đã gửi mã OTP',
            detail: res.message || 'Vui lòng kiểm tra hộp thư email của bạn.',
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
    const trimmedOtp = otpCode.value.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
        errorMsg.value = 'Mã OTP phải gồm đúng 6 chữ số.';
        return;
    }

    loading.value = true;
    try {
        const res = await authService.xacThucOtp(form.email, trimmedOtp);
        registrationToken.value = res.registrationToken || res.verificationToken;
        otpCode.value = '';
        toast.add({
            severity: 'success',
            summary: 'Xác thực thành công',
            detail: 'Email đã được xác thực. Vui lòng hoàn tất hồ sơ độc giả.',
            life: 3000,
        });
        activeStep.value = '3';
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleCompleteRegistration() {
    errorMsg.value = '';
    if (!form.hoLot.trim() || !form.ten.trim()) {
        errorMsg.value = 'Họ lót và tên là bắt buộc.';
        return;
    }
    if (!REGEX.SO_DIEN_THOAI.test(form.dienThoai.trim())) {
        errorMsg.value =
            'Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
        return;
    }
    if (!form.password || form.password.length < 6) {
        errorMsg.value = 'Mật khẩu phải có ít nhất 6 ký tự.';
        return;
    }
    if (form.password !== form.confirmPassword) {
        errorMsg.value = 'Mật khẩu xác nhận không khớp.';
        return;
    }

    loading.value = true;
    try {
        const payload = {
            registrationToken: registrationToken.value,
            email: form.email,
            hoLot: form.hoLot.trim(),
            ten: form.ten.trim(),
            dienThoai: form.dienThoai.trim(),
            password: form.password,
            loaiDocGia: form.loaiDocGia,
            chuKyThanhToan:
                form.loaiDocGia === 'docGia_tuDo'
                    ? form.chuKyThanhToan
                    : '6_thang_mien_phi',
            ngaySinh: form.ngaySinh || null,
            phai: form.phai,
            diaChi: form.diaChi.trim(),
        };

        const res = await authService.dangKyDocGia(payload);
        registeredResult.value = res;
        registrationToken.value = '';
        form.password = '';
        form.confirmPassword = '';
        toast.add({
            severity: 'success',
            summary: 'Đăng ký thành công',
            detail: `Mã độc giả của bạn là ${res.maDocGia}`,
            life: 5000,
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
        <template #title>
            <div style="text-align: center">Đăng ký Thẻ Độc giả CozyReads</div>
        </template>
        <template #subtitle>
            <div style="text-align: center">
                Xác thực email qua OTP và nhận ngay 100 điểm uy tín ban đầu
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

            <div
                v-if="registeredResult"
                class="cr-flex-col cr-gap-md"
                style="text-align: center; padding: 1rem 0"
            >
                <Message severity="success" :closable="false">
                    Chúc mừng <strong>{{ registeredResult.hoTen }}</strong> đã đăng ký thẻ độc giả thành công!
                </Message>
                <div class="cr-flex-col cr-gap-xs cr-flex-center">
                    <span class="cr-muted">Mã thẻ độc giả của bạn:</span>
                    <Tag :value="registeredResult.maDocGia" severity="success" style="font-size: 1.2rem; padding: 0.5rem 1rem" />
                    <span class="cr-muted">Email: {{ registeredResult.email }}</span>
                </div>
                <Button
                    label="Đăng nhập ngay"
                    icon="pi pi-sign-in"
                    @click="router.push('/dang-nhap')"
                />
            </div>

            <Stepper v-else v-model:value="activeStep" linear>
                <StepList>
                    <Step value="1">1. Email</Step>
                    <Step value="2">2. Mã OTP</Step>
                    <Step value="3">3. Hồ sơ</Step>
                </StepList>

                <StepPanels>
                    <StepPanel value="1">
                        <form
                            class="cr-flex-col cr-gap-md"
                            @submit.prevent="handleSendOtp"
                        >
                            <div class="cr-field">
                                <label class="cr-label" for="reg-email">
                                    Địa chỉ Email xác thực
                                </label>
                                <InputText
                                    id="reg-email"
                                    v-model="form.email"
                                    type="email"
                                    placeholder="nhapemail@example.com"
                                    fluid
                                />
                                <span class="cr-muted">
                                    Hệ thống sẽ gửi mã OTP 6 chữ số có hiệu lực trong 5 phút tới email này.
                                </span>
                            </div>

                            <Button
                                type="submit"
                                label="Gửi mã xác thực OTP"
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
                                Mã OTP đã được gửi đến <strong>{{ form.email }}</strong>.
                            </Message>

                            <div class="cr-field">
                                <label class="cr-label" for="reg-otp">
                                    Mã OTP (6 chữ số)
                                </label>
                                <InputText
                                    id="reg-otp"
                                    v-model="otpCode"
                                    maxlength="6"
                                    placeholder="Nhập 6 chữ số OTP"
                                    fluid
                                />
                            </div>

                            <div class="cr-flex cr-gap-sm">
                                <Button
                                    type="button"
                                    label="Đổi Email"
                                    icon="pi pi-arrow-left"
                                    severity="secondary"
                                    outlined
                                    @click="activeStep = '1'"
                                />
                                <Button
                                    type="button"
                                    :label="
                                        cooldown > 0
                                            ? `Gửi lại (${cooldown}s)`
                                            : 'Gửi lại OTP'
                                    "
                                    icon="pi pi-refresh"
                                    severity="secondary"
                                    outlined
                                    :disabled="cooldown > 0 || loading"
                                    @click="handleSendOtp"
                                />
                                <Button
                                    type="submit"
                                    label="Xác thực OTP"
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
                            @submit.prevent="handleCompleteRegistration"
                        >
                            <div class="cr-form-grid">
                                <div class="cr-field">
                                    <label class="cr-label">Họ và tên lót *</label>
                                    <InputText
                                        v-model="form.hoLot"
                                        placeholder="VD: Nguyễn Văn"
                                        fluid
                                    />
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Tên *</label>
                                    <InputText
                                        v-model="form.ten"
                                        placeholder="VD: An"
                                        fluid
                                    />
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Số điện thoại *</label>
                                    <InputText
                                        v-model="form.dienThoai"
                                        maxlength="10"
                                        placeholder="09xxxxxxxx"
                                        fluid
                                    />
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Giới tính</label>
                                    <Select
                                        v-model="form.phai"
                                        :options="PHAI_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        fluid
                                    />
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Ngày sinh</label>
                                    <DatePicker
                                        v-model="form.ngaySinh"
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        fluid
                                    />
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Đối tượng độc giả</label>
                                    <Select
                                        v-model="form.loaiDocGia"
                                        :options="LOAI_DOC_GIA_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        fluid
                                    />
                                </div>

                                <div
                                    v-if="form.loaiDocGia === 'docGia_tuDo'"
                                    class="cr-field cr-field-full"
                                >
                                    <label class="cr-label">Chu kỳ gói thẻ tự do</label>
                                    <Select
                                        v-model="form.chuKyThanhToan"
                                        :options="GOI_GIA_HAN_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        fluid
                                    />
                                </div>

                                <div class="cr-field cr-field-full">
                                    <label class="cr-label">Địa chỉ</label>
                                    <InputText
                                        v-model="form.diaChi"
                                        placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                                        fluid
                                    />
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Mật khẩu *</label>
                                    <Password
                                        v-model="form.password"
                                        toggleMask
                                        :feedback="false"
                                        placeholder="Tối thiểu 6 ký tự"
                                        fluid
                                    />
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Xác nhận mật khẩu *</label>
                                    <Password
                                        v-model="form.confirmPassword"
                                        toggleMask
                                        :feedback="false"
                                        placeholder="Nhập lại mật khẩu"
                                        fluid
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                label="Hoàn tất Đăng ký Độc giả"
                                icon="pi pi-user-plus"
                                :loading="loading"
                                fluid
                            />
                        </form>
                    </StepPanel>
                </StepPanels>
            </Stepper>

            <div class="cr-muted" style="text-align: center; margin-top: 1rem">
                Đã có tài khoản?
                <router-link to="/dang-nhap">Đăng nhập ngay</router-link>
            </div>
        </template>
    </Card>
</template>
