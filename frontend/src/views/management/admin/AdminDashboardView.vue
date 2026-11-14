<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import Message from 'primevue/message';
import nhanVienService from '@/services/nhanvien.service';
import docGiaService from '@/services/docgia.service';
import sachService from '@/services/sach.service';
import muonTraService from '@/services/muontra.service';
import thanhToanService from '@/services/thanhtoan.service';
import { formatCurrency } from '@/utils/formatters';

const router = useRouter();
const loading = ref(true);
const errorMsg = ref('');

const staffList = ref([]);
const readersList = ref([]);
const paymentsList = ref([]);
const borrowCounts = ref({
    yeuCau_giuSach: 0,
    dangMuon: 0,
    daTra: 0,
    quaHan: 0,
    daMat: 0,
    daBoiThuong: 0,
});
const totalBooks = ref(0);

const totalPaidAmount = computed(() =>
    paymentsList.value
        .filter((p) => p.trangThai === 'daThanhToan')
        .reduce((sum, p) => sum + (p.soTien || 0), 0),
);

const borrowChartData = computed(() => ({
    labels: [
        'Giữ sách (24h)',
        'Đang mượn',
        'Đã trả',
        'Quá hạn',
        'Báo mất',
        'Đã bồi thường',
    ],
    datasets: [
        {
            label: 'Số phiếu mượn',
            backgroundColor: [
                '#A8B59A',
                '#A65C25',
                '#526549',
                '#C53030',
                '#88471B',
                '#75685B',
            ],
            data: [
                borrowCounts.value.yeuCau_giuSach,
                borrowCounts.value.dangMuon,
                borrowCounts.value.daTra,
                borrowCounts.value.quaHan,
                borrowCounts.value.daMat,
                borrowCounts.value.daBoiThuong,
            ],
        },
    ],
}));

const readerStatusChartData = computed(() => {
    const active = readersList.value.filter(
        (r) => r.trangThaiTaiKhoan === 'hoatDong',
    ).length;
    const locked = readersList.value.filter(
        (r) => r.trangThaiTaiKhoan === 'tamKhoa',
    ).length;
    const cancelled = readersList.value.filter(
        (r) => r.trangThaiTaiKhoan === 'daHuy',
    ).length;
    return {
        labels: ['Hoạt động', 'Tạm khóa', 'Đã hủy'],
        datasets: [
            {
                backgroundColor: ['#526549', '#D69E2E', '#C53030'],
                data: [active, locked, cancelled],
            },
        ],
    };
});

async function loadAdminDashboard() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const [
            nvRes,
            dgRes,
            sachRes,
            ttRes,
            cGiu,
            cMuon,
            cTra,
            cQuaHan,
            cMat,
            cBoiThuong,
        ] = await Promise.all([
            nhanVienService.getDanhSachNhanVien({ limit: 100 }),
            docGiaService.getDanhSachDocGia({ limit: 200 }),
            sachService.getDanhSachSach({ limit: 1 }),
            thanhToanService.getDanhSachThanhToan({ limit: 200 }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'yeuCau_giuSach',
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'dangMuon',
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'daTra',
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'quaHan',
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'daMat',
                limit: 1,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'daBoiThuong',
                limit: 1,
            }),
        ]);

        staffList.value = nvRes.data || [];
        readersList.value = dgRes.data || [];
        totalBooks.value = sachRes.total || 0;
        paymentsList.value = ttRes.data || [];
        borrowCounts.value = {
            yeuCau_giuSach: cGiu.total || 0,
            dangMuon: cMuon.total || 0,
            daTra: cTra.total || 0,
            quaHan: cQuaHan.total || 0,
            daMat: cMat.total || 0,
            daBoiThuong: cBoiThuong.total || 0,
        };
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadAdminDashboard();
});
</script>

<template>
    <div class="cr-flex-col cr-gap-lg">
        <div class="cr-page-header" style="margin-bottom: 0">
            <div>
                <h1 class="cr-page-title">Dashboard Quản trị Hệ thống (Admin)</h1>
                <p class="cr-page-subtitle">
                    Tổng hợp dữ liệu nhân sự, tài khoản, lưu thông sách và nguồn thu phí thực tế từ hệ thống
                </p>
            </div>
            <div class="cr-items-center">
                <Button
                    label="Quản lý Nhân viên"
                    icon="pi pi-sitemap"
                    @click="router.push('/quan-ly/admin/nhan-vien')"
                />
                <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    @click="loadAdminDashboard"
                />
            </div>
        </div>

        <Message v-if="errorMsg" severity="error">{{ errorMsg }}</Message>

        <div class="cr-grid-stats">
            <Card>
                <template #content>
                    <div class="cr-muted">Tổng nhân sự hệ thống</div>
                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--cr-primary)">
                        {{ staffList.length }} nhân viên
                    </div>
                    <div class="cr-muted">
                        Đang làm việc:
                        {{ staffList.filter((s) => !s.daNghiViec).length }}
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-muted">Tổng hồ sơ độc giả</div>
                    <div style="font-size: 1.75rem; font-weight: 800">
                        {{ readersList.length }} độc giả
                    </div>
                    <div class="cr-muted">
                        Đang hoạt động:
                        {{
                            readersList.filter(
                                (r) => r.trangThaiTaiKhoan === 'hoatDong',
                            ).length
                        }}
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-muted">Tổng đầu sách trong kho</div>
                    <div style="font-size: 1.75rem; font-weight: 800">
                        {{ totalBooks }} đầu sách
                    </div>
                    <div class="cr-muted">
                        Đang mượn: {{ borrowCounts.dangMuon }} lượt
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-muted">Tổng phí đã xác nhận thu</div>
                    <div style="font-size: 1.65rem; font-weight: 800; color: var(--cr-sage-dark)">
                        {{ formatCurrency(totalPaidAmount) }}
                    </div>
                    <div class="cr-muted">
                        Tổng số GD: {{ paymentsList.length }}
                    </div>
                </template>
            </Card>
        </div>

        <div class="cr-grid-2">
            <Card>
                <template #title>Thống kê Phiếu Mượn theo Trạng thái</template>
                <template #content>
                    <Chart type="bar" :data="borrowChartData" />
                </template>
            </Card>

            <Card>
                <template #title>Tỷ lệ Trạng thái Thẻ Độc giả</template>
                <template #content>
                    <div style="max-width: 320px; margin: 0 auto">
                        <Chart type="doughnut" :data="readerStatusChartData" />
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
