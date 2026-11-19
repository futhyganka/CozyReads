<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import sachService from '@/services/sach.service';
import docGiaService from '@/services/docgia.service';
import muonTraService from '@/services/muontra.service';
import thanhToanService from '@/services/thanhtoan.service';
import { formatDate, formatCurrency } from '@/utils/formatters';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(true);
const errorMsg = ref('');

const summary = ref({
    totalBooks: 0,
    totalReaders: 0,
    pendingReservations: 0,
    activeBorrows: 0,
    overdueBorrows: 0,
    pendingPayments: 0,
});

const reservationList = ref([]);
const pendingPaymentList = ref([]);

async function loadDashboard() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const [
            booksRes,
            readersRes,
            resvRes,
            borrowingRes,
            overdueRes,
            paymentsRes,
        ] = await Promise.all([
            sachService.getDanhSachSach({ page: 1, limit: 1 }),
            docGiaService.getDanhSachDocGia({ page: 1, limit: 1 }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'yeuCau_giuSach',
                page: 1,
                limit: 5,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'dangMuon',
                page: 1,
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'quaHan',
                page: 1,
                limit: 1,
            }),
            thanhToanService.getDanhSachThanhToan({
                trangThai: 'choXacNhan',
                page: 1,
                limit: 5,
            }),
        ]);

        summary.value = {
            totalBooks: booksRes.total || 0,
            totalReaders: readersRes.total || 0,
            pendingReservations: resvRes.total || 0,
            activeBorrows: borrowingRes.total || 0,
            overdueBorrows: overdueRes.total || 0,
            pendingPayments: paymentsRes.total || 0,
        };

        reservationList.value = resvRes.data || [];
        pendingPaymentList.value = paymentsRes.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

function handleConfirmReservation(item) {
    confirm.require({
        header: 'Xác nhận giao sách tại quầy',
        message: `Xác nhận độc giả "${item.maDocGia?.hoLot || ''} ${item.maDocGia?.ten || ''}" nhận cuốn "${item.maSach?.tenSach}" (hạn mượn 14 ngày)?`,
        icon: 'pi pi-check-circle',
        acceptLabel: 'Xác nhận cho mượn',
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
                await loadDashboard();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Lỗi xác nhận',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

onMounted(() => {
    loadDashboard();
});
</script>

<template>
    <div class="cr-flex-col cr-gap-lg">
        <div class="cr-page-header" style="margin-bottom: 0">
            <div>
                <h1 class="cr-page-title">Dashboard nghiệp vụ thư viện</h1>
                <p class="cr-page-subtitle">
                    Tổng hợp tình hình mượn trả, giữ sách trực tuyến và giao dịch chờ xử lý tại quầy
                </p>
            </div>
            <div class="cr-items-center">
                <Button
                    label="Tạo phiếu mượn tại quầy"
                    @click="router.push('/quan-ly/phieu-muon')"
                />
                <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    @click="loadDashboard"
                />
            </div>
        </div>

        <Message v-if="errorMsg" severity="error">{{ errorMsg }}</Message>

        <div class="cr-grid-2">
            <Card>
                <template #title>
                    <div class="cr-flex-between">
                        <span>Yêu cầu giữ sách chờ nhận (24h)</span>
                        <Button
                            label="Xem tất cả"
                            size="small"
                            severity="secondary"
                            text
                            @click="router.push('/quan-ly/phieu-muon')"
                        />
                    </div>
                </template>
                <template #content>
                    <DataTable
                        :value="reservationList"
                        :loading="loading"
                        size="small"
                        emptyMessage="Không có yêu cầu giữ sách nào đang chờ."
                    >
                        <Column header="Độc giả">
                            <template #body="{ data }">
                                <strong>
                                    {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                                </strong>
                                <div class="cr-muted">{{ data.maDocGia?.maDocGia }}</div>
                            </template>
                        </Column>
                        <Column header="Sách giữ">
                            <template #body="{ data }">
                                {{ data.maSach?.tenSach }}
                                <div class="cr-muted">Hạn nhận: {{ formatDate(data.ngayHenTra, true) }}</div>
                            </template>
                        </Column>
                        <Column header="Thao tác">
                            <template #body="{ data }">
                                <Button
                                    label="Giao sách"
                                    size="small"
                                    @click="handleConfirmReservation(data)"
                                />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>

            <Card>
                <template #title>
                    <div class="cr-flex-between">
                        <span>Khoản thanh toán chờ xác nhận</span>
                        <Button
                            label="Quản lý thanh toán"
                            size="small"
                            severity="secondary"
                            text
                            @click="router.push('/quan-ly/thanh-toan')"
                        />
                    </div>
                </template>
                <template #content>
                    <DataTable
                        :value="pendingPaymentList"
                        :loading="loading"
                        size="small"
                        emptyMessage="Không có giao dịch chờ xác nhận."
                    >
                        <Column field="maThanhToan" header="Mã GD" />
                        <Column header="Độc giả">
                            <template #body="{ data }">
                                {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                                <div class="cr-muted">{{ data.maDocGia?.maDocGia }}</div>
                            </template>
                        </Column>
                        <Column header="Loại">
                            <template #body="{ data }">
                                <StatusTag type="loaiThanhToan" :value="data.loai" />
                            </template>
                        </Column>
                        <Column header="Số tiền">
                            <template #body="{ data }">
                                <strong>{{ formatCurrency(data.soTien) }}</strong>
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>
    </div>
</template>
