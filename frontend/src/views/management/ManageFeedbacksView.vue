<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import StatusTag from '@/components/common/StatusTag.vue';
import phanHoiService from '@/services/phanhoi.service';
import {
    TRANG_THAI_PHAN_HOI,
    TRANG_THAI_PHAN_HOI_OPTIONS,
} from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

const toast = useToast();

const loading = ref(false);
const errorMsg = ref('');
const feedbacks = ref([]);
const totalRecords = ref(0);

const stats = reactive({
    tongSo: 0,
    choXuLy: 0,
    dangXuLy: 0,
    daXuLy: 0,
});

const filters = reactive({
    search: '',
    trangThai: null,
    ngayGui: null,
    page: 1,
    limit: 10,
});

const detailVisible = ref(false);
const selectedFeedback = ref(null);
const updatingId = ref(null);

function getSenderDisplayName(docGia) {
    if (!docGia) return 'Ẩn danh';
    return `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim() || 'Độc giả';
}

function truncateText(text, maxLength = 80) {
    if (!text) return '—';
    const str = String(text).trim();
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

async function fetchFeedbacks() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const params = {
            page: filters.page,
            limit: filters.limit,
        };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.trangThai) params.trangThai = filters.trangThai;
        if (filters.ngayGui) {
            const d = new Date(filters.ngayGui);
            if (!isNaN(d.getTime())) {
                params.ngayGui = d.toISOString();
            }
        }

        const res = await phanHoiService.getDanhSachGopY(params);
        feedbacks.value = res.data || [];
        totalRecords.value = res.total || 0;
        if (res.stats) {
            stats.tongSo = res.stats.tongSo || 0;
            stats.choXuLy = res.stats.choXuLy || 0;
            stats.dangXuLy = res.stats.dangXuLy || 0;
            stats.daXuLy = res.stats.daXuLy || 0;
        }
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

function handleApplyFilter() {
    filters.page = 1;
    fetchFeedbacks();
}

function handleResetFilter() {
    filters.search = '';
    filters.trangThai = null;
    filters.ngayGui = null;
    filters.page = 1;
    fetchFeedbacks();
}

function onPageChange(event) {
    filters.page = event.page + 1;
    filters.limit = event.rows;
    fetchFeedbacks();
}

async function openDetailDialog(item) {
    selectedFeedback.value = item;
    detailVisible.value = true;

    try {
        const res = await phanHoiService.getChiTietPhanHoi(item._id, {
            loai: 'gopY',
        });
        if (res.data) {
            selectedFeedback.value = res.data;
        }
    } catch {
        // Giữ nguyên dữ liệu hiện có nếu lỗi mạng nhẹ
    }
}

async function handleUpdateFeedbackStatus(item, nextStatus) {
    updatingId.value = item._id;
    try {
        const res = await phanHoiService.capNhatTrangThai(item._id, {
            trangThai: nextStatus,
            loai: 'gopY',
        });
        if (selectedFeedback.value && selectedFeedback.value._id === item._id) {
            selectedFeedback.value = res.data;
        }
        toast.add({
            severity: 'success',
            summary: 'Cập nhật thành công',
            detail:
                nextStatus === TRANG_THAI_PHAN_HOI.DANG_XU_LY
                    ? `Đã tiếp nhận góp ý [${item.maPhanHoi}].`
                    : `Đã đánh dấu hoàn tất xử lý góp ý [${item.maPhanHoi}].`,
            life: 3500,
        });
        await fetchFeedbacks();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Không thể cập nhật trạng thái',
            detail: err.message,
            life: 4000,
        });
    } finally {
        updatingId.value = null;
    }
}

onMounted(() => {
    fetchFeedbacks();
});
</script>

<template>
    <div>
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Quản lý góp ý</h1>
                <p class="cr-page-subtitle">
                    Tiếp nhận, xem xét và xử lý các ý kiến đóng góp từ độc giả gửi về thư viện
                </p>
            </div>
            <Button
                label="Làm mới"
                severity="secondary"
                outlined
                :loading="loading"
                @click="fetchFeedbacks"
            />
        </div>

        <!-- Bộ lọc -->
        <Card class="cr-section">
            <template #content>
                <form
                    class="cr-flex-col cr-gap-md"
                    @submit.prevent="handleApplyFilter"
                >
                    <div class="cr-grid-3">
                        <div class="cr-field">
                            <label class="cr-label">Tìm kiếm</label>
                            <InputText
                                v-model="filters.search"
                                placeholder="Mã góp ý, nội dung, thông tin độc giả..."
                                fluid
                            />
                        </div>
                        <div class="cr-field">
                            <label class="cr-label">Trạng thái</label>
                            <Select
                                v-model="filters.trangThai"
                                :options="TRANG_THAI_PHAN_HOI_OPTIONS"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tất cả trạng thái"
                                showClear
                                fluid
                            />
                        </div>
                        <div class="cr-field">
                            <label class="cr-label">Ngày gửi</label>
                            <DatePicker
                                v-model="filters.ngayGui"
                                dateFormat="dd/mm/yy"
                                placeholder="Chọn ngày gửi"
                                showIcon
                                showButtonBar
                                fluid
                            />
                        </div>
                    </div>

                    <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                        <Button
                            type="button"
                            label="Đặt lại"
                            icon="pi pi-filter-slash"
                            severity="secondary"
                            outlined
                            @click="handleResetFilter"
                        />
                        <Button
                            type="submit"
                            label="Lọc danh sách"
                            icon="pi pi-search"
                            :loading="loading"
                        />
                    </div>
                </form>
            </template>
        </Card>

        <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
            {{ errorMsg }}
        </Message>

        <!-- Bảng danh sách góp ý -->
        <Card>
            <template #content>
                <DataTable
                    :value="feedbacks"
                    :loading="loading"
                    emptyMessage="Không có bản ghi góp ý nào phù hợp."
                    responsiveLayout="scroll"
                >
                    <Column field="maPhanHoi" header="Mã góp ý">
                        <template #body="{ data }">
                            <strong>{{ data.maPhanHoi }}</strong>
                        </template>
                    </Column>

                    <Column header="Người gửi">
                        <template #body="{ data }">
                            <template v-if="data.maDocGia">
                                <div>
                                    <strong>{{ getSenderDisplayName(data.maDocGia) }}</strong>
                                </div>
                                <div class="cr-muted">
                                    Mã ĐG: {{ data.maDocGia.maDocGia }}
                                </div>
                            </template>
                            <Tag v-else value="Ẩn danh" severity="secondary" />
                        </template>
                    </Column>

                    <Column header="Nội dung góp ý">
                        <template #body="{ data }">
                            <span :title="data.noiDung">
                                {{ truncateText(data.noiDung, 80) }}
                            </span>
                        </template>
                    </Column>

                    <Column header="Ngày gửi">
                        <template #body="{ data }">
                            {{ formatDate(data.createdAt, true) }}
                        </template>
                    </Column>

                    <Column header="Trạng thái">
                        <template #body="{ data }">
                            <StatusTag type="phanHoi" :value="data.trangThai" />
                        </template>
                    </Column>

                    <Column header="Thao tác">
                        <template #body="{ data }">
                            <div class="cr-items-center cr-flex-wrap">
                                <Button
                                    label="Chi tiết"
                                    size="small"
                                    severity="secondary"
                                    outlined
                                    @click="openDetailDialog(data)"
                                />
                                <Button
                                    v-if="data.trangThai === TRANG_THAI_PHAN_HOI.CHO_XU_LY"
                                    label="Tiếp nhận"
                                    size="small"
                                    severity="info"
                                    outlined
                                    :loading="updatingId === data._id"
                                    @click="
                                        handleUpdateFeedbackStatus(
                                            data,
                                            TRANG_THAI_PHAN_HOI.DANG_XU_LY,
                                        )
                                    "
                                />
                                <Button
                                    v-if="data.trangThai !== TRANG_THAI_PHAN_HOI.DA_XU_LY"
                                    label="Đã xử lý"
                                    size="small"
                                    severity="success"
                                    :loading="updatingId === data._id"
                                    @click="
                                        handleUpdateFeedbackStatus(
                                            data,
                                            TRANG_THAI_PHAN_HOI.DA_XU_LY,
                                        )
                                    "
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>

                <div v-if="totalRecords > 0" style="margin-top: 1rem">
                    <Paginator
                        :rows="filters.limit"
                        :totalRecords="totalRecords"
                        :first="(filters.page - 1) * filters.limit"
                        :rowsPerPageOptions="[10, 20, 50]"
                        @page="onPageChange"
                    />
                </div>
            </template>
        </Card>

        <!-- Dialog Xem chi tiết & Xử lý Góp ý (Không có gửi Email phản hồi) -->
        <Dialog
            v-model:visible="detailVisible"
            header="Chi tiết ý kiến góp ý"
            modal
            :style="{ width: '600px', maxWidth: '95vw' }"
        >
            <div v-if="selectedFeedback" class="cr-flex-col cr-gap-md">
                <div class="cr-grid-2">
                    <div>
                        <span class="cr-muted">Mã góp ý:</span>
                        <div>
                            <strong>{{ selectedFeedback.maPhanHoi }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Trạng thái:</span>
                        <div>
                            <StatusTag
                                type="phanHoi"
                                :value="selectedFeedback.trangThai"
                            />
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Người gửi:</span>
                        <div>
                            <strong v-if="selectedFeedback.maDocGia">
                                {{ getSenderDisplayName(selectedFeedback.maDocGia) }}
                                ({{ selectedFeedback.maDocGia.maDocGia }})
                            </strong>
                            <Tag v-else value="Ẩn danh" severity="secondary" />
                        </div>
                    </div>
                    <div v-if="selectedFeedback.maDocGia">
                        <span class="cr-muted">Thông tin liên lạc độc giả:</span>
                        <div>
                            <strong>{{ selectedFeedback.maDocGia.email || '—' }}</strong>
                            <span v-if="selectedFeedback.maDocGia.dienThoai" class="cr-muted">
                                — {{ selectedFeedback.maDocGia.dienThoai }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Ngày gửi:</span>
                        <div>
                            <strong>
                                {{ formatDate(selectedFeedback.createdAt, true) }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nhân viên xử lý:</span>
                        <div>
                            <strong v-if="selectedFeedback.msnvXuLy">
                                {{ selectedFeedback.msnvXuLy.hoTenNv }} ({{ selectedFeedback.msnvXuLy.msnv }})
                            </strong>
                            <span v-else class="cr-muted">Chưa xử lý</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="cr-label" style="margin-bottom: 0.375rem">
                        Nội dung góp ý:
                    </div>
                    <Card>
                        <template #content>
                            <p style="white-space: pre-wrap; margin: 0">
                                {{ selectedFeedback.noiDung }}
                            </p>
                        </template>
                    </Card>
                </div>

                <Divider style="margin: 0.25rem 0" />

                <div class="cr-flex-between cr-flex-wrap">
                    <div class="cr-items-center cr-flex-wrap">
                        <Button
                            v-if="
                                selectedFeedback.trangThai ===
                                TRANG_THAI_PHAN_HOI.CHO_XU_LY
                            "
                            type="button"
                            label="Tiếp nhận góp ý (Đang xử lý)"
                            severity="info"
                            outlined
                            :loading="updatingId === selectedFeedback._id"
                            @click="
                                handleUpdateFeedbackStatus(
                                    selectedFeedback,
                                    TRANG_THAI_PHAN_HOI.DANG_XU_LY,
                                )
                            "
                        />
                        <Button
                            v-if="
                                selectedFeedback.trangThai !==
                                TRANG_THAI_PHAN_HOI.DA_XU_LY
                            "
                            type="button"
                            label="Đánh dấu đã xử lý"
                            severity="success"
                            :loading="updatingId === selectedFeedback._id"
                            @click="
                                handleUpdateFeedbackStatus(
                                    selectedFeedback,
                                    TRANG_THAI_PHAN_HOI.DA_XU_LY,
                                )
                            "
                        />
                    </div>
                    <Button
                        type="button"
                        label="Đóng"
                        severity="secondary"
                        outlined
                        @click="detailVisible = false"
                    />
                </div>
            </div>
        </Dialog>
    </div>
</template>
