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

const toast = useToast();
const authStore = useAuthStore();

const saving = ref(false);
const errorMsg = ref('');

const form = reactive({
    hoLot: '',
    ten: '',
    dienThoai: '',
    ngaySinh: null,
    phai: 'khac',
    diaChi: '',
    avatar: '',
});

// Đổi email qua OTP
const emailDialogVisible = ref(false);
const emailStep = ref(1);
const emailLoading = ref(false);
const emailError = ref('');
const emailMoi = ref('');
const otpDoiEmail = ref('');

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
    if (!form.hoLot.trim() || !form.ten.trim()) {
        errorMsg.value = 'Họ lót và tên không được để trống.';
        return;
    }
    if (!REGEX.SO_DIEN_THOAI.test(form.dienThoai.trim())) {
        errorMsg.value =
            'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
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
    emailDialogVisible.value = true;
}

async function handleSendChangeEmailOtp() {
    emailError.value = '';
    const targetEmail = emailMoi.value.trim().toLowerCase();
    if (!REGEX.EMAIL.test(targetEmail)) {
        emailError.value = 'Địa chỉ email mới không hợp lệ.';
        return;
    }

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
        emailError.value = err.message;
    } finally {
        emailLoading.value = false;
    }
}

async function handleVerifyAndChangeEmail() {
    emailError.value = '';
    if (!/^\d{6}$/.test(otpDoiEmail.value.trim())) {
        emailError.value = 'Vui lòng nhập mã OTP gồm 6 chữ số.';
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
        <template #title>Hồ sơ Cá nhân Độc giả</template>
        <template #subtitle>
            Cập nhật thông tin liên hệ và xác thực thay đổi địa chỉ email qua OTP
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <form
                class="cr-flex-col cr-gap-md"
                @submit.prevent="handleSaveProfile"
            >
                <div class="cr-form-grid">
                    <div class="cr-field">
                        <label class="cr-label">Mã độc giả (Cố định)</label>
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
                                label="Đổi Email"
                                icon="pi pi-envelope"
                                severity="secondary"
                                outlined
                                @click="openEmailDialog"
                            />
                        </div>
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Họ và tên lót *</label>
                        <InputText v-model="form.hoLot" fluid />
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Tên *</label>
                        <InputText v-model="form.ten" fluid />
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Số điện thoại *</label>
                        <InputText v-model="form.dienThoai" maxlength="10" fluid />
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
                        <label class="cr-label">URL Ảnh đại diện (tùy chọn)</label>
                        <InputText
                            v-model="form.avatar"
                            placeholder="https://..."
                            fluid
                        />
                    </div>

                    <div class="cr-field cr-field-full">
                        <label class="cr-label">Địa chỉ liên hệ</label>
                        <InputText v-model="form.diaChi" fluid />
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
        header="Xác thực OTP Đổi Email Mới"
        modal
        :style="{ width: '460px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <Message v-if="emailError" severity="error">
                {{ emailError }}
            </Message>

            <template v-if="emailStep === 1">
                <div class="cr-field">
                    <label class="cr-label">Địa chỉ Email mới *</label>
                    <InputText
                        v-model="emailMoi"
                        type="email"
                        placeholder="emailmoi@example.com"
                        fluid
                    />
                </div>
                <Button
                    label="Gửi mã OTP tới Email mới"
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
                        fluid
                    />
                </div>
                <div class="cr-flex cr-gap-sm">
                    <Button
                        label="Quay lại"
                        severity="secondary"
                        outlined
                        @click="emailStep = 1"
                    />
                    <Button
                        label="Xác nhận Đổi Email"
                        icon="pi pi-check"
                        :loading="emailLoading"
                        fluid
                        @click="handleVerifyAndChangeEmail"
                    />
                </div>
            </template>
        </div>
    </Dialog>
</template>
