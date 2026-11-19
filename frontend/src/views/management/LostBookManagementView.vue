<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import { formatDate, formatCurrency } from '@/utils/formatters';

const router = useRouter();
const toast = useToast();

const activeTab = ref('active');
const loading = ref(false);
const activeBorrows = ref([]);
const lostRecords = ref([]);

const dialogVisible = ref(false);
const selectedBorrow = ref(null);
const ghiChuBaoMat = ref('');
const submitting = ref(false);

async function loadData() {
    loading.value = true;
    try {
        const [bRes, oRes, lostRes, compRes] = await Promise.all([
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'dangMuon',
                limit: 50,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'quaHan',
                limit: 50,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'daMat',
                limit: 50,
            }),
            muonTraService.getDanhSachPhieuMuon({
                trangThai: 'daBoiThuong',
                limit: 50,
            }),
        ]);
        activeBorrows.value = [...(oRes.data || []), ...(bRes.data || [])];
        lostRecords.value = [...(lostRes.data || []), ...(compRes.data || [])];
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi tải dữ liệu',
            detail: err.message,
            life: 4000,
        });
    } finally {
        loading.value = false;
    }
}

function openReportLostDialog(item) {
    selectedBorrow.value = item;
    ghiChuBaoMat.value = '';
    dialogVisible.value = true;
}

async function handleConfirmLost() {
    if (!selectedBorrow.value) return;
    submitting.value = true;
    try {
        const res = await muonTraService.baoMatSach(selectedBorrow.value._id, {
            ghiChu: ghiChuBaoMat.value.trim(),
        });
        dialogVisible.value = false;
        toast.add({
            severity: 'success',
            summary: 'Đã ghi nhận báo mất/hỏng sách',
            detail: `Đã tạo khoản bồi thường mã ${res.data?.thanhToan?.maThanhToan || ''}`,
            life: 5000,
        });
        activeTab.value = 'lost';
        await loadData();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4500,
        });
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadData();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Xử lý báo mất / hỏng sách & bồi thường</span>
                <div class="cr-items-center">
                    <Button
                        label="Xác nhận tiền bồi thường"
                        icon="pi pi-wallet"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="router.push('/quan-ly/thanh-toan')"
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="loadData"
                    />
                </div>
            </div>
        </template>
        <template #subtitle>
            Báo mất/hỏng sách sẽ tự động trừ x2 điểm quá hạn và sinh phiếu thanh toán bồi thường theo đơn giá bìa của sách
        </template>
        <template #content>
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="active">
                        Sách đang mượn / quá hạn ({{ activeBorrows.length }})
                    </Tab>
                    <Tab value="lost">
                        Danh sách đã báo mất & đã bồi thường ({{ lostRecords.length }})
                    </Tab>
                </TabList>

                <TabPanels>
                    <TabPanel value="active">
                        <DataTable
                            :value="activeBorrows"
                            :loading="loading"
                            paginator
                            :rows="10"
                            emptyMessage="Không có phiếu đang mượn nào."
                        >
                            <Column header="Độc giả">
                                <template #body="{ data }">
                                    <strong>
                                        {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                                    </strong>
                                    <div class="cr-muted">{{ data.maDocGia?.maDocGia }}</div>
                                </template>
                            </Column>
                            <Column header="Đầu sách">
                                <template #body="{ data }">
                                    <strong>{{ data.maSach?.tenSach }}</strong>
                                    <div class="cr-muted">
                                        Giá bìa: {{ formatCurrency(data.maSach?.donGia) }}
                                    </div>
                                </template>
                            </Column>
                            <Column header="Hạn trả">
                                <template #body="{ data }">
                                    {{ formatDate(data.ngayHenTra) }}
                                </template>
                            </Column>
                            <Column header="Trạng thái">
                                <template #body="{ data }">
                                    <StatusTag type="muon" :value="data.trangThai" />
                                </template>
                            </Column>
                            <Column header="Thao tác">
                                <template #body="{ data }">
                                    <Button
                                        label="Ghi nhận mất/hỏng"
                                        icon="pi pi-exclamation-triangle"
                                        severity="danger"
                                        outlined
                                        size="small"
                                        @click="openReportLostDialog(data)"
                                    />
                                </template>
                            </Column>
                        </DataTable>
                    </TabPanel>

                    <TabPanel value="lost">
                        <DataTable
                            :value="lostRecords"
                            :loading="loading"
                            paginator
                            :rows="10"
                            emptyMessage="Chưa có trường hợp báo mất sách nào."
                        >
                            <Column header="Độc giả">
                                <template #body="{ data }">
                                    <strong>
                                        {{ data.maDocGia?.hoLot }} {{ data.maDocGia?.ten }}
                                    </strong>
                                    <div class="cr-muted">{{ data.maDocGia?.maDocGia }}</div>
                                </template>
                            </Column>
                            <Column header="Đầu sách">
                                <template #body="{ data }">
                                    <strong>{{ data.maSach?.tenSach }}</strong>
                                    <div class="cr-muted">{{ data.maSach?.maSach }}</div>
                                </template>
                            </Column>
                            <Column header="Mức bồi thường">
                                <template #body="{ data }">
                                    <strong>{{ formatCurrency(data.tienPhat) }}</strong>
                                </template>
                            </Column>
                            <Column header="Trạng thái">
                                <template #body="{ data }">
                                    <StatusTag type="muon" :value="data.trangThai" />
                                </template>
                            </Column>
                        </DataTable>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </template>
    </Card>

    <Dialog
        v-model:visible="dialogVisible"
        header="Xác nhận ghi nhận mất / hỏng sách"
        modal
        :style="{ width: '480px' }"
    >
        <div v-if="selectedBorrow" class="cr-flex-col cr-gap-md">
            <Message severity="warn" :closable="false">
                Độc giả <strong>{{ selectedBorrow.maDocGia?.hoLot }} {{ selectedBorrow.maDocGia?.ten }}</strong> làm mất/hỏng cuốn
                <strong>"{{ selectedBorrow.maSach?.tenSach }}"</strong>.
                <br />
                • Mức bồi thường: <strong>{{ formatCurrency(selectedBorrow.maSach?.donGia) }}</strong>
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
                    @click="dialogVisible = false"
                />
                <Button
                    label="Xác nhận & Tạo khoản bồi thường"
                    icon="pi pi-check"
                    severity="danger"
                    :loading="submitting"
                    @click="handleConfirmLost"
                />
            </div>
        </div>
    </Dialog>
</template>
