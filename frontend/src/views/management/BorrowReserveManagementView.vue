<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import docGiaService from '@/services/docgia.service';
import sachService from '@/services/sach.service';
import { TRANG_THAI_MUON_OPTIONS } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const borrows = ref([]);
const totalRecords = ref(0);
const statusFilter = ref(null);
const page = ref(1);
const limit = ref(10);

// Tạo phiếu mượn tại quầy
const createDialogVisible = ref(false);
const readersList = ref([]);
const availableBooks = ref([]);
const checkResult = ref(null);
const checkError = ref('');
const checking = ref(false);
const creating = ref(false);

const borrowForm = reactive({
    docGiaId: null,
    sachId: null,
    soNgayMuon: 14,
});

// Cập nhật phiếu mượn
const editDialogVisible = ref(false);
const editingBorrow = ref(null);
const editForm = reactive({
    trangThai: '',
    ngayHenTra: null,
    ghiChu: '',
});

async function fetchBorrows() {
    loading.value = true;
    try {
        const params = {
            page: page.value,
            limit: limit.value,
        };
        if (statusFilter.value) params.trangThai = statusFilter.value;

        const res = await muonTraService.getDanhSachPhieuMuon(params);
        borrows.value = res.data || [];
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
    page.value = event.page + 1;
    limit.value = event.rows;
    fetchBorrows();
}

async function openCreateBorrowDialog() {
    checkResult.value = null;
    checkError.value = '';
    borrowForm.docGiaId = null;
    borrowForm.sachId = null;
    borrowForm.soNgayMuon = 14;
    createDialogVisible.value = true;

    try {
        const [dgRes, sRes] = await Promise.all([
            docGiaService.getDanhSachDocGia({
                trangThai: 'hoatDong',
                limit: 100,
            }),
            sachService.getDanhSachSach({ conHang: true, limit: 100 }),
        ]);
        readersList.value = (dgRes.data || []).map((d) => ({
            ...d,
            displayLabel: `${d.maDocGia} - ${d.hoLot} ${d.ten} (${d.diemDocGia}đ)`,
        }));
        availableBooks.value = (sRes.data || []).map((s) => ({
            ...s,
            displayLabel: `${s.maSach} - ${s.tenSach} (Còn ${s.soQuyen})`,
        }));
    } catch {
        // Bỏ qua lỗi phụ
    }
}

async function handleCheckEligibility() {
    checkResult.value = null;
    checkError.value = '';
    if (!borrowForm.docGiaId || !borrowForm.sachId) {
        checkError.value = 'Vui lòng chọn Độc giả và Đầu sách cần kiểm tra.';
        return;
    }

    checking.value = true;
    try {
        const res = await muonTraService.kiemTraDieuKien({
            docGiaId: borrowForm.docGiaId,
            sachId: borrowForm.sachId,
        });
        checkResult.value = res.data;
    } catch (err) {
        checkError.value = err.message;
    } finally {
        checking.value = false;
    }
}

async function handleCreateCounterBorrow() {
    checkError.value = '';
    if (!borrowForm.docGiaId || !borrowForm.sachId) {
        checkError.value = 'Vui lòng chọn Độc giả và Đầu sách.';
        return;
    }

    creating.value = true;
    try {
        const res = await muonTraService.taoPhieuMuon({
            docGiaId: borrowForm.docGiaId,
            sachId: borrowForm.sachId,
            soNgayMuon: borrowForm.soNgayMuon || 14,
        });
        createDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã tạo phiếu mượn',
            detail: res.message,
            life: 4000,
        });
        await fetchBorrows();
    } catch (err) {
        checkError.value = err.message;
    } finally {
        creating.value = false;
    }
}

