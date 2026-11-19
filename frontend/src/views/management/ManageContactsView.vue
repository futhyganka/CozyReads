<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Paginator from 'primevue/paginator';
import Message from 'primevue/message';
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
const contacts = ref([]);
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

// Chi tiết & Phản hồi
const detailVisible = ref(false);
const selectedContact = ref(null);
const replyContent = ref('');
const replyError = ref('');
const replyApiError = ref('');
const sendingReply = ref(false);
const updatingStatusId = ref(null);

function getReaderFullName(docGia) {
    if (!docGia) return '—';
    return `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim() || '—';
}

function truncateText(text, maxLength = 75) {
    if (!text) return '—';
    const str = String(text).trim();
    return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}

async function fetchContacts() {
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

        const res = await phanHoiService.getDanhSachLienHe(params);
        contacts.value = res.data || [];
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
    fetchContacts();
}

function handleResetFilter() {
    filters.search = '';
    filters.trangThai = null;
    filters.ngayGui = null;
    filters.page = 1;
    fetchContacts();
}

function onPageChange(event) {
    filters.page = event.page + 1;
    filters.limit = event.rows;
    fetchContacts();
}

async function openDetailDialog(item) {
    selectedContact.value = item;
    replyContent.value = item.noiDungPhanHoi || '';
    replyError.value = '';
    replyApiError.value = '';
    detailVisible.value = true;

    try {
        const res = await phanHoiService.getChiTietPhanHoi(item._id, {
            loai: 'lienHe',
        });
        if (res.data) {
            selectedContact.value = res.data;
            if (!replyContent.value && res.data.noiDungPhanHoi) {
                replyContent.value = res.data.noiDungPhanHoi;
            }
        }
    } catch {
        // Giữ nguyên dữ liệu hàng đã chọn nếu gọi chi tiết bị lỗi nhẹ
    }
}

async function handleReceiveContact(item) {
    updatingStatusId.value = item._id;
    try {
        const res = await phanHoiService.capNhatTrangThai(item._id, {
            trangThai: TRANG_THAI_PHAN_HOI.DANG_XU_LY,
            loai: 'lienHe',
        });
        if (selectedContact.value && selectedContact.value._id === item._id) {
            selectedContact.value = res.data;
        }
        toast.add({
            severity: 'success',
            summary: 'Đã tiếp nhận',
            detail: `Đã chuyển liên hệ [${item.maPhanHoi}] sang trạng thái Đang xử lý.`,
            life: 3500,
        });
        await fetchContacts();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Không thể cập nhật',
            detail: err.message,
            life: 4000,
        });
    } finally {
        updatingStatusId.value = null;
    }
}

function validateReply() {
    if (!replyContent.value || !replyContent.value.trim()) {
        replyError.value = 'Nội dung phản hồi không được để trống.';
        return false;
    }
    replyError.value = '';
    return true;
}

async function handleSendReply() {
    if (!selectedContact.value) return;
    replyApiError.value = '';
    if (!validateReply()) {
        return;
    }

    sendingReply.value = true;
    try {
        const res = await phanHoiService.guiPhanHoiLienHe(
            selectedContact.value._id,
            {
                noiDungPhanHoi: replyContent.value.trim(),
            },
        );
        selectedContact.value = res.data;
        toast.add({
            severity: 'success',
            summary: 'Gửi phản hồi thành công',
            detail:
                res.message ||
                'Đã gửi Email phản hồi tới độc giả và cập nhật trạng thái Đã xử lý.',
            life: 4500,
        });
        await fetchContacts();
    } catch (err) {
        // Khi gửi Email thất bại: giữ nguyên nội dung đã nhập, không chuyển trạng thái daXuLy và báo lỗi rõ ràng
        replyApiError.value =
            err.message ||
            'Gửi Email phản hồi thất bại. Vui lòng kiểm tra kết nối và thử lại.';
        toast.add({
            severity: 'error',
            summary: 'Gửi Email thất bại',
            detail: replyApiError.value,
            life: 5000,
        });
    } finally {
        sendingReply.value = false;
    }
}

onMounted(() => {
    fetchContacts();
});
</script>

<template>
    <div>
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Quản lý liên hệ</h1>
                <p class="cr-page-subtitle">
                    Tiếp nhận và gửi phản hồi qua Email đối với các yêu cầu liên hệ từ độc giả
                </p>
            </div>
            <Button
                label="Làm mới"
                severity="secondary"
                outlined
                :loading="loading"
                @click="fetchContacts"
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
                                placeholder="Mã liên hệ, họ tên, email độc giả, nội dung..."
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

        <!-- Bảng danh sách liên hệ -->
        <Card>
            <template #content>
                <DataTable
                    :value="contacts"
                    :loading="loading"
                    emptyMessage="Không có bản ghi liên hệ nào phù hợp."
                    responsiveLayout="scroll"
                >
                    <Column field="maPhanHoi" header="Mã liên hệ">
                        <template #body="{ data }">
                            <strong>{{ data.maPhanHoi }}</strong>
                        </template>
                    </Column>

                    <Column header="Độc giả">
                        <template #body="{ data }">
                            <div>
                                <strong>{{ getReaderFullName(data.maDocGia) }}</strong>
                            </div>
                            <div v-if="data.maDocGia?.maDocGia" class="cr-muted">
                                {{ data.maDocGia.maDocGia }}
                            </div>
                        </template>
                    </Column>

                    <Column header="Nội dung liên hệ">
                        <template #body="{ data }">
                            <span :title="data.noiDung">
                                {{ truncateText(data.noiDung, 70) }}
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
                                    v-if="data.trangThai === TRANG_THAI_PHAN_HOI.CHO_XU_LY"
                                    label="Tiếp nhận"
                                    size="small"
                                    severity="secondary"
                                    outlined
                                    :loading="updatingStatusId === data._id"
                                    @click="handleReceiveContact(data)"
                                />
                                <Button
                                    :label="
                                        data.trangThai === TRANG_THAI_PHAN_HOI.DA_XU_LY
                                            ? 'Chi tiết'
                                            : 'Chi tiết & phản hồi'
                                    "
                                    size="small"
                                    :severity="
                                        data.trangThai === TRANG_THAI_PHAN_HOI.DA_XU_LY
                                            ? 'secondary'
                                            : 'primary'
                                    "
                                    :outlined="
                                        data.trangThai === TRANG_THAI_PHAN_HOI.DA_XU_LY
                                    "
                                    @click="openDetailDialog(data)"
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

        <!-- Dialog Chi tiết & Phản hồi Liên hệ -->
        <Dialog
            v-model:visible="detailVisible"
            header="Chi tiết yêu cầu liên hệ"
            modal
            :style="{ width: '640px', maxWidth: '95vw' }"
        >
            <div v-if="selectedContact" class="cr-flex-col cr-gap-md">
                <div class="cr-grid-2">
                    <div>
                        <span class="cr-muted">Mã liên hệ:</span>
                        <div>
                            <strong>{{ selectedContact.maPhanHoi }}</strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Trạng thái hiện tại:</span>
                        <div>
                            <StatusTag
                                type="phanHoi"
                                :value="selectedContact.trangThai"
                            />
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Mã độc giả:</span>
                        <div>
                            <strong>
                                {{ selectedContact.maDocGia?.maDocGia || '—' }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Họ tên độc giả:</span>
                        <div>
                            <strong>
                                {{ getReaderFullName(selectedContact.maDocGia) }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Email độc giả:</span>
                        <div>
                            <strong>
                                {{ selectedContact.maDocGia?.email || '—' }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Số điện thoại:</span>
                        <div>
                            <strong>
                                {{ selectedContact.maDocGia?.dienThoai || '—' }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Ngày gửi:</span>
                        <div>
                            <strong>
                                {{ formatDate(selectedContact.createdAt, true) }}
                            </strong>
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nhân viên xử lý:</span>
                        <div>
                            <strong v-if="selectedContact.msnvXuLy">
                                {{ selectedContact.msnvXuLy.hoTenNv }} ({{ selectedContact.msnvXuLy.msnv }})
                            </strong>
                            <span v-else class="cr-muted">Chưa xử lý</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="cr-label" style="margin-bottom: 0.375rem">
                        Nội dung liên hệ của độc giả:
                    </div>
                    <Card>
                        <template #content>
                            <p style="white-space: pre-wrap; margin: 0">
                                {{ selectedContact.noiDung }}
                            </p>
                        </template>
                    </Card>
                </div>

                <Divider style="margin: 0.25rem 0" />

                <!-- Khu vực phản hồi -->
                <div class="cr-flex-col cr-gap-sm">
                    <Message
                        v-if="replyApiError"
                        severity="error"
                        :closable="false"
                    >
                        {{ replyApiError }}
                    </Message>

                    <div class="cr-field">
                        <label class="cr-label" for="contact-reply-textarea">
                            Nội dung phản hồi *
                        </label>
                        <Textarea
                            id="contact-reply-textarea"
                            v-model="replyContent"
                            rows="5"
                            placeholder="Nhập nội dung phản hồi gửi tới Email của độc giả..."
                            :invalid="!!replyError"
                            :class="{ 'cr-input-invalid': !!replyError }"
                            fluid
                            @update:modelValue="validateReply"
                        />
                        <small v-if="replyError" class="cr-error">
                            {{ replyError }}
                        </small>
                        <span class="cr-muted">
                            Email sẽ được gửi đại diện cho <strong>Thư viện CozyReads</strong> tới địa chỉ
                            <strong>{{ selectedContact.maDocGia?.email || 'độc giả' }}</strong>.
                        </span>
                    </div>

                    <div
                        class="cr-flex-between cr-flex-wrap"
                        style="margin-top: 0.5rem"
                    >
                        <div>
                            <Button
                                v-if="
                                    selectedContact.trangThai ===
                                    TRANG_THAI_PHAN_HOI.CHO_XU_LY
                                "
                                type="button"
                                label="Tiếp nhận xử lý"
                                severity="secondary"
                                outlined
                                :loading="updatingStatusId === selectedContact._id"
                                @click="handleReceiveContact(selectedContact)"
                            />
                        </div>
                        <div class="cr-items-center">
                            <Button
                                type="button"
                                label="Đóng"
                                severity="secondary"
                                outlined
                                @click="detailVisible = false"
                            />
                            <Button
                                type="button"
                                label="Gửi phản hồi qua Email"
                                :loading="sendingReply"
                                @click="handleSendReply"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    </div>
</template>
