<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
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
import { formatDate, formatCurrency } from '@/utils/formatters';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const allBorrows = ref([]);
const activeGroupTab = ref('all'); // 'all' | 'reserve' | 'active' | 'lost' | 'completed'

const filters = reactive({
    search: '',
    trangThai: null,
});

// 1. Tạo phiếu mượn tại quầy
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

// 2. Báo mất / hỏng sách
const lostDialogVisible = ref(false);
const selectedLostBorrow = ref(null);
const ghiChuBaoMat = ref('');
const submittingLost = ref(false);

// 3. Cập nhật phiếu mượn
const editDialogVisible = ref(false);
const editingBorrow = ref(null);
const editForm = reactive({
    trangThai: '',
    ngayHenTra: null,
});

// 4. Chi tiết phiếu mượn
const detailDialogVisible = ref(false);
const selectedDetailBorrow = ref(null);

function openDetailBorrowDialog(item) {
    selectedDetailBorrow.value = item;
    detailDialogVisible.value = true;
}

// Thống kê nhanh theo nhóm nghiệp vụ
const stats = computed(() => {
    const list = allBorrows.value;
    return {
        total: list.length,
        reserve: list.filter((b) => b.trangThai === 'yeuCau_giuSach').length,
        active: list.filter((b) =>
            ['dangMuon', 'quaHan'].includes(b.trangThai),
        ).length,
        overdue: list.filter((b) => b.trangThai === 'quaHan').length,
        lost: list.filter((b) =>
            ['daMat', 'daBoiThuong'].includes(b.trangThai),
        ).length,
    };
});

// Danh sách phiếu mượn sau khi lọc theo Tab nhóm, Trạng thái chi tiết và Từ khóa tìm kiếm
const filteredBorrows = computed(() => {
    let list = allBorrows.value;

    // Lọc theo Tab nhóm nghiệp vụ
    if (activeGroupTab.value === 'reserve') {
        list = list.filter((b) => b.trangThai === 'yeuCau_giuSach');
    } else if (activeGroupTab.value === 'active') {
        list = list.filter((b) => ['dangMuon', 'quaHan'].includes(b.trangThai));
    } else if (activeGroupTab.value === 'lost') {
        list = list.filter((b) =>
            ['daMat', 'daBoiThuong'].includes(b.trangThai),
        );
    } else if (activeGroupTab.value === 'completed') {
        list = list.filter((b) => ['daTra', 'daHuy'].includes(b.trangThai));
    }

    // Lọc theo trạng thái chi tiết
    if (filters.trangThai) {
        list = list.filter((b) => b.trangThai === filters.trangThai);
    }

    // Tìm kiếm theo Mã ĐG, Họ tên ĐG, SĐT, Mã sách, Tên sách, MSNV xử lý
    const kw = filters.search.trim().toLowerCase();
    if (kw) {
        list = list.filter((b) => {
            const maDocGia = (b.maDocGia?.maDocGia || '').toLowerCase();
            const hoTen =
                `${b.maDocGia?.hoLot || ''} ${b.maDocGia?.ten || ''}`
                    .trim()
                    .toLowerCase();
            const dienThoai = (b.maDocGia?.dienThoai || '').toLowerCase();
            const email = (b.maDocGia?.email || '').toLowerCase();
            const maSach = (b.maSach?.maSach || '').toLowerCase();
            const tenSach = (b.maSach?.tenSach || '').toLowerCase();
            const msnvMuon = (b.msnvMuon?.msnv || '').toLowerCase();
            const msnvTra = (b.msnvTra?.msnv || '').toLowerCase();

            return (
                maDocGia.includes(kw) ||
                hoTen.includes(kw) ||
                dienThoai.includes(kw) ||
                email.includes(kw) ||
                maSach.includes(kw) ||
                tenSach.includes(kw) ||
                msnvMuon.includes(kw) ||
                msnvTra.includes(kw)
            );
        });
    }

    return list;
});

function handleTabChange(val) {
    activeGroupTab.value = val;
    filters.trangThai = null;
}

function handleResetFilters() {
    filters.search = '';
    filters.trangThai = null;
    activeGroupTab.value = 'all';
}

