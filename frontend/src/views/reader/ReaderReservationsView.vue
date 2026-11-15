<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/utils/formatters';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const errorMsg = ref('');
const allRecords = ref([]);

const reservations = computed(() =>
    allRecords.value.filter((item) =>
        ['yeuCau_giuSach', 'daHuy'].includes(item.trangThai),
    ),
);

async function loadReservations() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const res = await muonTraService.getLichSuMuon(authStore.userId);
        allRecords.value = res.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadReservations();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Yêu cầu Giữ sách Trực tuyến (24 giờ)</span>
                <div class="cr-items-center">
                    <Button
                        label="Khám phá & Đặt giữ thêm"
                        icon="pi pi-plus"
                        size="small"
                        @click="router.push('/kham-pha')"
                    />
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        size="small"
                        @click="loadReservations"
                    />
                </div>
            </div>
        </template>
        <template #subtitle>
            Vui lòng đến quầy thư viện trước thời hạn giữ sách để thủ thư xác nhận bàn giao sách
        </template>
        <template #content>
            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <DataTable
                :value="reservations"
                :loading="loading"
                paginator
                :rows="10"
                emptyMessage="Bạn chưa có yêu cầu giữ sách trực tuyến nào."
            >
                <Column header="Đầu sách">
                    <template #body="{ data }">
                        <strong>{{ data.maSach?.tenSach || 'Sách thư viện' }}</strong>
                        <div class="cr-muted">Mã: {{ data.maSach?.maSach }}</div>
                    </template>
                </Column>
                <Column header="Thời điểm đặt giữ">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayMuon, true) }}
                    </template>
                </Column>
                <Column header="Hạn chót nhận tại quầy (24h)">
                    <template #body="{ data }">
                        <strong>{{ formatDate(data.ngayHenTra, true) }}</strong>
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="muon" :value="data.trangThai" />
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>