function handleConfirmCounterPickup(item) {
    confirm.require({
        header: 'Xác nhận Giao sách Giữ Online tại Quầy',
        message: `Xác nhận độc giả "${item.maDocGia?.hoLot || ''} ${item.maDocGia?.ten || ''}" nhận sách "${item.maSach?.tenSach}" tại quầy?`,
        icon: 'pi pi-check-circle',
        acceptLabel: 'Xác nhận Giao sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await muonTraService.xacNhanMuonTaiQuay(item._id, {
                    soNgayMuon: 14,
                });
                toast.add({
                    severity: 'success',
                    summary: 'Thành công',
                    detail: res.message,
                    life: 3500,
                });
                await fetchBorrows();
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

function openEditBorrowDialog(item) {
    editingBorrow.value = item;
    editForm.trangThai = item.trangThai;
    editForm.ngayHenTra = item.ngayHenTra ? new Date(item.ngayHenTra) : null;
    editForm.ghiChu = Array.isArray(item.ghiChu)
        ? item.ghiChu.join(' ')
        : item.ghiChu || '';
    editDialogVisible.value = true;
}

async function handleUpdateBorrow() {
    if (!editingBorrow.value) return;
    creating.value = true;
    try {
        await muonTraService.capNhatPhieuMuon(editingBorrow.value._id, {
            trangThai: editForm.trangThai,
            ngayHenTra: editForm.ngayHenTra,
            ghiChu: editForm.ghiChu,
        });
        editDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật',
            detail: 'Cập nhật phiếu mượn thành công.',
            life: 3000,
        });
        await fetchBorrows();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        creating.value = false;
    }
}