async function fetchBorrows() {
    loading.value = true;
    try {
        const res = await muonTraService.getDanhSachPhieuMuon({
            page: 1,
            limit: 500,
        });
        allBorrows.value = res.data || [];
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi tải danh sách phiếu mượn',
            detail: err.message,
            life: 4000,
        });
    } finally {
        loading.value = false;
    }
}

// =========================================================================
// 1. NGHIỆP VỤ TẠO PHIẾU MƯỢN TẠI QUẦY & GIAO SÁCH GIỮ ONLINE
// =========================================================================
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
                limit: 200,
            }),
            sachService.getDanhSachSach({ conHang: true, limit: 200 }),
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
        checkError.value = 'Vui lòng chọn độc giả và đầu sách cần kiểm tra.';
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
        checkError.value = 'Vui lòng chọn độc giả và đầu sách.';
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
        header: 'Xác nhận giao sách giữ online tại quầy',
        message: `Xác nhận độc giả "${item.maDocGia?.hoLot || ''} ${item.maDocGia?.ten || ''}" nhận sách "${item.maSach?.tenSach}" tại quầy (thời hạn mượn 14 ngày)?`,
        icon: 'pi pi-check-circle',
        acceptLabel: 'Xác nhận giao sách',
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

// =========================================================================
// 2. NGHIỆP VỤ TIẾP NHẬN TRẢ SÁCH TẠI QUẦY
// =========================================================================
function handleReturnBook(item) {
    confirm.require({
        header: 'Xác nhận tiếp nhận trả sách',
        message: `Xác nhận độc giả "${item.maDocGia?.hoLot || ''} ${item.maDocGia?.ten || ''}" hoàn trả cuốn "${item.maSach?.tenSach}"? Tồn kho sách sẽ tự động cộng thêm 1.`,
        icon: 'pi pi-check-square',
        acceptLabel: 'Tiếp nhận trả sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await muonTraService.traSach(item._id, {});
                toast.add({
                    severity: 'success',
                    summary: 'Trả sách thành công',
                    detail: res.message,
                    life: 3500,
                });
                await fetchBorrows();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể trả sách',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

// =========================================================================
// 3. NGHIỆP VỤ BÁO MẤT / HỎNG SÁCH & BỒI THƯỜNG
// =========================================================================
function openReportLostDialog(item) {
    selectedLostBorrow.value = item;
    ghiChuBaoMat.value = '';
    lostDialogVisible.value = true;
}

async function handleConfirmLost() {
    if (!selectedLostBorrow.value) return;
    submittingLost.value = true;
    try {
        const res = await muonTraService.baoMatSach(
            selectedLostBorrow.value._id,
            {
                ghiChu: ghiChuBaoMat.value.trim(),
            },
        );
        lostDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã ghi nhận báo mất/hỏng sách',
            detail: `Đã tạo khoản bồi thường mã ${res.data?.thanhToan?.maThanhToan || ''}`,
            life: 5000,
        });
        await fetchBorrows();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4500,
        });
    } finally {
        submittingLost.value = false;
    }
}

// =========================================================================
// 4. CẬP NHẬT & XÓA PHIẾU MƯỢN
// =========================================================================
function openEditBorrowDialog(item) {
    editingBorrow.value = item;
    editForm.trangThai = item.trangThai;
    editForm.ngayHenTra = item.ngayHenTra ? new Date(item.ngayHenTra) : null;
    editDialogVisible.value = true;
}

