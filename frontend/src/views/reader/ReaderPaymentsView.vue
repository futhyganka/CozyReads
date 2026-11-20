<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import thanhToanService from '@/services/thanhtoan.service';
import docGiaService from '@/services/docgia.service';
import { useAuthStore } from '@/stores/auth.store';
import { readImageFileAsDataUrl } from '@/utils/imageUpload';
import {
    GOI_GIA_HAN_OPTIONS,
    PHUONG_THUC_THANH_TOAN_OPTIONS,
} from '@/utils/constants';
import {
    formatCurrency,
    formatDate,
    getPhuongThucLabel,
} from '@/utils/formatters';

const toast = useToast();
const authStore = useAuthStore();

const loading = ref(true);
const errorMsg = ref('');
const payments = ref([]);

// Tạo yêu cầu gia hạn
const renewalDialogVisible = ref(false);
const goiGiaHan = ref('1_thang');
const phuongThuc = ref('tienMat');
const creating = ref(false);

// Đổi phương thức & Gửi minh chứng thanh toán
const payDialogVisible = ref(false);
const selectedPayment = ref(null);
const savingPay = ref(false);
const payForm = reactive({
    phuongThuc: 'chuyenKhoan',
    anhMinhChung: '',
    fileName: '',
});
const fileInputRef = ref(null);

// Xem ảnh minh chứng phóng to
const previewImageVisible = ref(false);
const previewImageUrl = ref('');

function openPayDialog(payment) {
    selectedPayment.value = payment;
    payForm.phuongThuc = payment.phuongThuc || 'chuyenKhoan';
    payForm.anhMinhChung = payment.anhMinhChung || '';
    payForm.fileName = payment.anhMinhChung ? 'Ảnh minh chứng hiện tại' : '';
    payDialogVisible.value = true;
}

function openImagePreview(url) {
    if (!url) return;
    previewImageUrl.value = url;
    previewImageVisible.value = true;
}

async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const dataUrl = await readImageFileAsDataUrl(file, {
            maxWidth: 1200,
            maxHeight: 1600,
            quality: 0.85,
        });
        payForm.anhMinhChung = dataUrl;
        payForm.fileName = file.name;
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

function triggerFileInput() {
    fileInputRef.value?.click();
}

function removeEvidence() {
    payForm.anhMinhChung = '';
    payForm.fileName = '';
    if (fileInputRef.value) fileInputRef.value.value = '';
}

async function copyToClipboard(text, label = 'nội dung') {
    try {
        await navigator.clipboard.writeText(text);
        toast.add({
            severity: 'success',
            summary: 'Đã sao chép',
            detail: `Đã sao chép ${label} vào bộ nhớ tạm.`,
            life: 2500,
        });
    } catch {
        toast.add({
            severity: 'warn',
            summary: 'Thông báo',
            detail: `Không thể tự động sao chép. Vui lòng copy thủ công: ${text}`,
            life: 4000,
        });
    }
}

async function handleSavePaymentMethodAndEvidence() {
    if (!selectedPayment.value) return;

    // Chỉ cho phép gửi khi đã nộp ảnh minh chứng (trừ phương thức tiền mặt)
    if (payForm.phuongThuc !== 'tienMat' && !payForm.anhMinhChung) {
        toast.add({
            severity: 'warn',
            summary: 'Chưa có minh chứng',
            detail: 'Vui lòng tải lên ảnh minh chứng chuyển khoản trước khi gửi.',
            life: 3500,
        });
        return;
    }

    savingPay.value = true;
    try {
        await thanhToanService.capNhatThanhToan(selectedPayment.value._id, {
            phuongThuc: payForm.phuongThuc,
            anhMinhChung: payForm.phuongThuc === 'tienMat' ? '' : payForm.anhMinhChung,
        });

        toast.add({
            severity: 'success',
            summary: 'Thành công',
            detail:
                payForm.phuongThuc === 'tienMat'
                    ? 'Đã cập nhật phương thức thanh toán tiền mặt tại quầy.'
                    : 'Đã gửi ảnh minh chứng thanh toán. Vui lòng chờ nhân viên kiểm tra và xác nhận.',
            life: 3500,
        });
        payDialogVisible.value = false;
        await loadPayments();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        savingPay.value = false;
    }
}

