<script setup>
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, formatCurrency } from '@/utils/formatters';

const authStore = useAuthStore();
const loading = ref(true);
const errorMsg = ref('');
const allBorrows = ref([]);

const activeBorrows = computed(() =>
    allBorrows.value.filter((b) =>
        ['dangMuon', 'quaHan', 'daMat'].includes(b.trangThai),
    ),
);

async function loadActiveBorrows() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await muonTraService.getLichSuMuon(authStore.userId);
        allBorrows.value = res.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadActiveBorrows();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between">
                <span>Sách Đang Mượn / Chưa Hoàn Tất</span>
                <Button
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    size="small"
                    @click="loadActiveBorrows"
                />
            </div>
        </template>
        <template #subtitle>
            Danh sách các cuốn sách bạn đang mượn, quá hạn hoặc đang chờ bồi thường
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <DataTable
                :value="activeBorrows"
                :loading="loading"
                paginator
                :rows="10"
                emptyMessage="Bạn hiện không có cuốn sách nào đang mượn."
            >
                <Column header="Đầu sách">
                    <template #body="{ data }">
                        <strong>{{ data.maSach?.tenSach || 'Sách thư viện' }}</strong>
                        <div class="cr-muted">Mã: {{ data.maSach?.maSach }}</div>
                    </template>
                </Column>
                <Column header="Ngày mượn">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayMuon) }}
                    </template>
                </Column>
                <Column header="Ngày hẹn trả">
                    <template #body="{ data }">
                        <strong>{{ formatDate(data.ngayHenTra) }}</strong>
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="muon" :value="data.trangThai" />
                    </template>
                </Column>
                <Column header="Tiền bồi thường (nếu mất)">
                    <template #body="{ data }">
                        {{ data.tienPhat > 0 ? formatCurrency(data.tienPhat) : '—' }}
                    </template>
                </Column>
                <Column field="ghiChu" header="Ghi chú" />
            </DataTable>
        </template>
    </Card>
</template>