function handleDeleteBorrow(item) {
    confirm.require({
        header: 'Xác nhận Xóa Phiếu mượn',
        message: 'Chỉ được phép xóa phiếu mượn đã trả hoặc đã hủy và không gắn với chứng từ bồi thường. Bạn chắc chắn muốn xóa?',
        icon: 'pi pi-trash',
        acceptLabel: 'Xóa phiếu',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await muonTraService.xoaPhieuMuon(item._id);
                toast.add({
                    severity: 'success',
                    summary: 'Đã xóa',
                    detail: res.message,
                    life: 3000,
                });
                await fetchBorrows();
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
    fetchBorrows();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Quản lý Mượn Sách tại Quầy & Giữ Sách Trực tuyến</span>
                <Button
                    label="Tạo Phiếu mượn tại Quầy"
                    icon="pi pi-plus"
                    @click="openCreateBorrowDialog"
                />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <Select
                        v-model="statusFilter"
                        :options="TRANG_THAI_MUON_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Lọc theo trạng thái phiếu"
                        showClear
                        @change="
                            page = 1;
                            fetchBorrows();
                        "
                    />
                    <Button
                        label="Chỉ xem Giữ sách (24h)"
                        icon="pi pi-bookmark"
                        severity="secondary"
                        outlined
                        @click="
                            statusFilter = 'yeuCau_giuSach';
                            page = 1;
                            fetchBorrows();
                        "
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        @click="fetchBorrows"
                    />
                </div>
            </div>

            <DataTable
                :value="borrows"
                :loading="loading"
                lazy
                paginator
                :rows="limit"
                :totalRecords="totalRecords"
                :rowsPerPageOptions="[10, 20, 50]"
                emptyMessage="Không có phiếu mượn/giữ sách nào."
                @page="onPage"
            >
                <Column header="Độc giả">
                    <template #body="{ data }">
                        <strong>
                            {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                        </strong>
                        <div class="cr-muted">
                            {{ data.maDocGia?.maDocGia }} • {{ data.maDocGia?.dienThoai }}
                        </div>
                    </template>
                </Column>
                <Column header="Đầu sách">
                    <template #body="{ data }">
                        <strong>{{ data.maSach?.tenSach }}</strong>
                        <div class="cr-muted">{{ data.maSach?.maSach }}</div>
                    </template>
                </Column>
                <Column header="Ngày tạo / mượn">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayMuon, true) }}
                    </template>
                </Column>
                <Column header="Hạn nhận / Hạn trả">
                    <template #body="{ data }">
                        <strong>{{ formatDate(data.ngayHenTra, true) }}</strong>
                    </template>
                </Column>
                <Column header="NV xử lý">
                    <template #body="{ data }">
                        {{ data.msnvMuon?.msnv || 'Online' }}
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="muon" :value="data.trangThai" />
                    </template>
                </Column>
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center">
                            <Button
                                v-if="data.trangThai === 'yeuCau_giuSach'"
                                label="Giao sách tại quầy"
                                icon="pi pi-check"
                                size="small"
                                @click="handleConfirmCounterPickup(data)"
                            />
                            <Button
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                size="small"
                                title="Sửa hạn trả / ghi chú"
                                @click="openEditBorrowDialog(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                title="Xóa phiếu"
                                @click="handleDeleteBorrow(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <!-- Dialog Tạo phiếu mượn tại quầy -->
    <Dialog
        v-model:visible="createDialogVisible"
        header="Tạo Phiếu Mượn Sách Trực Tiếp tại Quầy"
        modal
        :style="{ width: '540px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <Message v-if="checkError" severity="error">{{ checkError }}</Message>

            <Message v-if="checkResult" severity="success" :closable="false">
                Độc giả <strong>{{ checkResult.docGia?.hoLot }} {{ checkResult.docGia?.ten }}</strong> đủ điều kiện mượn! Đang giữ:
                <strong>{{ checkResult.soSachDangGiu }}/{{ checkResult.soSachToiDa }}</strong> cuốn.
            </Message>

            <div class="cr-field">
                <label class="cr-label">Chọn Độc giả *</label>
                <Select
                    v-model="borrowForm.docGiaId"
                    :options="readersList"
                    optionLabel="displayLabel"
                    optionValue="_id"
                    filter
                    placeholder="Tìm theo mã ĐG hoặc họ tên..."
                    fluid
                />
            </div>

            <div class="cr-field">
                <label class="cr-label">Chọn Đầu sách (còn tồn kho) *</label>
                <Select
                    v-model="borrowForm.sachId"
                    :options="availableBooks"
                    optionLabel="displayLabel"
                    optionValue="_id"
                    filter
                    placeholder="Tìm theo mã sách hoặc tên sách..."
                    fluid
                />
            </div>

            <div class="cr-field">
                <label class="cr-label">Số ngày mượn (Mặc định 14 ngày)</label>
                <InputNumber v-model="borrowForm.soNgayMuon" :min="1" :max="60" fluid />
            </div>

            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Kiểm tra Điều kiện"
                    icon="pi pi-search"
                    severity="secondary"
                    outlined
                    :loading="checking"
                    @click="handleCheckEligibility"
                />
                <Button
                    type="button"
                    label="Tạo Phiếu Mượn"
                    icon="pi pi-check"
                    :loading="creating"
                    @click="handleCreateCounterBorrow"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog Sửa phiếu mượn -->
    <Dialog
        v-model:visible="editDialogVisible"
        header="Cập nhật Phiếu Mượn"
        modal
        :style="{ width: '460px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <div class="cr-field">
                <label class="cr-label">Trạng thái phiếu</label>
                <Select
                    v-model="editForm.trangThai"
                    :options="TRANG_THAI_MUON_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>
            <div class="cr-field">
                <label class="cr-label">Ngày hẹn trả</label>
                <DatePicker
                    v-model="editForm.ngayHenTra"
                    dateFormat="dd/mm/yy"
                    showIcon
                    fluid
                />
            </div>
            <div class="cr-field">
                <label class="cr-label">Ghi chú</label>
                <InputText v-model="editForm.ghiChu" fluid />
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="editDialogVisible = false"
                />
                <Button
                    label="Lưu thay đổi"
                    icon="pi pi-save"
                    :loading="creating"
                    @click="handleUpdateBorrow"
                />
            </div>
        </div>
    </Dialog>
</template>
