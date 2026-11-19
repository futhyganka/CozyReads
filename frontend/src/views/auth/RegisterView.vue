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
    PHAI_OPTIONS,
    REGEX,
    validatePasswordStrength,
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
    ngaySinh: null,
    phai: 'khac',
    diaChi: '',
});

const errors = reactive({
    email: '',
    otpCode: '',
    hoLot: '',
    ten: '',
    dienThoai: '',
    phai: '',
    ngaySinh: '',
    loaiDocGia: '',
    diaChi: '',
    password: '',
    confirmPassword: '',
});

function validateField(field) {
    switch (field) {
        case 'email': {
            const val = form.email.trim();
            if (!val) {
                errors.email = 'Vui lòng nhập địa chỉ email.';
            } else if (!REGEX.EMAIL.test(val.toLowerCase())) {
                errors.email = 'Địa chỉ email không hợp lệ (VD: tenban@example.com).';
            } else {
                errors.email = '';
            }
            return !errors.email;
        }
        case 'otpCode': {
            const val = otpCode.value.trim();
            if (!val) {
                errors.otpCode = 'Vui lòng nhập mã xác thực OTP.';
            } else if (!/^\d{6}$/.test(val)) {
                errors.otpCode = 'Mã OTP phải gồm đúng 6 chữ số.';
            } else {
                errors.otpCode = '';
            }
            return !errors.otpCode;
        }
        case 'hoLot': {
            errors.hoLot = !form.hoLot.trim()
                ? 'Vui lòng nhập họ và tên lót.'
                : '';
            return !errors.hoLot;
        }
        case 'ten': {
            errors.ten = !form.ten.trim() ? 'Vui lòng nhập tên.' : '';
            return !errors.ten;
        }
        case 'dienThoai': {
            const val = form.dienThoai.trim();
            if (!val) {
                errors.dienThoai = 'Vui lòng nhập số điện thoại.';
            } else if (!REGEX.SO_DIEN_THOAI.test(val)) {
                errors.dienThoai =
                    'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
            } else {
                errors.dienThoai = '';
            }
            return !errors.dienThoai;
        }
        case 'ngaySinh': {
            if (form.ngaySinh && new Date(form.ngaySinh) > new Date()) {
                errors.ngaySinh = 'Ngày sinh không được lớn hơn ngày hiện tại.';
            } else {
                errors.ngaySinh = '';
            }
            return !errors.ngaySinh;
        }
        case 'password': {
            errors.password = validatePasswordStrength(form.password, 'Mật khẩu');
            if (form.confirmPassword) {
                errors.confirmPassword =
                    form.confirmPassword !== form.password
                        ? 'Mật khẩu xác nhận không khớp.'
                        : '';
            }
            return !errors.password;
        }
        case 'confirmPassword': {
            if (!form.confirmPassword) {
                errors.confirmPassword = 'Vui lòng nhập xác nhận mật khẩu.';
            } else if (form.confirmPassword !== form.password) {
                errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
            } else {
                errors.confirmPassword = '';
            }
            return !errors.confirmPassword;
        }
        default:
            errors[field] = '';
            return true;
    }
}

