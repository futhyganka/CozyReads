<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import docGiaService from '@/services/docgia.service';
import authService from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { PHAI_OPTIONS, REGEX } from '@/utils/constants';
import { readImageFileAsDataUrl } from '@/utils/imageUpload';
import AvatarCropperDialog from '@/components/common/AvatarCropperDialog.vue';

const toast = useToast();
const authStore = useAuthStore();

const saving = ref(false);
const errorMsg = ref('');
const avatarFileInput = ref(null);
const selectedAvatarFileName = ref('');
const cropperVisible = ref(false);
const rawAvatarForCrop = ref('');

async function handleAvatarFileChange(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    errors.avatar = '';
    try {
        const dataUrl = await readImageFileAsDataUrl(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.92,
        });
        selectedAvatarFileName.value = file.name;
        rawAvatarForCrop.value = dataUrl;
        cropperVisible.value = true;
    } catch (err) {
        errors.avatar = err.message;
    } finally {
        if (event.target) event.target.value = '';
    }
}

function handleConfirmAvatarCrop(croppedDataUrl) {
    form.avatar = croppedDataUrl;
}

function openRecropAvatar() {
    if (!form.avatar) return;
    rawAvatarForCrop.value = form.avatar;
    cropperVisible.value = true;
}

function clearAvatarFile() {
    form.avatar = '';
    rawAvatarForCrop.value = '';
    selectedAvatarFileName.value = '';
    errors.avatar = '';
    if (avatarFileInput.value) avatarFileInput.value.value = '';
}

const form = reactive({
    hoLot: '',
    ten: '',
    dienThoai: '',
    ngaySinh: null,
    phai: 'khac',
    diaChi: '',
    avatar: '',
});

const errors = reactive({
    hoLot: '',
    ten: '',
    dienThoai: '',
    ngaySinh: '',
    phai: '',
    diaChi: '',
    avatar: '',
    emailMoi: '',
    otpDoiEmail: '',
});

// Đổi email qua OTP
const emailDialogVisible = ref(false);
const emailStep = ref(1);
const emailLoading = ref(false);
const emailError = ref('');
const emailMoi = ref('');
const otpDoiEmail = ref('');

function validateField(field) {
    switch (field) {
        case 'hoLot':
            errors.hoLot = !form.hoLot.trim()
                ? 'Vui lòng nhập họ và tên lót.'
                : '';
            return !errors.hoLot;
        case 'ten':
            errors.ten = !form.ten.trim() ? 'Vui lòng nhập tên.' : '';
            return !errors.ten;
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
        case 'ngaySinh':
            errors.ngaySinh =
                form.ngaySinh && new Date(form.ngaySinh) > new Date()
                    ? 'Ngày sinh không được lớn hơn ngày hiện tại.'
                    : '';
            return !errors.ngaySinh;
        case 'emailMoi': {
            const val = emailMoi.value.trim().toLowerCase();
            if (!val) {
                errors.emailMoi = 'Vui lòng nhập địa chỉ email mới.';
            } else if (!REGEX.EMAIL.test(val)) {
                errors.emailMoi = 'Địa chỉ email mới không hợp lệ.';
            } else {
                errors.emailMoi = '';
            }
            return !errors.emailMoi;
        }
        case 'otpDoiEmail': {
            const val = otpDoiEmail.value.trim();
            if (!val) {
                errors.otpDoiEmail = 'Vui lòng nhập mã OTP.';
            } else if (!/^\d{6}$/.test(val)) {
                errors.otpDoiEmail = 'Mã OTP phải gồm đúng 6 chữ số.';
            } else {
                errors.otpDoiEmail = '';
            }
            return !errors.otpDoiEmail;
        }
        default:
            errors[field] = '';
            return true;
    }
}

function syncFormFromStore() {
    const p = authStore.userProfile;
    if (!p) return;
    form.hoLot = p.hoLot || '';
    form.ten = p.ten || '';
    form.dienThoai = p.dienThoai || '';
    form.ngaySinh = p.ngaySinh ? new Date(p.ngaySinh) : null;
    form.phai = p.phai || 'khac';
    form.diaChi = p.diaChi || '';
    form.avatar = p.avatar || '';
}

