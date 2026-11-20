<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import thanhToanService from '@/services/thanhtoan.service';
import docGiaService from '@/services/docgia.service';
import { useAuthStore } from '@/stores/auth.store';
import {
    LOAI_THANH_TOAN_OPTIONS,
    TRANG_THAI_THANH_TOAN_OPTIONS,
    PHUONG_THUC_THANH_TOAN_OPTIONS,
    GOI_GIA_HAN_OPTIONS,
} from '@/utils/constants';
import {
    formatCurrency,
    formatDate,
    getPhuongThucLabel,
} from '@/utils/formatters';
import { readImageFileAsDataUrl } from '@/utils/imageUpload';

const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const payments = ref([]);
const totalRecords = ref(0);

const query = reactive({
    search: '',
    loai: null,
    trangThai: null,
    phuongThuc: null,
    page: 1,
    limit: 10,
});

// Tạo thanh toán mới
const createDialogVisible = ref(false);
const readersList = ref([]);
const createError = ref('');
const createForm = reactive({
    maDocGia: null,
    loai: 'phi_giaHan',
    goiGiaHan: '1_thang',
    soTien: 20000,
    phuongThuc: 'tienMat',
    ghiChu: '',
});

// Sửa phương thức / ghi chú thanh toán
const editDialogVisible = ref(false);
const editingPayment = ref(null);
const editForm = reactive({
    phuongThuc: 'tienMat',
    ghiChu: '',
    anhMinhChung: '',
});
const editFileInputRef = ref(null);

// Xem ảnh minh chứng phóng to
const previewImageVisible = ref(false);
const previewImageUrl = ref('');

function openImagePreview(url) {
    if (!url) return;
    previewImageUrl.value = url;
    previewImageVisible.value = true;
}

async function handleEditFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const dataUrl = await readImageFileAsDataUrl(file, {
            maxWidth: 1200,
            maxHeight: 1600,
            quality: 0.85,
        });
        editForm.anhMinhChung = dataUrl;
        toast.add({
            severity: 'info',
            summary: 'Đã tải ảnh lên',
            detail: `Tệp: ${file.name}`,
            life: 2500,
        });
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi tải ảnh',
            detail: err.message,
            life: 4000,
        });
    }
}

// Chi tiết & Xử lý thanh toán
const detailDialogVisible = ref(false);
const selectedDetailPayment = ref(null);
const confirming = ref(false);

const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejecting = ref(false);

function openDetailDialog(item) {
    selectedDetailPayment.value = item;
    detailDialogVisible.value = true;
}

function openProcessDialog(item) {
    selectedDetailPayment.value = item;
    detailDialogVisible.value = true;
}

function openRejectDialog() {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
}

async function handleConfirmReject() {
    if (!selectedDetailPayment.value) return;
    rejecting.value = true;
    try {
        const res = await thanhToanService.huyThanhToan(selectedDetailPayment.value._id, {
            lyDo: rejectReason.value.trim() || 'Thủ thư từ chối thanh toán',
        });
        toast.add({
            severity: 'warn',
            summary: 'Đã từ chối',
            detail: res.message || 'Đã từ chối giao dịch thanh toán.',
            life: 3500,
        });
        rejectDialogVisible.value = false;
        detailDialogVisible.value = false;
        await fetchPayments();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        rejecting.value = false;
    }
}

async function handleConfirmFromDialog() {
    if (!selectedDetailPayment.value) return;
    confirming.value = true;
    try {
        const res = await thanhToanService.xacNhanThanhToan(selectedDetailPayment.value._id, {});
        toast.add({
            severity: 'success',
            summary: 'Đã xác nhận thanh toán',
            detail: res.message || 'Xác nhận thanh toán hợp lệ thành công.',
            life: 4000,
        });
        detailDialogVisible.value = false;
        await fetchPayments();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        confirming.value = false;
    }
}