function validateStep3() {
    const fields = [
        'hoLot',
        'ten',
        'dienThoai',
        'ngaySinh',
        'password',
        'confirmPassword',
    ];
    let isValid = true;
    for (const f of fields) {
        if (!validateField(f)) {
            isValid = false;
        }
    }
    return isValid;
}

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
    if (!validateField('email')) {
        return;
    }
    const trimmedEmail = form.email.trim().toLowerCase();

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
        errors.email = err.message;
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleVerifyOtp() {
    errorMsg.value = '';
    if (!validateField('otpCode')) {
        return;
    }
    const trimmedOtp = otpCode.value.trim();

    loading.value = true;
    try {
        const res = await authService.xacThucOtp(form.email, trimmedOtp);
        registrationToken.value = res.registrationToken || res.verificationToken;
        otpCode.value = '';
        errors.otpCode = '';
        toast.add({
            severity: 'success',
            summary: 'Xác thực thành công',
            detail: 'Email đã được xác thực. Vui lòng hoàn tất hồ sơ độc giả.',
            life: 3000,
        });
        activeStep.value = '3';
    } catch (err) {
        errors.otpCode = err.message;
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleCompleteRegistration() {
    errorMsg.value = '';
    if (!validateStep3()) {
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
            <div style="text-align: center">Đăng ký thẻ độc giả CozyReads</div>
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
                <Message
                    v-if="form.loaiDocGia === 'docGia_tuDo'"
                    severity="info"
                    :closable="false"
                    style="text-align: left"
                >
                    Đối với <strong>Độc giả tự do</strong>, sau khi đăng nhập vui lòng vào hồ sơ chọn mục <strong>Thẻ & Điểm uy tín</strong> trong <strong>Tài khoản & Thẻ thư viện</strong> để chọn gói thẻ và hoàn tất thanh toán hoặc thực hiện tạo thẻ trực tiếp tại quầy để sử dụng dịch vụ thư viện.
                </Message>
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
                            novalidate
                            @submit.prevent="handleSendOtp"
                        >
                            <div class="cr-field">
                                <label class="cr-label" for="reg-email">
                                    Địa chỉ Email xác thực *
                                </label>
                                <InputText
                                    id="reg-email"
                                    v-model="form.email"
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
                            novalidate
                            @submit.prevent="handleVerifyOtp"
                        >
                            <Message severity="info" :closable="false">
                                Mã OTP đã được gửi đến <strong>{{ form.email }}</strong>.
                            </Message>

                            <div class="cr-field">
                                <label class="cr-label" for="reg-otp">
                                    Mã OTP (6 chữ số) *
                                </label>
                                <InputText
                                    id="reg-otp"
                                    v-model="otpCode"
                                    maxlength="6"
                                    placeholder="Nhập 6 chữ số OTP"
                                    :invalid="!!errors.otpCode"
                                    :class="{ 'cr-input-invalid': !!errors.otpCode }"
                                    fluid
                                    @update:modelValue="validateField('otpCode')"
                                    @blur="validateField('otpCode')"
                                />
                                <small v-if="errors.otpCode" class="cr-error">
                                    {{ errors.otpCode }}
                                </small>
                            </div>

                            <div class="cr-flex-col cr-gap-sm">
                                <Button
                                    type="submit"
                                    label="Xác thực OTP"
                                    icon="pi pi-check"
                                    :loading="loading"
                                    fluid
                                />
                                <div class="cr-grid-2 cr-gap-sm">
                                    <Button
                                        type="button"
                                        label="Đổi email"
                                        icon="pi pi-arrow-left"
                                        severity="secondary"
                                        outlined
                                        fluid
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
                                        fluid
                                        :disabled="cooldown > 0 || loading"
                                        @click="handleSendOtp"
                                    />
                                </div>
                            </div>
                        </form>
                    </StepPanel>

                    <StepPanel value="3">
                        <form
                            class="cr-flex-col cr-gap-md"
                            novalidate
                            @submit.prevent="handleCompleteRegistration"
                        >
                            <div class="cr-form-grid">
                                <div class="cr-field">
                                    <label class="cr-label">Họ và tên lót *</label>
                                    <InputText
                                        v-model="form.hoLot"
                                        placeholder="VD: Nguyễn Văn"
                                        :invalid="!!errors.hoLot"
                                        :class="{ 'cr-input-invalid': !!errors.hoLot }"
                                        fluid
                                        @update:modelValue="validateField('hoLot')"
                                        @blur="validateField('hoLot')"
                                    />
                                    <small v-if="errors.hoLot" class="cr-error">
                                        {{ errors.hoLot }}
                                    </small>
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Tên *</label>
                                    <InputText
                                        v-model="form.ten"
                                        placeholder="VD: An"
                                        :invalid="!!errors.ten"
                                        :class="{ 'cr-input-invalid': !!errors.ten }"
                                        fluid
                                        @update:modelValue="validateField('ten')"
                                        @blur="validateField('ten')"
                                    />
                                    <small v-if="errors.ten" class="cr-error">
                                        {{ errors.ten }}
                                    </small>
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Số điện thoại *</label>
                                    <InputText
                                        v-model="form.dienThoai"
                                        maxlength="10"
                                        placeholder="10 chữ số (bắt đầu 03, 05, 07, 08, 09)"
                                        :invalid="!!errors.dienThoai"
                                        :class="{ 'cr-input-invalid': !!errors.dienThoai }"
                                        fluid
                                        @update:modelValue="validateField('dienThoai')"
                                        @blur="validateField('dienThoai')"
                                    />
                                    <small v-if="errors.dienThoai" class="cr-error">
                                        {{ errors.dienThoai }}
                                    </small>
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Giới tính</label>
                                    <Select
                                        v-model="form.phai"
                                        :options="PHAI_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        :invalid="!!errors.phai"
                                        :class="{ 'cr-input-invalid': !!errors.phai }"
                                        fluid
                                        @update:modelValue="validateField('phai')"
                                    />
                                    <small v-if="errors.phai" class="cr-error">
                                        {{ errors.phai }}
                                    </small>
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Ngày sinh</label>
                                    <DatePicker
                                        v-model="form.ngaySinh"
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        :invalid="!!errors.ngaySinh"
                                        :class="{ 'cr-input-invalid': !!errors.ngaySinh }"
                                        fluid
                                        @update:modelValue="validateField('ngaySinh')"
                                    />
                                    <small v-if="errors.ngaySinh" class="cr-error">
                                        {{ errors.ngaySinh }}
                                    </small>
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Đối tượng độc giả</label>
                                    <Select
                                        v-model="form.loaiDocGia"
                                        :options="LOAI_DOC_GIA_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        :invalid="!!errors.loaiDocGia"
                                        :class="{ 'cr-input-invalid': !!errors.loaiDocGia }"
                                        fluid
                                        @update:modelValue="validateField('loaiDocGia')"
                                    />
                                    <small v-if="errors.loaiDocGia" class="cr-error">
                                        {{ errors.loaiDocGia }}
                                    </small>
                                </div>

                                <div class="cr-field cr-field-full">
                                    <label class="cr-label">Địa chỉ</label>
                                    <InputText
                                        v-model="form.diaChi"
                                        placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                                        :invalid="!!errors.diaChi"
                                        :class="{ 'cr-input-invalid': !!errors.diaChi }"
                                        fluid
                                        @update:modelValue="validateField('diaChi')"
                                        @blur="validateField('diaChi')"
                                    />
                                    <small v-if="errors.diaChi" class="cr-error">
                                        {{ errors.diaChi }}
                                    </small>
                                </div>

                                <div class="cr-field">
                                    <label class="cr-label">Mật khẩu *</label>
                                    <Password
                                        v-model="form.password"
                                        toggleMask
                                        :feedback="false"
                                        placeholder="Từ 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt"
                                        :invalid="!!errors.password"
                                        :class="{ 'cr-input-invalid': !!errors.password }"
                                        fluid
                                        @update:modelValue="validateField('password')"
                                        @blur="validateField('password')"
                                    />
                                    <small v-if="errors.password" class="cr-error">
                                        {{ errors.password }}
                                    </small>
                                </div>
                                <div class="cr-field">
                                    <label class="cr-label">Xác nhận mật khẩu *</label>
                                    <Password
                                        v-model="form.confirmPassword"
                                        toggleMask
                                        :feedback="false"
                                        placeholder="Nhập lại mật khẩu"
                                        :invalid="!!errors.confirmPassword"
                                        :class="{ 'cr-input-invalid': !!errors.confirmPassword }"
                                        fluid
                                        @update:modelValue="validateField('confirmPassword')"
                                        @blur="validateField('confirmPassword')"
                                    />
                                    <small v-if="errors.confirmPassword" class="cr-error">
                                        {{ errors.confirmPassword }}
                                    </small>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                label="Hoàn tất đăng ký độc giả"
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
