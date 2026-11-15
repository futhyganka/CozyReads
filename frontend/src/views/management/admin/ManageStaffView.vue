<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import nhanVienService from '@/services/nhanvien.service';
import { CHUC_VU_OPTIONS, REGEX } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const saving = ref(false);
const staffList = ref([]);
const totalRecords = ref(0);

const query = reactive({
    search: '',
    chucVu: null,
    page: 1,
    limit: 10,
});

const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const formError = ref('');

const form = reactive({
    msnv: '',
    hoTenNv: '',
    password: '',
    chucVu: 'nhanVien',
    soDienThoai: '',
    luong: 10000000,
    diaChi: '',
    daNghiViec: false,
});

async function fetchStaff() {
    loading.value = true;
    try {
        const params = {
            page: query.page,
            limit: query.limit,
        };
        if (query.search.trim()) params.search = query.search.trim();
        if (query.chucVu) params.chucVu = query.chucVu;

        const res = await nhanVienService.getDanhSachNhanVien(params);
        staffList.value = res.data || [];
        totalRecords.value = res.total || 0;
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

function onPage(event) {
    query.page = event.page + 1;
    query.limit = event.rows;
    fetchStaff();
}

function openCreateDialog() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    form.msnv = '';
    form.hoTenNv = '';
    form.password = '';
    form.chucVu = 'nhanVien';
    form.soDienThoai = '';
    form.luong = 10000000;
    form.diaChi = '';
    form.daNghiViec = false;
    dialogVisible.value = true;
}

function openEditDialog(nv) {
    isEditing.value = true;
    editingId.value = nv._id;
    formError.value = '';
    form.msnv = nv.msnv;
    form.hoTenNv = nv.hoTenNv;
    form.password = '';
    form.chucVu = nv.chucVu;
    form.soDienThoai = nv.soDienThoai;
    form.luong = nv.luong || 0;
    form.diaChi = nv.diaChi || '';
    form.daNghiViec = Boolean(nv.daNghiViec);
    dialogVisible.value = true;
}

async function handleSaveStaff() {
    formError.value = '';
    if (!form.hoTenNv.trim()) {
        formError.value = 'Họ tên nhân viên là bắt buộc.';
        return;
    }
    if (!REGEX.SO_DIEN_THOAI.test(form.soDienThoai.trim())) {
        formError.value =
            'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
        return;
    }
    if (!isEditing.value && (!form.password || form.password.length < 6)) {
        formError.value = 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự.';
        return;
    }

    saving.value = true;
    try {
        if (isEditing.value) {
            await nhanVienService.capNhatNhanVien(editingId.value, {
                hoTenNv: form.hoTenNv.trim(),
                chucVu: form.chucVu,
                soDienThoai: form.soDienThoai.trim(),
                luong: Number(form.luong) || 0,
                diaChi: form.diaChi.trim(),
                daNghiViec: form.daNghiViec,
            });
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật hồ sơ nhân viên thành công.',
                life: 3000,
            });
        } else {
            const res = await nhanVienService.taoNhanVien({
                hoTenNv: form.hoTenNv.trim(),
                password: form.password,
                chucVu: form.chucVu,
                soDienThoai: form.soDienThoai.trim(),
                luong: Number(form.luong) || 0,
                diaChi: form.diaChi.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Tạo nhân viên thành công',
                detail: `Mã số nhân viên: ${res.data?.msnv}`,
                life: 4000,
            });
        }
        dialogVisible.value = false;
        await fetchStaff();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleDeleteStaff(nv) {
    confirm.require({
        header: 'Xác nhận Xóa / Đánh dấu Nghỉ việc Nhân viên',
        message: `Xóa hoặc đánh dấu nghỉ việc nhân viên "${nv.hoTenNv}" (${nv.msnv})? Nếu nhân viên đã tham gia xử lý giao dịch, hệ thống sẽ chuyển sang trạng thái Đã nghỉ việc để bảo toàn lịch sử.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Xác nhận',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await nhanVienService.xoaNhanVien(nv._id);
                toast.add({
                    severity: 'success',
                    summary: 'Hoàn tất',
                    detail: res.message,
                    life: 4000,
                });
                await fetchStaff();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Lỗi',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

onMounted(() => {
    fetchStaff();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Quản lý Nhân sự Thư viện (Admin)</span>
                <Button
                    label="Thêm Nhân viên mới"
                    icon="pi pi-user-plus"
                    @click="openCreateDialog"
                />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <InputText
                        v-model="query.search"
                        placeholder="Tìm MSNV, họ tên, SĐT..."
                        @keyup.enter="
                            query.page = 1;
                            fetchStaff();
                        "
                    />
                    <Select
                        v-model="query.chucVu"
                        :options="CHUC_VU_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Chức vụ"
                        showClear
                        @change="
                            query.page = 1;
                            fetchStaff();
                        "
                    />
                    <Button
                        label="Tìm"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            query.page = 1;
                            fetchStaff();
                        "
                    />
                </div>
            </div>

            <DataTable
                :value="staffList"
                :loading="loading"
                lazy
                paginator
                :rows="query.limit"
                :totalRecords="totalRecords"
                emptyMessage="Không có nhân viên nào."
                @page="onPage"
            >
                <Column field="msnv" header="MSNV" />
                <Column header="Họ và tên">
                    <template #body="{ data }">
                        <strong>{{ data.hoTenNv }}</strong>
                        <div class="cr-muted">{{ data.diaChi }}</div>
                    </template>
                </Column>
                <Column field="soDienThoai" header="Số điện thoại" />
                <Column header="Chức vụ">
                    <template #body="{ data }">
                        <StatusTag type="chucVu" :value="data.chucVu" />
                    </template>
                </Column>
                <Column header="Mức lương">
                    <template #body="{ data }">
                        {{ formatCurrency(data.luong) }}
                    </template>
                </Column>
                <Column header="Trạng thái làm việc">
                    <template #body="{ data }">
                        <Tag
                            :value="
                                data.daNghiViec ? 'Đã nghỉ việc' : 'Đang làm việc'
                            "
                            :severity="data.daNghiViec ? 'danger' : 'success'"
                        />
                    </template>
                </Column>
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center">
                            <Button
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                size="small"
                                @click="openEditDialog(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                @click="handleDeleteStaff(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <Dialog
        v-model:visible="dialogVisible"
        :header="isEditing ? `Cập nhật Nhân viên: ${form.msnv}` : 'Thêm Nhân viên Mới'"
        modal
        :style="{ width: '540px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSaveStaff">
            <Message v-if="formError" severity="error">{{ formError }}</Message>

            <div class="cr-form-grid">
                <div class="cr-field">
                    <label class="cr-label">Họ và tên nhân viên *</label>
                    <InputText v-model="form.hoTenNv" fluid />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Số điện thoại *</label>
                    <InputText
                        v-model="form.soDienThoai"
                        maxlength="10"
                        placeholder="10 chữ số (bắt đầu 03, 05, 07, 08, 09)"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Chức vụ & Phân quyền *</label>
                    <Select
                        v-model="form.chucVu"
                        :options="CHUC_VU_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Mức lương (VNĐ)</label>
                    <InputNumber v-model="form.luong" :min="0" fluid />
                </div>

                <div v-if="!isEditing" class="cr-field cr-field-full">
                    <label class="cr-label">Mật khẩu khởi tạo * (>= 6 ký tự)</label>
                    <Password
                        v-model="form.password"
                        :feedback="false"
                        toggleMask
                        fluid
                    />
                </div>

                <div class="cr-field cr-field-full">
                    <label class="cr-label">Địa chỉ</label>
                    <InputText v-model="form.diaChi" fluid />
                </div>

                <div v-if="isEditing" class="cr-field cr-field-full">
                    <div class="cr-items-center">
                        <Checkbox
                            v-model="form.daNghiViec"
                            inputId="chk-nghi-viec"
                            binary
                        />
                        <label for="chk-nghi-viec">
                            Đánh dấu đã nghỉ việc (Thu hồi ngay lập tức quyền truy cập JWT)
                        </label>
                    </div>
                </div>
            </div>

            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="dialogVisible = false"
                />
                <Button
                    type="submit"
                    label="Lưu Nhân viên"
                    icon="pi pi-save"
                    :loading="saving"
                />
            </div>
        </form>
    </Dialog>
</template>
