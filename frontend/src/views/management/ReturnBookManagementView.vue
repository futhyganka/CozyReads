<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import { formatDate } from '@/utils/formatters';

const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const activeBorrows = ref([]);
const filterMode = ref('all_active'); // 'all_active' | 'dangMuon' | 'quaHan'

const filterOptions = [
    { label: 'Tất cả sách đang mượn & quá hạn', value: 'all_active' },
    { label: 'Đang trong hạn mượn', value: 'dangMuon' },
    { label: 'Đang quá hạn trả', value: 'quaHan' },
];

async function fetchReturnableBorrows() {
    loading.value = true;
    try {
        if (filterMode.value === 'all_active') {
            const [bRes, oRes] = await Promise.all([
                muonTraService.getDanhSachPhieuMuon({
                    trangThai: 'dangMuon',
                    limit: 50,
                }),
                muonTraService.getDanhSachPhieuMuon({
                    trangThai: 'quaHan',
                    limit: 50,
                }),
            ]);
            activeBorrows.value = [
                ...(oRes.data || []),
                ...(bRes.data || []),
            ];
        } else {
            const res = await muonTraService.getDanhSachPhieuMuon({
                trangThai: filterMode.value,
                limit: 100,
            });
            activeBorrows.value = res.data || [];
        }
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

function handleReturnBook(item) {
    confirm.require({
        header: 'Xác nhận Tiếp nhận Trả Sách',
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
                await fetchReturnableBorrows();
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

onMounted(() => {
    fetchReturnableBorrows();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Tiếp nhận Trả sách tại Quầy</span>
                <div class="cr-items-center">
                    <Select
                        v-model="filterMode"
                        :options="filterOptions"
                        optionLabel="label"
                        optionValue="value"
                        @change="fetchReturnableBorrows"
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        @click="fetchReturnableBorrows"
                    />
                </div>
            </div>
        </template>
        <template #subtitle>
            Khi tiếp nhận trả sách, tồn kho sách được hoàn lại ngay. Quá hạn không phạt tiền, hệ thống đã tự động trừ điểm uy tín theo ngày.
        </template>
        <template #content>
            <Message severity="info" :closable="false" style="margin-bottom: 1rem">
                Chọn phiếu mượn bên dưới và nhấn <strong>Nhận trả sách</strong> khi độc giả mang sách đến quầy.
            </Message>

            <DataTable
                :value="activeBorrows"
                :loading="loading"
                paginator
                :rows="10"
                emptyMessage="Hiện không có phiếu mượn nào chờ trả."
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
                <Column header="Ngày mượn">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayMuon, true) }}
                    </template>
                </Column>
                <Column header="Ngày hẹn trả">
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
                        <Button
                            label="Nhận trả sách"
                            icon="pi pi-check-square"
                            size="small"
                            @click="handleReturnBook(data)"
                        />
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>
