<script setup>
import { ref, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';
import { TRANG_THAI_MUON_OPTIONS } from '@/utils/constants';
import { formatDate, formatCurrency } from '@/utils/formatters';

const authStore = useAuthStore();
const loading = ref(true);
const errorMsg = ref('');
const records = ref([]);
const statusFilter = ref(null);

const filteredRecords = computed(() => {
    if (!statusFilter.value) return records.value;
    return records.value.filter((r) => r.trangThai === statusFilter.value);
});

async function loadHistory() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await muonTraService.getLichSuMuon(authStore.userId);
        records.value = res.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadHistory();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Toàn bộ lịch sử mượn & trả sách</span>
                <div class="cr-items-center">
                    <Select
                        v-model="statusFilter"
                        :options="TRANG_THAI_MUON_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tất cả trạng thái"
                        showClear
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        @click="loadHistory"
                    />
                </div>
            </div>
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <DataTable
                :value="filteredRecords"
                :loading="loading"
                paginator
                :rows="10"
                emptyMessage="Không có lịch sử mượn trả nào."
            >
                <Column header="Đầu sách">
                    <template #body="{ data }">
                        <strong>{{ data.maSach?.tenSach || 'Sách thư viện' }}</strong>
                        <div class="cr-muted">Mã: {{ data.maSach?.maSach }}</div>
                    </template>
                </Column>
                <Column header="Ngày mượn / giữ">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayMuon) }}
                    </template>
                </Column>
                <Column header="Hạn trả">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayHenTra) }}
                    </template>
                </Column>
                <Column header="Ngày trả thực tế">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayTra) }}
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="muon" :value="data.trangThai" />
                    </template>
                </Column>
                <Column header="Bồi thường">
                    <template #body="{ data }">
                        {{ data.tienPhat > 0 ? formatCurrency(data.tienPhat) : '—' }}
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>