async function handleSaveProfile() {
    errorMsg.value = '';
    const v1 = validateField('hoLot');
    const v2 = validateField('ten');
    const v3 = validateField('dienThoai');
    const v4 = validateField('ngaySinh');
    if (!v1 || !v2 || !v3 || !v4) {
        return;
    }

    saving.value = true;
    try {
        await docGiaService.capNhatDocGia(authStore.userId, {
            hoLot: form.hoLot.trim(),
            ten: form.ten.trim(),
            dienThoai: form.dienThoai.trim(),
            ngaySinh: form.ngaySinh || null,
            phai: form.phai,
            diaChi: form.diaChi.trim(),
            avatar: form.avatar.trim(),
        });
        await authStore.refreshProfile();
        syncFormFromStore();
        toast.add({
            severity: 'success',
            summary: 'Đã lưu hồ sơ',
            detail: 'Cập nhật thông tin cá nhân thành công.',
            life: 3000,
        });
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        saving.value = false;
    }
}

function openEmailDialog() {
    emailMoi.value = '';
    otpDoiEmail.value = '';
    emailStep.value = 1;
    emailError.value = '';
    errors.emailMoi = '';
    errors.otpDoiEmail = '';
    emailDialogVisible.value = true;
}

async function handleSendChangeEmailOtp() {
    emailError.value = '';
    if (!validateField('emailMoi')) {
        return;
    }
    const targetEmail = emailMoi.value.trim().toLowerCase();

    emailLoading.value = true;
    try {
        const res = await docGiaService.guiOtpDoiEmail(
            authStore.userId,
            targetEmail,
        );
        emailMoi.value = targetEmail;
        emailStep.value = 2;
        toast.add({
            severity: 'info',
            summary: 'Đã gửi OTP',
            detail: res.message,
            life: 3500,
        });
    } catch (err) {
        errors.emailMoi = err.message;
        emailError.value = err.message;
    } finally {
        emailLoading.value = false;
    }
}

async function handleVerifyAndChangeEmail() {
    emailError.value = '';
    if (!validateField('otpDoiEmail')) {
        return;
    }

    emailLoading.value = true;
    try {
        const otpRes = await authService.xacThucOtp(
            emailMoi.value,
            otpDoiEmail.value.trim(),
        );
        const token = otpRes.verificationToken || otpRes.registrationToken;

        await docGiaService.capNhatDocGia(authStore.userId, {
            email: emailMoi.value,
            verificationToken: token,
        });

        otpDoiEmail.value = '';
        emailDialogVisible.value = false;
        await authStore.refreshProfile();
        toast.add({
            severity: 'success',
            summary: 'Đổi email thành công',
            detail: `Email mới của bạn là ${emailMoi.value}`,
            life: 4000,
        });
    } catch (err) {
        errors.otpDoiEmail = err.message;
        emailError.value = err.message;
    } finally {
        emailLoading.value = false;
    }
}

onMounted(async () => {
    await authStore.refreshProfile();
    syncFormFromStore();
});
</script>

