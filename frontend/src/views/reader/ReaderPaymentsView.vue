<script setup>
import { ref, onMounted } from 'vue';
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

const renewalDialogVisible = ref(false);
const goiGiaHan = ref('1_thang');
const phuongThuc = ref('tienMat');
const creating = ref(false);

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
                <span>Phí Gia hạn & Bồi thường Mất sách</span>
                <div class="cr-items-center">
                    <Button
                        v-if="authStore.userProfile?.loaiDocGia === 'docGia_tuDo'"
                        label="Tạo yêu cầu Gia hạn thẻ"
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
                <Column field="maThanhToan" header="Mã giao dịch" />
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
                        {{ getPhuongThucLabel(data.phuongThuc) }}
                    </template>
                </Column>
                <Column header="Ngày tạo">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayTao, true) }}
                    </template>
                </Column>
                <Column header="Ngày xác nhận">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayThanhToan, true) }}
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="thanhToan" :value="data.trangThai" />
                    </template>
                </Column>
                <Column field="ghiChu" header="Ghi chú" />
            </DataTable>
        </template>
    </Card>

    <Dialog
        v-model:visible="renewalDialogVisible"
        header="Tạo yêu cầu Thanh toán Gia hạn Thẻ"
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
                    label="Xác nhận Tạo"
                    icon="pi pi-check"
                    :loading="creating"
                    fluid
                    @click="handleCreateRenewalPayment"
                />
            </div>
        </div>
    </Dialog>
</template>
