<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import docGiaService from '@/services/docgia.service';
import nhanVienService from '@/services/nhanvien.service';
import {
    TRANG_THAI_DOC_GIA_OPTIONS,
    CHUC_VU_OPTIONS,
} from '@/utils/constants';

const toast = useToast();
const activeTab = ref('readers');
const loading = ref(false);

const readers = ref([]);
const staffList = ref([]);

const readerFilter = reactive({
    search: '',
    trangThai: null,
});

const staffFilter = reactive({
    search: '',
    chucVu: null,
    accessStatus: null,
});

const staffAccessOptions = [
    { label: 'Đang kích hoạt', value: 'active' },
    { label: 'Đã thu hồi (Nghỉ việc)', value: 'revoked' },
];

const filteredReaders = computed(() => {
    let list = readers.value;
    if (readerFilter.trangThai) {
        list = list.filter(
            (r) => r.trangThaiTaiKhoan === readerFilter.trangThai,
        );
    }
    const kw = readerFilter.search.trim().toLowerCase();
    if (kw) {
        list = list.filter((r) => {
            const ma = (r.maDocGia || '').toLowerCase();
            const hoTen = `${r.hoLot || ''} ${r.ten || ''}`
                .trim()
                .toLowerCase();
            const email = (r.email || '').toLowerCase();
            const sdt = (r.dienThoai || '').toLowerCase();
            return (
                ma.includes(kw) ||
                hoTen.includes(kw) ||
                email.includes(kw) ||
                sdt.includes(kw)
            );
        });
    }
    return list;
});

const filteredStaff = computed(() => {
    let list = staffList.value;
    if (staffFilter.chucVu) {
        list = list.filter((s) => s.chucVu === staffFilter.chucVu);
    }
    if (staffFilter.accessStatus === 'active') {
        list = list.filter((s) => !s.daNghiViec);
    } else if (staffFilter.accessStatus === 'revoked') {
        list = list.filter((s) => Boolean(s.daNghiViec));
    }
    const kw = staffFilter.search.trim().toLowerCase();
    if (kw) {
        list = list.filter((s) => {
            const msnv = (s.msnv || '').toLowerCase();
            const hoTen = (s.hoTenNv || '').toLowerCase();
            const sdt = (s.soDienThoai || '').toLowerCase();
            return msnv.includes(kw) || hoTen.includes(kw) || sdt.includes(kw);
        });
    }
    return list;
});

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
                <span>Quản lý tài khoản & kiểm soát truy cập (Admin)</span>
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
            Quản lý trạng thái hoạt động, thu hồi quyền truy cập và cấp lại mật khẩu cho độc giả & nhân viên
        </template>
        <template #content>
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="readers">
                        Tài khoản độc giả ({{ readers.length }})
                    </Tab>
                    <Tab value="staff">
                        Tài khoản nhân viên ({{ staffList.length }})
                    </Tab>
                </TabList>

                <TabPanels>
                    <TabPanel value="readers">
                        <div class="cr-toolbar">
                            <div
                                class="cr-items-center cr-flex-wrap"
                                style="flex: 1"
                            >
                                <InputText
                                    v-model="readerFilter.search"
                                    placeholder="Tìm mã ĐG, họ tên, email, SĐT..."
                                    style="min-width: 260px; flex: 1; max-width: 400px"
                                />
                                <Select
                                    v-model="readerFilter.trangThai"
                                    :options="TRANG_THAI_DOC_GIA_OPTIONS"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Trạng thái tài khoản"
                                    showClear
                                />
                                <Button
                                    v-if="
                                        readerFilter.search ||
                                        readerFilter.trangThai
                                    "
                                    label="Đặt lại"
                                    icon="pi pi-filter-slash"
                                    severity="secondary"
                                    outlined
                                    @click="
                                        readerFilter.search = '';
                                        readerFilter.trangThai = null;
                                    "
                                />
                            </div>
                        </div>

                        <DataTable
                            :value="filteredReaders"
                            :loading="loading"
                            paginator
                            :rows="10"
                            emptyMessage="Không tìm thấy tài khoản độc giả nào."
                        >
                            <Column field="maDocGia" header="Mã ĐG" />
                            <Column header="Họ và tên">
                                <template #body="{ data }">
                                    <div class="cr-items-center" style="gap: 0.65rem">
                                        <div
                                            style="width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--cr-border); overflow: hidden; background: var(--cr-sage-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                                        >
                                            <img
                                                v-if="data.avatar"
                                                :src="data.avatar"
                                                alt="Avatar"
                                                referrerpolicy="no-referrer"
                                                style="width: 100%; height: 100%; object-fit: cover"
                                            />
                                            <i
                                                v-else
                                                class="pi pi-user"
                                                style="font-size: 0.9rem; color: var(--cr-sage-dark)"
                                            />
                                        </div>
                                        <strong>{{ data.hoLot }} {{ data.ten }}</strong>
                                    </div>
                                </template>
                            </Column>
                            <Column header="Email">
                                <template #body="{ data }">
                                    {{ data.email || '—' }}
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
                        <div class="cr-toolbar">
                            <div
                                class="cr-items-center cr-flex-wrap"
                                style="flex: 1"
                            >
                                <InputText
                                    v-model="staffFilter.search"
                                    placeholder="Tìm MSNV, họ tên nhân viên, SĐT..."
                                    style="min-width: 260px; flex: 1; max-width: 400px"
                                />
                                <Select
                                    v-model="staffFilter.chucVu"
                                    :options="CHUC_VU_OPTIONS"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Chức vụ"
                                    showClear
                                />
                                <Select
                                    v-model="staffFilter.accessStatus"
                                    :options="staffAccessOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Quyền truy cập"
                                    showClear
                                />
                                <Button
                                    v-if="
                                        staffFilter.search ||
                                        staffFilter.chucVu ||
                                        staffFilter.accessStatus
                                    "
                                    label="Đặt lại"
                                    icon="pi pi-filter-slash"
                                    severity="secondary"
                                    outlined
                                    @click="
                                        staffFilter.search = '';
                                        staffFilter.chucVu = null;
                                        staffFilter.accessStatus = null;
                                    "
                                />
                            </div>
                        </div>

                        <DataTable
                            :value="filteredStaff"
                            :loading="loading"
                            paginator
                            :rows="10"
                            emptyMessage="Không tìm thấy tài khoản nhân viên nào."
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
        header="Cấp lại mật khẩu tài khoản"
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
                    label="Lưu mật khẩu"
                    :loading="savingPass"
                    @click="handleResetPassword"
                />
            </div>
        </div>
    </Dialog>
</template>
