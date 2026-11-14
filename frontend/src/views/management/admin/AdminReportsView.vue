<script setup>
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Chart from 'primevue/chart';
import Button from 'primevue/button';
import Message from 'primevue/message';
import sachService from '@/services/sach.service';
import docGiaService from '@/services/docgia.service';
import muonTraService from '@/services/muontra.service';
import thanhToanService from '@/services/thanhtoan.service';
import { formatCurrency } from '@/utils/formatters';

const loading = ref(true);
const errorMsg = ref('');

const books = ref([]);
const readers = ref([]);
const borrows = ref([]);
const payments = ref([]);

const financialStats = computed(() => {
    const paidRenewal = payments.value
        .filter((p) => p.loai === 'phi_giaHan' && p.trangThai === 'daThanhToan')
        .reduce((s, p) => s + (p.soTien || 0), 0);

    const paidCompensation = payments.value
        .filter(
            (p) =>
                p.loai === 'phiPhat_matSach' && p.trangThai === 'daThanhToan',
        )
        .reduce((s, p) => s + (p.soTien || 0), 0);

    const pendingTotal = payments.value
        .filter((p) => p.trangThai === 'choXacNhan')
        .reduce((s, p) => s + (p.soTien || 0), 0);

    return [
        {
            hangMuc: 'Thu phí gia hạn thẻ (Đã xác nhận)',
            soGiaoDich: payments.value.filter(
                (p) => p.loai === 'phi_giaHan' && p.trangThai === 'daThanhToan',
            ).length,
            tongTien: paidRenewal,
        },
        {
            hangMuc: 'Thu tiền bồi thường mất/hỏng sách (Đã xác nhận)',
            soGiaoDich: payments.value.filter(
                (p) =>
                    p.loai === 'phiPhat_matSach' &&
                    p.trangThai === 'daThanhToan',
            ).length,
            tongTien: paidCompensation,
        },
        {
            hangMuc: 'Các khoản phí đang chờ xác nhận',
            soGiaoDich: payments.value.filter(
                (p) => p.trangThai === 'choXacNhan',
            ).length,
            tongTien: pendingTotal,
        },
    ];
});

const readerTypeChart = computed(() => {
    const counts = {
        docGia_tuDo: 0,
        sinhVien: 0,
        giangVien: 0,
        nhanVien: 0,
    };
    for (const r of readers.value) {
        if (counts[r.loaiDocGia] !== undefined) counts[r.loaiDocGia] += 1;
    }
    return {
        labels: ['Độc giả tự do', 'Sinh viên', 'Giảng viên', 'Nhân viên'],
        datasets: [
            {
                label: 'Số lượng độc giả',
                backgroundColor: ['#A65C25', '#526549', '#A8B59A', '#75685B'],
                data: [
                    counts.docGia_tuDo,
                    counts.sinhVien,
                    counts.giangVien,
                    counts.nhanVien,
                ],
            },
        ],
    };
});

async function loadReportData() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const [bRes, rRes, mRes, pRes] = await Promise.all([
            sachService.getDanhSachSach({ limit: 200 }),
            docGiaService.getDanhSachDocGia({ limit: 200 }),
            muonTraService.getDanhSachPhieuMuon({ limit: 200 }),
            thanhToanService.getDanhSachThanhToan({ limit: 200 }),
        ]);
        books.value = bRes.data || [];
        readers.value = rRes.data || [];
        borrows.value = mRes.data || [];
        payments.value = pRes.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadReportData();
});
</script>

<template>
    <div class="cr-flex-col cr-gap-lg">
        <div class="cr-page-header" style="margin-bottom: 0">
            <div>
                <h1 class="cr-page-title">Báo cáo & Thống kê Hệ thống</h1>
                <p class="cr-page-subtitle">
                    Số liệu tổng hợp trực tiếp từ dữ liệu thực tế của Backend CozyReads
                </p>
            </div>
            <Button
                label="Làm mới dữ liệu"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                @click="loadReportData"
            />
        </div>

        <Message v-if="errorMsg" severity="error">{{ errorMsg }}</Message>

        <Card>
            <template #title>Tổng hợp Tài chính & Các khoản Phí</template>
            <template #content>
                <DataTable :value="financialStats" :loading="loading">
                    <Column field="hangMuc" header="Hạng mục thống kê" />
                    <Column field="soGiaoDich" header="Số lượng giao dịch" />
                    <Column header="Tổng số tiền">
                        <template #body="{ data }">
                            <strong>{{ formatCurrency(data.tongTien) }}</strong>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>

        <div class="cr-grid-2">
            <Card>
                <template #title>Phân bổ Đối tượng Độc giả</template>
                <template #content>
                    <Chart type="bar" :data="readerTypeChart" />
                </template>
            </Card>

            <Card>
                <template #title>Chỉ số Tồn kho Sách</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-md">
                        <div class="cr-flex-between">
                            <span class="cr-muted">Tổng số đầu sách:</span>
                            <strong>{{ books.length }} đầu sách</strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Tổng số bản sách khả dụng trong kho:</span>
                            <strong>
                                {{
                                    books.reduce(
                                        (sum, b) => sum + (b.soQuyen || 0),
                                        0,
                                    )
                                }}
                                quyển
                            </strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Đầu sách đã hết trong kho (soQuyen = 0):</span>
                            <strong>
                                {{ books.filter((b) => b.soQuyen <= 0).length }} đầu sách
                            </strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Tổng lượt mượn/giữ đã ghi nhận:</span>
                            <strong>{{ borrows.length }} lượt</strong>
                        </div>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