<template>
    <Card>
        <template #title>Hồ sơ cá nhân độc giả</template>
        <template #subtitle>
            Cập nhật thông tin liên hệ và xác thực thay đổi địa chỉ email qua OTP
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <form
                class="cr-flex-col cr-gap-md"
                novalidate
                @submit.prevent="handleSaveProfile"
            >
                <div class="cr-form-grid">
                    <div class="cr-field">
                        <label class="cr-label">Mã độc giả (cố định)</label>
                        <InputText
                            :modelValue="authStore.userProfile?.maDocGia"
                            disabled
                            fluid
                        />
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Email hiện tại</label>
                        <div class="cr-flex cr-gap-xs">
                            <InputText
                                :modelValue="
                                    authStore.userProfile?.email || 'Chưa cập nhật'
                                "
                                disabled
                                fluid
                            />
                            <Button
                                type="button"
                                label="Đổi email"
                                icon="pi pi-envelope"
                                severity="secondary"
                                outlined
                                @click="openEmailDialog"
                            />
                        </div>
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Họ và tên lót *</label>
                        <InputText
                            v-model="form.hoLot"
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

                    <div class="cr-field cr-field-full">
                        <label class="cr-label">Ảnh đại diện (tùy chọn)</label>
                        <input
                            ref="avatarFileInput"
                            type="file"
                            accept="image/*"
                            style="display: none"
                            @change="handleAvatarFileChange"
                        />
                        <div class="cr-items-center cr-flex-wrap" style="gap: 1rem">
                            <div
                                style="width: 68px; height: 68px; border-radius: 50%; border: 1px solid var(--cr-border); overflow: hidden; background: var(--cr-sage-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                            >
                                <img
                                    v-if="form.avatar"
                                    :src="form.avatar"
                                    alt="Ảnh đại diện"
                                    referrerpolicy="no-referrer"
                                    style="width: 100%; height: 100%; object-fit: cover"
                                />
                                <i
                                    v-else
                                    class="pi pi-user"
                                    style="font-size: 1.6rem; color: var(--cr-sage-dark)"
                                ></i>
                            </div>
                            <div class="cr-flex-col cr-gap-xs">
                                <div class="cr-items-center cr-flex-wrap">
                                    <Button
                                        type="button"
                                        :label="form.avatar ? 'Đổi ảnh đại diện' : 'Chọn tệp ảnh từ máy'"
                                        icon="pi pi-upload"
                                        severity="secondary"
                                        outlined
                                        size="small"
                                        @click="avatarFileInput?.click()"
                                    />
                                    <Button
                                        v-if="form.avatar"
                                        type="button"
                                        label="Cắt / Căn chỉnh lại"
                                        icon="pi pi-sliders-h"
                                        severity="secondary"
                                        text
                                        size="small"
                                        @click="openRecropAvatar"
                                    />
                                    <Button
                                        v-if="form.avatar"
                                        type="button"
                                        label="Xóa ảnh"
                                        icon="pi pi-times"
                                        severity="danger"
                                        text
                                        size="small"
                                        @click="clearAvatarFile"
                                    />
                                </div>
                                <span class="cr-muted">
                                    {{
                                        selectedAvatarFileName
                                            ? `Đã chọn: ${selectedAvatarFileName}`
                                            : 'Hỗ trợ tệp JPG, PNG, WEBP, GIF, SVG (tối đa 5MB).'
                                    }}
                                </span>
                            </div>
                        </div>
                        <small v-if="errors.avatar" class="cr-error">
                            {{ errors.avatar }}
                        </small>
                    </div>

                    <div class="cr-field cr-field-full">
                        <label class="cr-label">Địa chỉ liên hệ</label>
                        <InputText
                            v-model="form.diaChi"
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
                </div>

                <div class="cr-flex cr-gap-sm">
                    <Button
                        type="submit"
                        label="Lưu thay đổi hồ sơ"
                        icon="pi pi-save"
                        :loading="saving"
                    />
                </div>
            </form>
        </template>
    </Card>

    <Dialog
        v-model:visible="emailDialogVisible"
        header="Xác thực OTP đổi email mới"
        modal
        :style="{ width: '460px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <Message v-if="emailError" severity="error">
                {{ emailError }}
            </Message>

            <template v-if="emailStep === 1">
                <div class="cr-field">
                    <label class="cr-label">Địa chỉ email mới *</label>
                    <InputText
                        v-model="emailMoi"
                        type="email"
                        placeholder="emailmoi@example.com"
                        :invalid="!!errors.emailMoi"
                        :class="{ 'cr-input-invalid': !!errors.emailMoi }"
                        fluid
                        @update:modelValue="validateField('emailMoi')"
                        @blur="validateField('emailMoi')"
                    />
                    <small v-if="errors.emailMoi" class="cr-error">
                        {{ errors.emailMoi }}
                    </small>
                </div>
                <Button
                    label="Gửi mã OTP tới email mới"
                    icon="pi pi-send"
                    :loading="emailLoading"
                    fluid
                    @click="handleSendChangeEmailOtp"
                />
            </template>

            <template v-else>
                <Message severity="info" :closable="false">
                    Nhập mã OTP 6 chữ số đã được gửi tới <strong>{{ emailMoi }}</strong>.
                </Message>
                <div class="cr-field">
                    <label class="cr-label">Mã OTP (6 chữ số) *</label>
                    <InputText
                        v-model="otpDoiEmail"
                        maxlength="6"
                        placeholder="Nhập 6 chữ số"
                        :invalid="!!errors.otpDoiEmail"
                        :class="{ 'cr-input-invalid': !!errors.otpDoiEmail }"
                        fluid
                        @update:modelValue="validateField('otpDoiEmail')"
                        @blur="validateField('otpDoiEmail')"
                    />
                    <small v-if="errors.otpDoiEmail" class="cr-error">
                        {{ errors.otpDoiEmail }}
                    </small>
                </div>
                <div class="cr-flex cr-gap-sm">
                    <Button
                        label="Quay lại"
                        severity="secondary"
                        outlined
                        @click="emailStep = 1"
                    />
                    <Button
                        label="Xác nhận đổi email"
                        icon="pi pi-check"
                        :loading="emailLoading"
                        fluid
                        @click="handleVerifyAndChangeEmail"
                    />
                </div>
            </template>
        </div>
    </Dialog>

    <AvatarCropperDialog
        v-model:visible="cropperVisible"
        :imageSrc="rawAvatarForCrop"
        @confirm="handleConfirmAvatarCrop"
    />
</template>
