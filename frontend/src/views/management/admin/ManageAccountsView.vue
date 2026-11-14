<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import docGiaService from '@/services/docgia.service';
import nhanVienService from '@/services/nhanvien.service';
import { TRANG_THAI_DOC_GIA_OPTIONS } from '@/utils/constants';

const toast = useToast();
const activeTab = ref('readers');
const loading = ref(false);

const readers = ref([]);
const staffList = ref([]);

// Đặt lại mật khẩu bởi Admin
const passDialogVisible = ref(false);
const targetAccount = ref(null);
const targetType = ref('reader'); // 'reader' | 'staff'
const newPassword = ref('');
const passError = ref('');
const savingPass = ref(false);

async function loadAccounts() {
    loading.value = true;
    try {
        const [dgRes, nvRes] = await Promise.all([
            docGiaService.getDanhSachDocGia({ limit: 100 }),
            nhanVienService.getDanhSachNhanVien({ limit: 100 }),
        ]);
        readers.value = dgRes.data || [];
        staffList.value = nvRes.data || [];
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        loading.value = false;
    }
}

async function handleReaderStatusChange(reader, status) {
    try {
        await docGiaService.capNhatTrangThaiThe(reader._id, status);
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật',
            detail: `Đã chuyển trạng thái tài khoản ${reader.maDocGia}.`,
            life: 3000,
        });
        await loadAccounts();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    }
}

async function handleToggleStaffActive(nv) {
    try {
        await nhanVienService.capNhatNhanVien(nv._id, {
            daNghiViec: !nv.daNghiViec,
        });
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật',
            detail: `Đã cập nhật trạng thái truy cập của ${nv.msnv}.`,
            life: 3000,
        });
        await loadAccounts();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    }
}

function openResetPasswordDialog(acc, type) {
    targetAccount.value = acc;
    targetType.value = type;
    newPassword.value = '';
    passError.value = '';
    passDialogVisible.value = true;
}

async function handleResetPassword() {
    passError.value = '';
    if (!newPassword.value || newPassword.value.length < 6) {
        passError.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        return;
    }

    savingPass.value = true;
    try {
        if (targetType.value === 'reader') {
            await docGiaService.doiMatKhau(targetAccount.value._id, {
                matKhauMoi: newPassword.value,
            });
        } else {
            await nhanVienService.doiMatKhau(targetAccount.value._id, {
                matKhauMoi: newPassword.value,
            });
        }
        passDialogVisible.value = false;
        newPassword.value = '';
        toast.add({
            severity: 'success',
            summary: 'Đã cấp lại mật khẩu',
            detail: 'Cập nhật mật khẩu tài khoản thành công.',
            life: 3500,
        });
    } catch (err) {
        passError.value = err.message;
    } finally {
        savingPass.value = false;
    }
}

onMounted(() => {
    loadAccounts();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between">
                <span>Quản lý Tài khoản & Kiểm soát Truy cập (Admin)</span>
                <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    size="small"
                    @click="loadAccounts"
                />
            </div>
        </template>
        <template #subtitle>
            Quản lý trạng thái hoạt động, thu hồi quyền truy cập và cấp lại mật khẩu cho Độc giả & Nhân viên
        </template>
        <template #content>
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="readers">
                        Tài khoản Độc giả ({{ readers.length }})
                    </Tab>
                    <Tab value="staff">
                        Tài khoản Nhân viên ({{ staffList.length }})
                    </Tab>
                </TabList>

                <TabPanels>
                    <TabPanel value="readers">
                        <DataTable
                            :value="readers"
                            :loading="loading"
                            paginator
                            :rows="10"
                        >
                            <Column field="maDocGia" header="Mã ĐG" />
                            <Column header="Họ tên & Email">
                                <template #body="{ data }">
                                    <strong>{{ data.hoLot }} {{ data.ten }}</strong>
                                    <div class="cr-muted">
                                        {{ data.email || 'Chưa có email' }}
                                    </div>
                                </template>
                            </Column>
                            <Column header="Trạng thái hiện tại">
                                <template #body="{ data }">
                                    <StatusTag
                                        type="docGia"
                                        :value="data.trangThaiTaiKhoan"
                                    />
                                </template>
                            </Column>
                            <Column header="Đổi trạng thái nhanh">
                                <template #body="{ data }">
                                    <Select
                                        :modelValue="data.trangThaiTaiKhoan"
                                        :options="TRANG_THAI_DOC_GIA_OPTIONS"
                                        optionLabel="label"
                                        optionValue="value"
                                        size="small"
                                        @update:modelValue="
                                            (val) =>
                                                handleReaderStatusChange(data, val)
                                        "
                                    />
                                </template>
                            </Column>
                            <Column header="Bảo mật">
                                <template #body="{ data }">
                                    <Button
                                        label="Cấp mật khẩu mới"
                                        icon="pi pi-key"
                                        severity="secondary"
                                        outlined
                                        size="small"
                                        @click="
                                            openResetPasswordDialog(data, 'reader')
                                        "
                                    />
                                </template>
                            </Column>
                        </DataTable>
                    </TabPanel>

                    <TabPanel value="staff">
                        <DataTable
                            :value="staffList"
                            :loading="loading"
                            paginator
                            :rows="10"
                        >
                            <Column field="msnv" header="MSNV" />
                            <Column field="hoTenNv" header="Họ tên nhân viên" />
                            <Column header="Vai trò / Chức vụ">
                                <template #body="{ data }">
                                    <StatusTag type="chucVu" :value="data.chucVu" />
                                </template>
                            </Column>
                            <Column header="Quyền truy cập">
                                <template #body="{ data }">
                                    <Tag
                                        :value="
                                            data.daNghiViec
                                                ? 'Đã thu hồi (Nghỉ việc)'
                                                : 'Đang kích hoạt'
                                        "
                                        :severity="
                                            data.daNghiViec ? 'danger' : 'success'
                                        "
                                    />
                                </template>
                            </Column>
                            <Column header="Thao tác">
                                <template #body="{ data }">
                                    <div class="cr-items-center">
                                        <Button
                                            :label="
                                                data.daNghiViec
                                                    ? 'Kích hoạt lại'
                                                    : 'Thu hồi quyền'
                                            "
                                            :severity="
                                                data.daNghiViec ? 'success' : 'warn'
                                            "
                                            outlined
                                            size="small"
                                            @click="handleToggleStaffActive(data)"
                                        />
                                        <Button
                                            label="Cấp mật khẩu mới"
                                            icon="pi pi-key"
                                            severity="secondary"
                                            outlined
                                            size="small"
                                            @click="
                                                openResetPasswordDialog(
                                                    data,
                                                    'staff',
                                                )
                                            "
                                        />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </template>
    </Card>

    <Dialog
        v-model:visible="passDialogVisible"
        header="Cấp lại Mật khẩu Tài khoản"
        modal
        :style="{ width: '420px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <Message v-if="passError" severity="error">{{ passError }}</Message>
            <div class="cr-muted">
                Tài khoản:
                <strong>
                    {{
                        targetAccount?.maDocGia ||
                        targetAccount?.msnv
                    }}
                </strong>
            </div>
            <div class="cr-field">
                <label class="cr-label">Mật khẩu mới * (tối thiểu 6 ký tự)</label>
                <Password
                    v-model="newPassword"
                    :feedback="false"
                    toggleMask
                    fluid
                />
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="passDialogVisible = false"
                />
                <Button
                    label="Lưu Mật khẩu"
                    icon="pi pi-save"
                    :loading="savingPass"
                    @click="handleResetPassword"
                />
            </div>
        </div>
    </Dialog>
</template>