async function loadPayments() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await thanhToanService.getThanhToanCuaDocGia(authStore.userId);
        payments.value = res.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleCreateRenewalPayment() {
    creating.value = true;
    try {
        const res = await docGiaService.taoKhoanThanhToanGiaHan(
            authStore.userId,
            {
                goiGiaHan: goiGiaHan.value,
                phuongThuc: phuongThuc.value,
            },
        );
        renewalDialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã tạo khoản thanh toán',
            detail: `Mã giao dịch: ${res.data?.maThanhToan}`,
            life: 4000,
        });
        await loadPayments();
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

onMounted(() => {
    loadPayments();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Phí gia hạn & bồi thường mất sách</span>
                <div class="cr-items-center">
                    <Button
                        v-if="authStore.userProfile?.loaiDocGia === 'docGia_tuDo'"
                        label="Tạo yêu cầu gia hạn thẻ"
                        icon="pi pi-plus"
                        size="small"
                        @click="renewalDialogVisible = true"
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="loadPayments"
                    />
                </div>
            </div>
        </template>
        <template #subtitle>
            Các khoản phí gia hạn thẻ hoặc bồi thường làm mất/hỏng sách của bạn
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <DataTable
                :value="payments"
                :loading="loading"
                paginator
                :rows="10"
                emptyMessage="Bạn chưa có giao dịch thanh toán nào."
            >
                <Column
                    field="maThanhToan"
                    header="Mã giao dịch"
                    style="min-width: 120px; max-width: 140px; overflow-wrap: anywhere"
                />
                <Column header="Loại phí">
                    <template #body="{ data }">
                        <StatusTag type="loaiThanhToan" :value="data.loai" />
                    </template>
                </Column>
                <Column header="Số tiền">
                    <template #body="{ data }">
                        <strong>{{ formatCurrency(data.soTien) }}</strong>
                    </template>
                </Column>
                <Column header="Phương thức">
                    <template #body="{ data }">
                        <div class="cr-items-center cr-gap-xs">
                            <span>{{ getPhuongThucLabel(data.phuongThuc) }}</span>
                        </div>
                    </template>
                </Column>
                <Column header="Ngày tạo">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayTao, true) }}
                    </template>
                </Column>
                <Column header="Ngày xử lý">
                    <template #body="{ data }">
                        <div v-if="data.ngayThanhToan">
                            <div>{{ formatDate(data.ngayThanhToan, true) }}</div>
                        </div>
                        <span v-else class="cr-muted">—</span>
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="thanhToan" :value="data.trangThai" />
                    </template>
                </Column>
                <Column field="ghiChu" header="Ghi chú" />
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-flex-col cr-gap-xs" style="align-items: flex-start">
                            <Button
                                v-if="data.trangThai === 'choXacNhan'"
                                label="Thanh toán"
                                size="small"
                                severity="primary"
                                title="Thanh toán hoặc đổi phương thức"
                                @click="openPayDialog(data)"
                            />
                            <span
                                v-if="data.anhMinhChung"
                                class="cr-evidence-pill"
                                title="Đã tải lên ảnh minh chứng thanh toán (bấm để xem)"
                                @click="openImagePreview(data.anhMinhChung)"
                            >
                                <i class="pi pi-paperclip"></i> Minh chứng
                            </span>
                            <span
                                v-if="data.trangThai !== 'choXacNhan' && !data.anhMinhChung"
                                class="cr-muted"
                            >
                                —
                            </span>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <!-- Dialog Thanh toán trực tuyến / Đổi phương thức & Gửi minh chứng -->
    <Dialog
        v-model:visible="payDialogVisible"
        header="Thông tin thanh toán & Minh chứng"
        modal
        :style="{ width: '540px', maxWidth: '95vw' }"
    >
        <div v-if="selectedPayment" class="cr-flex-col cr-gap-md">
            <!-- Tóm tắt khoản phí -->
            <div class="cr-grid-2">
                <div>
                    <span class="cr-muted">Mã giao dịch:</span>
                    <div>
                        <strong>{{ selectedPayment.maThanhToan }}</strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Loại khoản phí:</span>
                    <div>
                        <StatusTag type="loaiThanhToan" :value="selectedPayment.loai" />
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Số tiền cần thanh toán:</span>
                    <div>
                        <strong style="color: var(--cr-primary); font-size: 1.15rem">
                            {{ formatCurrency(selectedPayment.soTien) }}
                        </strong>
                    </div>
                </div>
                <div>
                    <span class="cr-muted">Trạng thái:</span>
                    <div>
                        <StatusTag type="thanhToan" :value="selectedPayment.trangThai" />
                    </div>
                </div>
            </div>

            <!-- Lựa chọn phương thức thanh toán -->
            <div class="cr-field">
                <label class="cr-label">Phương thức thanh toán</label>
                <Select
                    v-model="payForm.phuongThuc"
                    :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>

            <!-- Trường hợp: Chuyển khoản ngân hàng -->
            <div
                v-if="payForm.phuongThuc === 'chuyenKhoan'"
                class="cr-flex-col cr-gap-sm"
            >
                <div class="cr-grid-2">
                    <div>
                        <span class="cr-muted">Ngân hàng:</span>
                        <div><strong>Vietcombank (VCB)</strong></div>
                    </div>
                    <div>
                        <span class="cr-muted">Chủ tài khoản:</span>
                        <div><strong>THU VIEN COZYREADS</strong></div>
                    </div>
                    <div>
                        <span class="cr-muted">Số tài khoản:</span>
                        <div class="cr-flex cr-items-center cr-gap-xs">
                            <strong>0123456789</strong>
                            <Button
                                icon="pi pi-copy"
                                text
                                rounded
                                size="small"
                                severity="secondary"
                                title="Sao chép số tài khoản"
                                @click="copyToClipboard('0123456789', 'số tài khoản')"
                            />
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nội dung chuyển khoản:</span>
                        <div class="cr-flex cr-items-center cr-gap-xs">
                            <strong>{{ selectedPayment.maThanhToan }}</strong>
                            <Button
                                icon="pi pi-copy"
                                text
                                rounded
                                size="small"
                                severity="secondary"
                                title="Sao chép nội dung chuyển khoản"
                                @click="copyToClipboard(selectedPayment.maThanhToan, 'nội dung chuyển khoản')"
                            />
                        </div>
                    </div>
                </div>

                <Message severity="warn" :closable="false">
                    LƯU Ý QUAN TRỌNG: Nội dung chuyển khoản phải ghi chính xác mã đơn:
                    <strong>{{ selectedPayment.maThanhToan }}</strong>. Nếu ghi sai, hệ thống không thể tự động nhận diện thanh toán cho bạn.
                </Message>
            </div>

            <!-- Trường hợp: Ví điện tử -->
            <div
                v-else-if="payForm.phuongThuc === 'viDienTu'"
                class="cr-flex-col cr-gap-sm"
            >
                <div class="cr-grid-2">
                    <div>
                        <span class="cr-muted">Ví hỗ trợ:</span>
                        <div><strong>MoMo / ZaloPay</strong></div>
                    </div>
                    <div>
                        <span class="cr-muted">Người nhận:</span>
                        <div><strong>THU VIEN COZYREADS</strong></div>
                    </div>
                    <div>
                        <span class="cr-muted">Số điện thoại ví:</span>
                        <div class="cr-flex cr-items-center cr-gap-xs">
                            <strong>0901234567</strong>
                            <Button
                                icon="pi pi-copy"
                                text
                                rounded
                                size="small"
                                severity="secondary"
                                title="Sao chép số điện thoại"
                                @click="copyToClipboard('0901234567', 'số điện thoại')"
                            />
                        </div>
                    </div>
                    <div>
                        <span class="cr-muted">Nội dung chuyển khoản:</span>
                        <div class="cr-flex cr-items-center cr-gap-xs">
                            <strong>{{ selectedPayment.maThanhToan }}</strong>
                            <Button
                                icon="pi pi-copy"
                                text
                                rounded
                                size="small"
                                severity="secondary"
                                title="Sao chép nội dung"
                                @click="copyToClipboard(selectedPayment.maThanhToan, 'nội dung')"
                            />
                        </div>
                    </div>
                </div>

                <Message severity="warn" :closable="false">
                    LƯU Ý QUAN TRỌNG: Nội dung chuyển khoản phải ghi chính xác mã đơn:
                    <strong>{{ selectedPayment.maThanhToan }}</strong>. Nếu ghi sai, hệ thống không thể tự động nhận diện thanh toán cho bạn.
                </Message>
            </div>

            <!-- Trường hợp: Tiền mặt tại quầy -->
            <div v-else-if="payForm.phuongThuc === 'tienMat'">
                <Message severity="info" :closable="false">
                    Quý độc giả vui lòng mang mã giao dịch
                    <strong>{{ selectedPayment.maThanhToan }}</strong>
                    đến quầy thủ thư CozyReads để thanh toán số tiền
                    <strong>{{ formatCurrency(selectedPayment.soTien) }}</strong>.
                </Message>
            </div>

            <!-- Tải lên ảnh minh chứng thanh toán (chỉ cho chuyển khoản hoặc ví điện tử) -->
            <div v-if="payForm.phuongThuc !== 'tienMat'" class="cr-field">
                <label class="cr-label">
                    Ảnh minh chứng thanh toán <span style="color: var(--cr-primary)">*</span>
                </label>
                <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileChange"
                />

                <div class="cr-flex cr-items-center cr-gap-sm">
                    <Button
                        type="button"
                        label="Chọn tệp ảnh"
                        icon="pi pi-upload"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="triggerFileInput"
                    />
                    <span class="cr-muted" style="font-size: 0.85rem">
                        {{ payForm.fileName || 'Chưa có tệp nào được chọn' }}
                    </span>
                    <Button
                        v-if="payForm.anhMinhChung"
                        icon="pi pi-times"
                        severity="danger"
                        text
                        rounded
                        size="small"
                        title="Xóa ảnh"
                        @click="removeEvidence"
                    />
                </div>

                <!-- Xem trước ảnh minh chứng -->
                <div v-if="payForm.anhMinhChung" style="margin-top: 8px">
                    <img
                        :src="payForm.anhMinhChung"
                        alt="Minh chứng thanh toán"
                        style="
                            max-width: 200px;
                            max-height: 150px;
                            object-fit: contain;
                            border-radius: 8px;
                            border: 1px solid var(--p-content-border-color, var(--cr-border));
                            cursor: pointer;
                            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                        "
                        title="Bấm để xem kích thước lớn"
                        @click="openImagePreview(payForm.anhMinhChung)"
                    />
                    <div class="cr-muted" style="font-size: 0.75rem; margin-top: 4px">
                        (Bấm vào ảnh để xem kích thước lớn)
                    </div>
                </div>
            </div>

            <!-- Nút hành động -->
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end; margin-top: 0.5rem">
                <Button
                    label="Đóng"
                    severity="secondary"
                    outlined
                    @click="payDialogVisible = false"
                />
                <Button
                    :label="
                        payForm.phuongThuc === 'tienMat'
                            ? 'Xác nhận phương thức'
                            : 'Lưu & Gửi minh chứng'
                    "
                    icon="pi pi-check"
                    severity="primary"
                    :loading="savingPay"
                    @click="handleSavePaymentMethodAndEvidence"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog xem ảnh minh chứng phóng to -->
    <Dialog
        v-model:visible="previewImageVisible"
        header="Ảnh minh chứng thanh toán"
        modal
        :style="{ width: '500px', maxWidth: '95vw' }"
    >
        <div style="text-align: center; padding: 0.5rem">
            <img
                :src="previewImageUrl"
                alt="Ảnh minh chứng"
                style="max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15)"
            />
        </div>
    </Dialog>

    <Dialog
        v-model:visible="renewalDialogVisible"
        header="Tạo yêu cầu thanh toán gia hạn thẻ"
        modal
        :style="{ width: '440px' }"
    >
        <div class="cr-flex-col cr-gap-md">
            <div class="cr-field">
                <label class="cr-label">Gói gia hạn</label>
                <Select
                    v-model="goiGiaHan"
                    :options="GOI_GIA_HAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>
            <div class="cr-field">
                <label class="cr-label">Phương thức thanh toán</label>
                <Select
                    v-model="phuongThuc"
                    :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
            </div>
            <div class="cr-flex cr-gap-sm">
                <Button
                    label="Hủy"
                    severity="secondary"
                    outlined
                    fluid
                    @click="renewalDialogVisible = false"
                />
                <Button
                    label="Xác nhận tạo"
                    icon="pi pi-check"
                    :loading="creating"
                    fluid
                    @click="handleCreateRenewalPayment"
                />
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
.cr-evidence-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 12px;
    background: var(--cr-sage-light, #edf1e9);
    color: var(--cr-sage-dark, #526549);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.cr-evidence-pill:hover {
    background: #e2e8dd;
    transform: translateY(-1px);
}
</style>