async function fetchPayments() {
    loading.value = true;
    try {
        const res = await thanhToanService.getDanhSachThanhToan({
            page: 1,
            limit: 500,
        });
        payments.value = res.data || [];
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

const filteredPayments = computed(() => {
    let list = payments.value;
    if (query.loai) {
        list = list.filter((p) => p.loai === query.loai);
    }
    if (query.trangThai) {
        list = list.filter((p) => p.trangThai === query.trangThai);
    }
    if (query.phuongThuc) {
        list = list.filter((p) => p.phuongThuc === query.phuongThuc);
    }

    const kw = query.search.trim().toLowerCase();
    if (kw) {
        list = list.filter((p) => {
            const maGD = (p.maThanhToan || '').toLowerCase();
            const maDG = (p.maDocGia?.maDocGia || '').toLowerCase();
            const hoTen =
                `${p.maDocGia?.hoLot || ''} ${p.maDocGia?.ten || ''}`
                    .trim()
                    .toLowerCase();
            const sdt = (p.maDocGia?.dienThoai || '').toLowerCase();
            const msnv = (p.msnv?.msnv || '').toLowerCase();
            const ghiChu = (p.ghiChu || '').toLowerCase();

            return (
                maGD.includes(kw) ||
                maDG.includes(kw) ||
                hoTen.includes(kw) ||
                sdt.includes(kw) ||
                msnv.includes(kw) ||
                ghiChu.includes(kw)
            );
        });
    }
    return list;
});

function handleResetFilters() {
    query.search = '';
    query.loai = null;
    query.trangThai = null;
    query.phuongThuc = null;
}

async function openCreateDialog() {
    createError.value = '';
    createForm.maDocGia = null;
    createForm.loai = 'phi_giaHan';
    createForm.goiGiaHan = '1_thang';
    createForm.soTien = 20000;
    createForm.phuongThuc = 'tienMat';
    createForm.ghiChu = '';
    createDialogVisible.value = true;

    try {
        const res = await docGiaService.getDanhSachDocGia({ limit: 100 });
        readersList.value = (res.data || []).map((d) => ({
            ...d,
            displayLabel: `${d.maDocGia} - ${d.hoLot} ${d.ten}`,
        }));
    } catch {
        // Bỏ qua lỗi phụ
    }
}

function onGoiChange() {
    const found = GOI_GIA_HAN_OPTIONS.find(
        (g) => g.value === createForm.goiGiaHan,
    );
    if (found) createForm.soTien = found.gia;
}

async function handleCreatePayment() {
    createError.value = '';
    if (!createForm.maDocGia) {
        createError.value = 'Vui lòng chọn độc giả.';
        return;
    }

    saving.value = true;
    try {
        await thanhToanService.taoThanhToan({
            maDocGia: createForm.maDocGia,
            loai: createForm.loai,
            goiGiaHan:
                createForm.loai === 'phi_giaHan' ? createForm.goiGiaHan : null,
            soTien: Number(createForm.soTien),
            phuongThuc: createForm.phuongThuc,
            ghiChu: createForm.ghiChu.trim(),
        });
        createDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã tạo giao dịch',
            detail: 'Tạo khoản thanh toán thành công.',
            life: 3000,
        });
        await fetchPayments();
    } catch (err) {
        createError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleConfirmPayment(item) {
    confirm.require({
        header: 'Xác nhận đã thu tiền thanh toán',
        message: `Xác nhận giao dịch "${item.maThanhToan}" với số tiền ${formatCurrency(item.soTien)}? Hệ thống sẽ tự động gia hạn thẻ (nếu là phí gia hạn) hoặc hoàn tất bồi thường sách mất (nếu là phí bồi thường).`,
        icon: 'pi pi-check-circle',
        acceptLabel: 'Xác nhận đã thu tiền',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await thanhToanService.xacNhanThanhToan(item._id, {});
                toast.add({
                    severity: 'success',
                    summary: 'Đã xác nhận thanh toán',
                    detail: res.message,
                    life: 4000,
                });
                await fetchPayments();
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

function handleCancelPayment(item) {
    confirm.require({
        header: 'Hủy giao dịch thanh toán',
        message: `Bạn có chắc muốn hủy giao dịch "${item.maThanhToan}"?`,
        icon: 'pi pi-times-circle',
        acceptLabel: 'Hủy giao dịch',
        rejectLabel: 'Đóng',
        accept: async () => {
            try {
                const res = await thanhToanService.huyThanhToan(item._id, {
                    lyDo: 'Nhân viên hủy tại quầy',
                });
                toast.add({
                    severity: 'info',
                    summary: 'Đã hủy giao dịch',
                    detail: res.message,
                    life: 3000,
                });
                await fetchPayments();
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

function openEditDialog(item) {
    editingPayment.value = item;
    editForm.phuongThuc = item.phuongThuc || 'tienMat';
    editForm.ghiChu = item.ghiChu || '';
    editForm.anhMinhChung = item.anhMinhChung || '';
    editDialogVisible.value = true;
}

async function handleSaveEdit() {
    if (!editingPayment.value) return;
    saving.value = true;
    try {
        await thanhToanService.capNhatThanhToan(editingPayment.value._id, {
            phuongThuc: editForm.phuongThuc,
            ghiChu: editForm.ghiChu,
            anhMinhChung: editForm.anhMinhChung,
        });
        editDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã cập nhật thông tin thanh toán.',
            life: 3000,
        });
        await fetchPayments();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

function handleDeletePayment(item) {
    confirm.require({
        header: 'Xóa giao dịch thanh toán',
        message: `Xóa bản ghi giao dịch "${item.maThanhToan}"? (Chỉ cho phép xóa giao dịch chưa hoàn thành).`,
        icon: 'pi pi-trash',
        acceptLabel: 'Xóa',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await thanhToanService.xoaThanhToan(item._id);
                toast.add({
                    severity: 'success',
                    summary: 'Đã xóa',
                    detail: res.message,
                    life: 3000,
                });
                await fetchPayments();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể xóa',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

onMounted(() => {
    fetchPayments();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Quản lý phí gia hạn & bồi thường sách</span>
                <Button
                    label="Tạo giao dịch mới"
                    @click="openCreateDialog"
                />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap" style="flex: 1">
                    <InputText
                        v-model="query.search"
                        placeholder="Tìm mã GD, mã ĐG, họ tên, SĐT, MSNV, ghi chú..."
                        style="min-width: 280px; flex: 1; max-width: 420px"
                    />
                    <Select
                        v-model="query.loai"
                        :options="LOAI_THANH_TOAN_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Loại phí"
                        showClear
                    />
                    <Select
                        v-model="query.trangThai"
                        :options="TRANG_THAI_THANH_TOAN_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Trạng thái"
                        showClear
                    />
                    <Select
                        v-model="query.phuongThuc"
                        :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Phương thức"
                        showClear
                    />
                    <Button
                        v-if="
                            query.search ||
                            query.loai ||
                            query.trangThai ||
                            query.phuongThuc
                        "
                        label="Đặt lại"
                        icon="pi pi-filter-slash"
                        severity="secondary"
                        outlined
                        @click="handleResetFilters"
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        title="Làm mới"
                        :loading="loading"
                        @click="fetchPayments"
                    />
                </div>
            </div>

            <DataTable
                :value="filteredPayments"
                :loading="loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 20, 50]"
                emptyMessage="Không có giao dịch thanh toán nào."
            >
                <Column field="maThanhToan" header="Mã GD" style="max-width: 190px; overflow-wrap: anywhere" />
                <Column header="Độc giả">
                    <template #body="{ data }">
                        <strong>
                            {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                        </strong>
                        <div class="cr-muted">{{ data.maDocGia?.maDocGia }}</div>
                    </template>
                </Column>
                <Column header="Loại phí" style="max-width: 130px;">
                    <template #body="{ data }">
                        <StatusTag type="loaiThanhToan" :value="data.loai" />
                    </template>
                </Column>
                <Column header="Số tiền">
                    <template #body="{ data }">
                        <strong>{{ formatCurrency(data.soTien) }}</strong>
                    </template>
                </Column>
                <Column header="Phương thức" style="max-width: 140px;">
                    <template #body="{ data }">
                        <div class="cr-items-center cr-gap-xs">
                            <span>{{ getPhuongThucLabel(data.phuongThuc) }}</span>
                        </div>
                    </template>
                </Column>
                <Column header="Trạng thái" style="max-width: 110px;">
                    <template #body="{ data }">
                        <StatusTag type="thanhToan" :value="data.trangThai" />
                    </template>
                </Column>
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center cr-gap-xs">
                            <template v-if="data.trangThai === 'choXacNhan'">
                                <Button
                                    v-if="data.phuongThuc === 'tienMat' || data.anhMinhChung"
                                    label="Xử lý"
                                    size="small"
                                    severity="primary"
                                    title="Xem thông tin và xử lý duyệt/từ chối thanh toán"
                                    @click="openProcessDialog(data)"
                                />
                                <Button
                                    v-else
                                    label="Chi tiết"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    title="Xem chi tiết (độc giả chưa gửi ảnh minh chứng)"
                                    @click="openDetailDialog(data)"
                                />
                                <Button
                                    icon="pi pi-pencil"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    title="Sửa phương thức / ghi chú"
                                    @click="openEditDialog(data)"
                                />
                            </template>
                            <template v-else>
                                <Button
                                    label="Chi tiết"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    @click="openDetailDialog(data)"
                                />
                            </template>
                            <Button
                                v-if="
                                    authStore.isAdmin &&
                                    data.trangThai !== 'daThanhToan'
                                "
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                title="Xóa bản ghi"
                                @click="handleDeletePayment(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <!-- Dialog Tạo Giao dịch -->
    <Dialog
        v-model:visible="createDialogVisible"
        header="Tạo giao dịch thanh toán"
        modal
        :style="{ width: '480px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <Message v-if="createError" severity="error">{{ createError }}</Message>

            <div class="cr-field">
                <label class="cr-label">Độc giả *</label>
                <Select
                    v-model="createForm.maDocGia"
                    :options="readersList"
                    optionLabel="displayLabel"
                    optionValue="_id"
                    filter
                    placeholder="Chọn độc giả..."
                    fluid
                />
            </div>

            <div class="cr-field">
                <label class="cr-label">Loại thanh toán *</label>
                <Select
                    v-model="createForm.loai"
                    :options="LOAI_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>

            <div v-if="createForm.loai === 'phi_giaHan'" class="cr-field">
                <label class="cr-label">Gói gia hạn</label>
                <Select
                    v-model="createForm.goiGiaHan"
                    :options="GOI_GIA_HAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                    @change="onGoiChange"
                />
            </div>

            <div class="cr-field">
                <label class="cr-label">Số tiền (VNĐ) *</label>
                <InputNumber v-model="createForm.soTien" :min="0" fluid />
            </div>

            <div class="cr-field">
                <label class="cr-label">Phương thức</label>
                <Select
                    v-model="createForm.phuongThuc"
                    :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>

            <div class="cr-field">
                <label class="cr-label">Ghi chú</label>
                <InputText v-model="createForm.ghiChu" fluid />
            </div>

            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="createDialogVisible = false"
                />
                <Button
                    label="Tạo giao dịch"
                    :loading="saving"
                    @click="handleCreatePayment"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog Cập nhật giao dịch -->
    <Dialog
        v-model:visible="editDialogVisible"
        header="Cập nhật giao dịch thanh toán"
        modal
        :style="{ width: '440px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <div class="cr-field">
                <label class="cr-label">Phương thức thanh toán</label>
                <Select
                    v-model="editForm.phuongThuc"
                    :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>
            <div class="cr-field">
                <label class="cr-label">Ghi chú</label>
                <InputText v-model="editForm.ghiChu" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Ảnh minh chứng thanh toán</label>
                <input
                    ref="editFileInputRef"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleEditFileChange"
                />
                <div class="cr-flex cr-items-center cr-gap-sm">
                    <Button
                        type="button"
                        label="Chọn tệp ảnh"
                        icon="pi pi-upload"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="editFileInputRef?.click()"
                    />
                    <Button
                        v-if="editForm.anhMinhChung"
                        label="Xóa ảnh"
                        icon="pi pi-times"
                        severity="danger"
                        text
                        size="small"
                        @click="editForm.anhMinhChung = ''"
                    />
                </div>
                <div v-if="editForm.anhMinhChung" style="margin-top: 6px">
                    <img
                        :src="editForm.anhMinhChung"
                        alt="Ảnh minh chứng"
                        style="max-width: 140px; max-height: 100px; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer"
                        @click="openImagePreview(editForm.anhMinhChung)"
                    />
                </div>
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="editDialogVisible = false"
                />
                <Button
                    label="Lưu"
                    :loading="saving"
                    @click="handleSaveEdit"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog Chi tiết & Xử lý giao dịch thanh toán -->
    <Dialog
        v-model:visible="detailDialogVisible"
        :header="
            selectedDetailPayment?.trangThai === 'choXacNhan' &&
            (selectedDetailPayment?.phuongThuc === 'tienMat' || selectedDetailPayment?.anhMinhChung)
                ? 'Xử lý giao dịch thanh toán'
                : 'Chi tiết giao dịch thanh toán'
        "
        modal
        :style="{ width: '560px', maxWidth: '95vw' }"
    >
        <div v-if="selectedDetailPayment" class="cr-flex-col cr-gap-md">
            <div class="cr-grid-2">
                <div>
                    <span class="cr-muted">Mã giao dịch:</span>
                    <div>
                        <strong>{{ selectedDetailPayment.maThanhToan }}</strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Trạng thái:</span>
                    <div>
                        <StatusTag
                            type="thanhToan"
                            :value="selectedDetailPayment.trangThai"
                        />
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Độc giả:</span>
                    <div>
                        <strong>
                            {{ selectedDetailPayment.maDocGia?.hoLot }}
                            {{ selectedDetailPayment.maDocGia?.ten }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Mã độc giả & SĐT:</span>
                    <div>
                        <strong>
                            {{ selectedDetailPayment.maDocGia?.maDocGia || '—' }}
                            {{
                                selectedDetailPayment.maDocGia?.dienThoai
                                    ? ` (${selectedDetailPayment.maDocGia.dienThoai})`
                                    : ''
                            }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Loại phí:</span>
                    <div>
                        <StatusTag
                            type="loaiThanhToan"
                            :value="selectedDetailPayment.loai"
                        />
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Số tiền:</span>
                    <div>
                        <strong style="color: var(--cr-primary); font-size: 1.05rem">
                            {{ formatCurrency(selectedDetailPayment.soTien) }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Phương thức:</span>
                    <div>
                        <strong>
                            {{ getPhuongThucLabel(selectedDetailPayment.phuongThuc) }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Ngày tạo:</span>
                    <div>
                        <strong>
                            {{ formatDate(selectedDetailPayment.ngayTao, true) }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Ngày xử lý:</span>
                    <div>
                        <strong>
                            {{ formatDate(selectedDetailPayment.ngayThanhToan, true) }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Nhân viên xử lý:</span>
                    <div>
                        <strong v-if="selectedDetailPayment.msnv">
                            {{ selectedDetailPayment.msnv.hoTenNv || '' }}
                            ({{ selectedDetailPayment.msnv.msnv }})
                        </strong>
                        <span v-else class="cr-muted">Chưa xử lý</span>
                    </div>
                </div>
                <div class="cr-field-full">
                    <span class="cr-muted">Ghi chú:</span>
                    <div>
                        {{ selectedDetailPayment.ghiChu || '—' }}
                    </div>
                </div>
                <div class="cr-field-full">
                    <span class="cr-muted">Ảnh minh chứng thanh toán:</span>
                    <div v-if="selectedDetailPayment.anhMinhChung" style="margin-top: 8px">
                        <img
                            :src="selectedDetailPayment.anhMinhChung"
                            alt="Ảnh minh chứng thanh toán"
                            style="
                                max-width: 240px;
                                max-height: 180px;
                                object-fit: contain;
                                border-radius: 8px;
                                border: 1.5px solid var(--p-content-border-color, var(--cr-border));
                                cursor: pointer;
                                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                                transition: transform 0.2s;
                            "
                            title="Bấm để xem ảnh phóng to"
                            @click="openImagePreview(selectedDetailPayment.anhMinhChung)"
                        />
                        <div class="cr-muted" style="font-size: 0.8rem; margin-top: 4px">
                            (Bấm vào ảnh để xem kích thước lớn)
                        </div>
                    </div>
                    <div v-else class="cr-muted" style="margin-top: 4px; font-style: italic">
                        {{
                            selectedDetailPayment.phuongThuc === 'tienMat'
                                ? 'Thanh toán tiền mặt tại quầy (không yêu cầu ảnh minh chứng)'
                                : 'Độc giả chưa tải lên ảnh minh chứng thanh toán'
                        }}
                    </div>
                </div>
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end; width: 100%; margin-top: 0.5rem">
                <Button
                    label="Đóng"
                    severity="secondary"
                    outlined
                    @click="detailDialogVisible = false"
                />
                <template
                    v-if="
                        selectedDetailPayment.trangThai === 'choXacNhan' &&
                        (selectedDetailPayment.phuongThuc === 'tienMat' || selectedDetailPayment.anhMinhChung)
                    "
                >
                    <Button
                        label="Từ chối"
                        icon="pi pi-times"
                        severity="danger"
                        outlined
                        @click="openRejectDialog"
                    />
                    <Button
                        label="Xác nhận"
                        icon="pi pi-check"
                        severity="primary"
                        :loading="confirming"
                        @click="handleConfirmFromDialog"
                    />
                </template>
            </div>
        </div>
    </Dialog>

    <!-- Dialog Từ chối giao dịch thanh toán -->
    <Dialog
        v-model:visible="rejectDialogVisible"
        header="Từ chối giao dịch thanh toán"
        modal
        :style="{ width: '420px', maxWidth: '95vw' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <p class="cr-muted" style="margin: 0">
                Xác nhận từ chối giao dịch
                <strong>{{ selectedDetailPayment?.maThanhToan }}</strong>? Giao dịch sẽ được chuyển sang trạng thái Đã hủy.
            </p>
            <div class="cr-field">
                <label class="cr-label">Lý do từ chối</label>
                <InputText
                    v-model="rejectReason"
                    placeholder="VD: Chưa nhận được tiền, sai số tiền, ảnh mờ..."
                    fluid
                />
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    label="Quay lại"
                    severity="secondary"
                    outlined
                    @click="rejectDialogVisible = false"
                />
                <Button
                    label="Xác nhận từ chối"
                    severity="danger"
                    icon="pi pi-times"
                    :loading="rejecting"
                    @click="handleConfirmReject"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog xem ảnh minh chứng phóng to -->
    <Dialog
        v-model:visible="previewImageVisible"
        header="Ảnh minh chứng thanh toán"
        modal
        :style="{ width: '520px', maxWidth: '95vw' }"
    >
        <div style="text-align: center; padding: 0.5rem">
            <img
                :src="previewImageUrl"
                alt="Ảnh minh chứng"
                style="max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15)"
            />
        </div>
    </Dialog>
</template>