async function handleUpdateBorrow() {
    if (!editingBorrow.value) return;
    creating.value = true;
    try {
        await muonTraService.capNhatPhieuMuon(editingBorrow.value._id, {
            trangThai: editForm.trangThai,
            ngayHenTra: editForm.ngayHenTra,
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
        header: 'Xác nhận xóa phiếu mượn',
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
    <div class="cr-flex-col cr-gap-lg">
        <Card>
            <template #title>
                <div class="cr-flex-between cr-flex-wrap">
                    <span>Quản lý phiếu mượn, trả sách & báo mất</span>
                    <div class="cr-items-center cr-flex-wrap">
                        <Button
                            label="Xác nhận tiền bồi thường"
                            severity="secondary"
                            outlined
                            size="small"
                            @click="router.push('/quan-ly/thanh-toan')"
                        />
                        <Button
                            label="Tạo phiếu mượn tại quầy"
                            size="small"
                            @click="openCreateBorrowDialog"
                        />
                    </div>
                </div>
            </template>
            <template #subtitle>
                Tích hợp toàn bộ nghiệp vụ mượn sách tại quầy, giao sách giữ trực tuyến (24h), tiếp nhận trả sách và ghi nhận mất/hỏng sách
            </template>
            <template #content>
                <!-- Tabs chuyển nhanh nhóm nghiệp vụ -->
                <Tabs
                    :value="activeGroupTab"
                    style="margin-bottom: 1rem"
                    @update:value="handleTabChange"
                >
                    <TabList>
                        <Tab value="all">
                            Tất cả phiếu ({{ stats.total }})
                        </Tab>
                        <Tab value="reserve">
                            Giữ sách chờ nhận 24h ({{ stats.reserve }})
                        </Tab>
                        <Tab value="active">
                            Đang mượn & quá hạn - chờ trả ({{ stats.active }})
                        </Tab>
                        <Tab value="lost">
                            Báo mất & bồi thường ({{ stats.lost }})
                        </Tab>
                        <Tab value="completed">
                            Đã trả / đã hủy
                        </Tab>
                    </TabList>
                </Tabs>

                <!-- Thanh tìm kiếm & lọc chi tiết -->
                <div class="cr-toolbar">
                    <div
                        class="cr-items-center cr-flex-wrap"
                        style="flex: 1"
                    >
                        <InputText
                            v-model="filters.search"
                            placeholder="Tìm mã ĐG, họ tên, SĐT, mã sách, tên sách, MSNV..."
                            style="min-width: 300px; flex: 1; max-width: 460px"
                        />
                        <Select
                            v-model="filters.trangThai"
                            :options="TRANG_THAI_MUON_OPTIONS"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Tất cả trạng thái"
                            showClear
                        />
                        <Button
                            v-if="
                                filters.search ||
                                filters.trangThai ||
                                activeGroupTab !== 'all'
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
                            title="Làm mới dữ liệu"
                            :loading="loading"
                            @click="fetchBorrows"
                        />
                    </div>
                    <span class="cr-muted">
                        Hiển thị <strong>{{ filteredBorrows.length }}</strong> phiếu
                    </span>
                </div>

                <DataTable
                    :value="filteredBorrows"
                    :loading="loading"
                    paginator
                    :rows="10"
                    :rowsPerPageOptions="[10, 20, 50]"
                    emptyMessage="Không tìm thấy phiếu mượn/giữ sách nào phù hợp."
                >
                    <Column header="Độc giả">
                        <template #body="{ data }">
                            <strong>
                                {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                            </strong>
                            <div class="cr-muted">
                                {{ data.maDocGia?.maDocGia }}
                            </div>
                        </template>
                    </Column>

                    <Column header="Đầu sách">
                        <template #body="{ data }">
                            <strong>{{ data.maSach?.tenSach }}</strong>
                            <div class="cr-muted">
                                {{ data.maSach?.maSach }}
                            </div>
                        </template>
                    </Column>

                    <Column header="Ngày mượn / giữ">
                        <template #body="{ data }">
                            {{ formatDate(data.ngayMuon, true) }}
                        </template>
                    </Column>

                    <Column header="Hạn nhận / trả">
                        <template #body="{ data }">
                            <strong>{{ formatDate(data.ngayHenTra, true) }}</strong>
                        </template>
                    </Column>

                    <Column header="Trạng thái">
                        <template #body="{ data }">
                            <StatusTag type="muon" :value="data.trangThai" />
                        </template>
                    </Column>

                    <Column header="Thao tác">
                        <template #body="{ data }">
                            <div class="cr-items-center cr-flex-wrap">
                                <Button
                                    label="Chi tiết"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    @click="openDetailBorrowDialog(data)"
                                />

                                <!-- 1. Giao sách giữ online 24h -->
                                <Button
                                    v-if="data.trangThai === 'yeuCau_giuSach'"
                                    label="Giao sách"
                                    size="small"
                                    title="Xác nhận giao sách giữ trực tuyến tại quầy"
                                    @click="handleConfirmCounterPickup(data)"
                                />

                                <!-- 2. Tiếp nhận trả sách & Báo mất/hỏng -->
                                <template
                                    v-if="
                                        data.trangThai === 'dangMuon' ||
                                        data.trangThai === 'quaHan'
                                    "
                                >
                                    <Button
                                        label="Nhận sách"
                                        size="small"
                                        severity="success"
                                        title="Tiếp nhận trả sách tại quầy (hoàn tồn kho +1)"
                                        @click="handleReturnBook(data)"
                                    />
                                    <Button
                                        label="Báo mất/hỏng"
                                        size="small"
                                        severity="danger"
                                        outlined
                                        title="Ghi nhận mất/hỏng sách và tạo khoản bồi thường"
                                        @click="openReportLostDialog(data)"
                                    />
                                </template>

                                <!-- 3. Sửa / Xóa phiếu -->
                                <Button
                                    icon="pi pi-pencil"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    title="Cập nhật trạng thái / hạn trả"
                                    @click="openEditBorrowDialog(data)"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    severity="danger"
                                    outlined
                                    size="small"
                                    title="Xóa phiếu (chỉ áp dụng cho phiếu đã trả / đã hủy)"
                                    @click="handleDeleteBorrow(data)"
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>

        <!-- Dialog 1: Tạo phiếu mượn tại quầy -->
        <Dialog
            v-model:visible="createDialogVisible"
            header="Tạo phiếu mượn sách trực tiếp tại quầy"
            modal
            :style="{ width: '540px' }"
        >
            <div class="cr-flex-col cr-gap-md">
                <Message v-if="checkError" severity="error">
                    {{ checkError }}
                </Message>

                <Message v-if="checkResult" severity="success" :closable="false">
                    Độc giả
                    <strong>
                        {{ checkResult.docGia?.hoLot }} {{ checkResult.docGia?.ten }}
                    </strong>
                    đủ điều kiện mượn! Đang giữ:
                    <strong>
                        {{ checkResult.soSachDangGiu }}/{{ checkResult.soSachToiDa }}
                    </strong>
                    cuốn.
                </Message>

                <div class="cr-field">
                    <label class="cr-label">Chọn độc giả *</label>
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
                    <label class="cr-label">Chọn đầu sách (còn tồn kho) *</label>
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
                    <label class="cr-label">Số ngày mượn (mặc định 14 ngày)</label>
                    <InputNumber
                        v-model="borrowForm.soNgayMuon"
                        :min="1"
                        :max="60"
                        fluid
                    />
                </div>

                <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                    <Button
                        type="button"
                        label="Kiểm tra điều kiện"
                        severity="secondary"
                        outlined
                        :loading="checking"
                        @click="handleCheckEligibility"
                    />
                    <Button
                        type="button"
                        label="Tạo phiếu mượn"
                        :loading="creating"
                        @click="handleCreateCounterBorrow"
                    />
                </div>
            </div>
        </Dialog>

        <!-- Dialog 2: Xác nhận báo mất / hỏng sách -->
        <Dialog
            v-model:visible="lostDialogVisible"
            header="Xác nhận ghi nhận mất / hỏng sách"
            modal
            :style="{ width: '480px' }"
        >
            <div v-if="selectedLostBorrow" class="cr-flex-col cr-gap-md">
                <Message severity="warn" :closable="false">
                    Độc giả
                    <strong>
                        {{ selectedLostBorrow.maDocGia?.hoLot }}
                        {{ selectedLostBorrow.maDocGia?.ten }}
                    </strong>
                    làm mất/hỏng cuốn
                    <strong>"{{ selectedLostBorrow.maSach?.tenSach }}"</strong>.
                    <br />
                    • Mức bồi thường:
                    <strong>
                        {{ formatCurrency(selectedLostBorrow.maSach?.donGia) }}
                    </strong>
                    <br />
                    • Điểm uy tín: Trừ gấp 2 lần (x2) mức điểm quá hạn.
                </Message>

                <div class="cr-field">
                    <label class="cr-label">Ghi chú tình trạng mất / hư hỏng</label>
                    <InputText
                        v-model="ghiChuBaoMat"
                        placeholder="VD: Mất sách, rách bìa không thể phục hồi..."
                        fluid
                    />
                </div>

                <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                    <Button
                        label="Hủy"
                        severity="secondary"
                        outlined
                        @click="lostDialogVisible = false"
                    />
                    <Button
                        label="Xác nhận & tạo khoản bồi thường"
                        severity="danger"
                        :loading="submittingLost"
                        @click="handleConfirmLost"
                    />
                </div>
            </div>
        </Dialog>

        <!-- Dialog 3: Cập nhật phiếu mượn -->
        <Dialog
            v-model:visible="editDialogVisible"
            header="Cập nhật phiếu mượn"
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
                <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                    <Button
                        label="Hủy"
                        severity="secondary"
                        outlined
                        @click="editDialogVisible = false"
                    />
                    <Button
                        label="Lưu thay đổi"
                        :loading="creating"
                        @click="handleUpdateBorrow"
                    />
                </div>
            </div>
        </Dialog>

        <!-- Dialog 4: Chi tiết phiếu mượn -->
        <Dialog
            v-model:visible="detailDialogVisible"
            header="Chi tiết phiếu mượn"
            modal
            :style="{ width: '540px', maxWidth: '95vw' }"
        >
            <div v-if="selectedDetailBorrow" class="cr-flex-col cr-gap-md">
                <div class="cr-grid-2">
                    <div>
                        <span class="cr-muted">Độc giả:</span>
                        <div>
                            <strong>
                                {{ selectedDetailBorrow.maDocGia?.hoLot }}
                                {{ selectedDetailBorrow.maDocGia?.ten }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Mã độc giả:</span>
                        <div>
                            <strong>{{ selectedDetailBorrow.maDocGia?.maDocGia || '—' }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Số điện thoại:</span>
                        <div>
                            <strong>{{ selectedDetailBorrow.maDocGia?.dienThoai || '—' }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Email:</span>
                        <div>
                            <strong>{{ selectedDetailBorrow.maDocGia?.email || '—' }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Tên sách:</span>
                        <div>
                            <strong>{{ selectedDetailBorrow.maSach?.tenSach || '—' }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Mã sách & giá bìa:</span>
                        <div>
                            <strong>
                                {{ selectedDetailBorrow.maSach?.maSach || '—' }}
                                ({{ formatCurrency(selectedDetailBorrow.maSach?.donGia) }})
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Ngày mượn / đặt giữ:</span>
                        <div>
                            <strong>{{ formatDate(selectedDetailBorrow.ngayMuon, true) }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Hạn nhận / hạn trả:</span>
                        <div>
                            <strong>{{ formatDate(selectedDetailBorrow.ngayHenTra, true) }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Ngày trả thực tế:</span>
                        <div>
                            <strong>{{ formatDate(selectedDetailBorrow.ngayTra, true) }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Trạng thái phiếu:</span>
                        <div>
                            <StatusTag type="muon" :value="selectedDetailBorrow.trangThai" />
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nhân viên giao sách:</span>
                        <div>
                            <strong v-if="selectedDetailBorrow.msnvMuon">
                                {{ selectedDetailBorrow.msnvMuon.hoTenNv || '' }}
                                ({{ selectedDetailBorrow.msnvMuon.msnv }})
                            </strong>
                            <span v-else class="cr-muted">Đặt giữ trực tuyến</span>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nhân viên nhận trả / xử lý:</span>
                        <div>
                            <strong v-if="selectedDetailBorrow.msnvTra">
                                {{ selectedDetailBorrow.msnvTra.hoTenNv || '' }}
                                ({{ selectedDetailBorrow.msnvTra.msnv }})
                            </strong>
                            <span v-else class="cr-muted">Chưa xử lý</span>
                        </div>
                    </div>
                    <div v-if="selectedDetailBorrow.tienPhat > 0" class="cr-field-full">
                        <span class="cr-muted">Mức tiền bồi thường mất/hỏng sách:</span>
                        <div style="color: #c53030; font-weight: 700; font-size: 1.05rem">
                            {{ formatCurrency(selectedDetailBorrow.tienPhat) }}
                        </div>
                    </div>
                </div>
                <div class="cr-flex" style="justify-content: flex-end">
                    <Button
                        label="Đóng"
                        severity="secondary"
                        outlined
                        @click="detailDialogVisible = false"
                    />
                </div>
            </div>
        </Dialog>
    </div>
</template>
