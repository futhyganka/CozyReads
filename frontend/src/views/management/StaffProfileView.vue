<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import nhanVienService from '@/services/nhanvien.service';
import { useAuthStore } from '@/stores/auth.store';
import { REGEX } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

const toast = useToast();
const authStore = useAuthStore();

const savingProfile = ref(false);
const savingPass = ref(false);
const profileError = ref('');
const passError = ref('');

const profileForm = reactive({
    hoTenNv: '',
    soDienThoai: '',
    diaChi: '',
});

const passForm = reactive({
    matKhauCu: '',
    matKhauMoi: '',
    xacNhanMatKhau: '',
});

function syncFromStore() {
    const nv = authStore.userProfile;
    if (!nv) return;
    profileForm.hoTenNv = nv.hoTenNv || '';
    profileForm.soDienThoai = nv.soDienThoai || '';
    profileForm.diaChi = nv.diaChi || '';
}

async function handleSaveProfile() {
    profileError.value = '';
    if (!profileForm.hoTenNv.trim()) {
        profileError.value = 'Họ tên nhân viên không được để trống.';
        return;
    }
    if (!REGEX.SO_DIEN_THOAI.test(profileForm.soDienThoai.trim())) {
        profileError.value =
            'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
        return;
    }

    savingProfile.value = true;
    try {
        await nhanVienService.capNhatNhanVien(authStore.userId, {
            hoTenNv: profileForm.hoTenNv.trim(),
            soDienThoai: profileForm.soDienThoai.trim(),
            diaChi: profileForm.diaChi.trim(),
        });
        await authStore.refreshProfile();
        syncFromStore();
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật',
            detail: 'Cập nhật hồ sơ nhân viên thành công.',
            life: 3000,
        });
    } catch (err) {
        profileError.value = err.message;
    } finally {
        savingProfile.value = false;
    }
}

async function handleChangePassword() {
    passError.value = '';
    if (!passForm.matKhauCu) {
        passError.value = 'Vui lòng nhập mật khẩu hiện tại.';
        return;
    }
    if (!passForm.matKhauMoi || passForm.matKhauMoi.length < 6) {
        passError.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        return;
    }
    if (passForm.matKhauMoi !== passForm.xacNhanMatKhau) {
        passError.value = 'Mật khẩu xác nhận không khớp.';
        return;
    }

    savingPass.value = true;
    try {
        const res = await nhanVienService.doiMatKhau(authStore.userId, {
            matKhauCu: passForm.matKhauCu,
            matKhauMoi: passForm.matKhauMoi,
        });
        passForm.matKhauCu = '';
        passForm.matKhauMoi = '';
        passForm.xacNhanMatKhau = '';
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: res.message,
            life: 3500,
        });
    } catch (err) {
        passError.value = err.message;
    } finally {
        savingPass.value = false;
    }
}

onMounted(async () => {
    await authStore.refreshProfile();
    syncFromStore();
});
</script>

<template>
    <div class="cr-grid-2">
        <Card>
            <template #title>Hồ sơ Nhân viên</template>
            <template #subtitle>
                Mã số nhân viên: <strong>{{ authStore.userProfile?.msnv }}</strong>
            </template>
            <template #content>
                <Message
                    v-if="profileError"
                    severity="error"
                    style="margin-bottom: 1rem"
                >
                    {{ profileError }}
                </Message>

                <form
                    class="cr-flex-col cr-gap-md"
                    @submit.prevent="handleSaveProfile"
                >
                    <div class="cr-flex-between">
                        <span class="cr-muted">Chức vụ:</span>
                        <StatusTag
                            type="chucVu"
                            :value="authStore.userProfile?.chucVu"
                        />
                    </div>
                    <div class="cr-flex-between">
                        <span class="cr-muted">Mức lương hiện tại:</span>
                        <strong>{{ formatCurrency(authStore.userProfile?.luong) }}</strong>
                    </div>

                    <div class="cr-field">
                        <label class="cr-label">Họ và tên nhân viên *</label>
                        <InputText v-model="profileForm.hoTenNv" fluid />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Số điện thoại *</label>
                        <InputText
                            v-model="profileForm.soDienThoai"
                            maxlength="10"
                            fluid
                        />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Địa chỉ</label>
                        <InputText v-model="profileForm.diaChi" fluid />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            label="Lưu Thông tin Cá nhân"
                            icon="pi pi-save"
                            :loading="savingProfile"
                        />
                    </div>
                </form>
            </template>
        </Card>

        <Card>
            <template #title>Đổi Mật khẩu Nhân viên</template>
            <template #subtitle>
                Bảo mật tài khoản làm việc tại Cổng Quản lý
            </template>
            <template #content>
                <Message
                    v-if="passError"
                    severity="error"
                    style="margin-bottom: 1rem"
                >
                    {{ passError }}
                </Message>

                <form
                    class="cr-flex-col cr-gap-md"
                    @submit.prevent="handleChangePassword"
                >
                    <div class="cr-field">
                        <label class="cr-label">Mật khẩu hiện tại *</label>
                        <Password
                            v-model="passForm.matKhauCu"
                            :feedback="false"
                            toggleMask
                            fluid
                        />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Mật khẩu mới * (>= 6 ký tự)</label>
                        <Password
                            v-model="passForm.matKhauMoi"
                            :feedback="false"
                            toggleMask
                            fluid
                        />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Xác nhận mật khẩu mới *</label>
                        <Password
                            v-model="passForm.xacNhanMatKhau"
                            :feedback="false"
                            toggleMask
                            fluid
                        />
                    </div>

                    <div>
                        <Button
                            type="submit"
                            label="Đổi Mật khẩu"
                            icon="pi pi-lock"
                            :loading="savingPass"
                        />
                    </div>
                </form>
            </template>
        </Card>
    </div>
</template>
