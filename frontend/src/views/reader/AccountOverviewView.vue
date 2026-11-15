<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import StatusTag from '@/components/common/StatusTag.vue';
import muonTraService from '@/services/muontra.service';
import thanhToanService from '@/services/thanhtoan.service';
import { useAuthStore } from '@/stores/auth.store';
import {
    formatDate,
    formatCurrency,
    getHanMucMuonTheoDiem,
} from '@/utils/formatters';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const errorMsg = ref('');
const borrows = ref([]);
const payments = ref([]);

const profile = computed(() => authStore.userProfile || {});
const maxBorrowLimit = computed(() =>
    getHanMucMuonTheoDiem(profile.value.diemDocGia),
);

const activeReservationsCount = computed(
    () =>
        borrows.value.filter((b) => b.trangThai === 'yeuCau_giuSach').length,
);

const activeBorrowsCount = computed(
    () =>
        borrows.value.filter((b) =>
            ['dangMuon', 'quaHan', 'daMat'].includes(b.trangThai),
        ).length,
);

const overdueCount = computed(
    () => borrows.value.filter((b) => b.trangThai === 'quaHan').length,
);

const pendingPayments = computed(() =>
    payments.value.filter((p) => p.trangThai === 'choXacNhan'),
);

async function loadOverview() {
    loading.value = true;
    errorMsg.value = '';
    try {
        await authStore.refreshProfile();
        if (!authStore.userId) return;

        const [borrowRes, payRes] = await Promise.all([
            muonTraService.getLichSuMuon(authStore.userId),
            thanhToanService.getThanhToanCuaDocGia(authStore.userId),
        ]);
        borrows.value = borrowRes.data || [];
        payments.value = payRes.data || [];
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadOverview();
});
</script>

<template>
    <div class="cr-flex-col cr-gap-lg">
        <Message v-if="errorMsg" severity="error">{{ errorMsg }}</Message>

        <Message v-if="overdueCount > 0" severity="warn" :closable="false">
            Bạn đang có <strong>{{ overdueCount }} cuốn sách quá hạn</strong>. Hệ thống tự động trừ 1 điểm uy tín/ngày/cuốn và tạm dừng quyền mượn sách mới cho đến khi bạn hoàn trả tại quầy.
        </Message>

        <Message
            v-if="!loading && profile.loaiDocGia === 'docGia_tuDo' && !profile.ngayHetHanThe"
            severity="warn"
            :closable="false"
        >
            <div class="cr-flex-between cr-flex-wrap" style="width: 100%; gap: 0.75rem">
                <span>
                    Thẻ <strong>Độc giả tự do</strong> của bạn chưa đăng ký gói sử dụng. Vui lòng chọn gói thẻ và hoàn tất thanh toán để có thể đặt giữ hoặc mượn sách.
                </span>
                <Button
                    label="Chọn gói thẻ ngay"
                    icon="pi pi-calendar-plus"
                    size="small"
                    @click="router.push('/tai-khoan/the-doc-gia')"
                />
            </div>
        </Message>

        <div v-if="loading" class="cr-grid-stats">
            <Skeleton v-for="n in 4" :key="n" height="110px" />
        </div>

        <div v-else class="cr-grid-stats">
            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Điểm uy tín hiện tại</div>
                            <div style="font-size: 1.6rem; font-weight: 800; color: var(--cr-primary)">
                                {{ profile.diemDocGia ?? 0 }} / 100
                            </div>
                            <div class="cr-muted">
                                Hạn mức: Tối đa {{ maxBorrowLimit }} cuốn
                            </div>
                        </div>
                        <i class="pi pi-star-fill" style="font-size: 1.8rem; color: var(--cr-primary)"></i>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Đang giữ sách (24h)</div>
                            <div style="font-size: 1.6rem; font-weight: 800">
                                {{ activeReservationsCount }} cuốn
                            </div>
                            <div class="cr-muted">Chờ nhận tại quầy</div>
                        </div>
                        <i class="pi pi-bookmark" style="font-size: 1.8rem; color: var(--cr-sage-dark)"></i>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Sách đang giữ/mượn</div>
                            <div style="font-size: 1.6rem; font-weight: 800">
                                {{ activeBorrowsCount }} / {{ maxBorrowLimit }}
                            </div>
                            <div class="cr-muted">
                                Hạn thẻ:
                                {{
                                    profile.ngayHetHanThe
                                        ? formatDate(profile.ngayHetHanThe)
                                        : 'Chưa kích hoạt gói'
                                }}
                            </div>
                        </div>
                        <i class="pi pi-book" style="font-size: 1.8rem; color: var(--cr-primary)"></i>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Khoản chờ thanh toán</div>
                            <div style="font-size: 1.6rem; font-weight: 800">
                                {{ pendingPayments.length }} khoản
                            </div>
                            <div class="cr-muted">
                                {{
                                    formatCurrency(
                                        pendingPayments.reduce(
                                            (s, i) => s + (i.soTien || 0),
                                            0,
                                        ),
                                    )
                                }}
                            </div>
                        </div>
                        <i class="pi pi-wallet" style="font-size: 1.8rem; color: var(--cr-sage-dark)"></i>
                    </div>
                </template>
            </Card>
        </div>

        <Card>
            <template #title>
                <div class="cr-flex-between">
                    <span>Hoạt động mượn & giữ sách gần đây</span>
                    <Button
                        label="Xem toàn bộ lịch sử"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        size="small"
                        severity="secondary"
                        outlined
                        @click="router.push('/tai-khoan/lich-su-muon')"
                    />
                </div>
            </template>
            <template #content>
                <DataTable
                    :value="borrows.slice(0, 5)"
                    :loading="loading"
                    emptyMessage="Bạn chưa có lượt mượn hoặc giữ sách nào."
                >
                    <Column header="Tên sách">
                        <template #body="{ data }">
                            <strong>{{ data.maSach?.tenSach || 'Sách thư viện' }}</strong>
                            <div class="cr-muted">{{ data.maSach?.maSach }}</div>
                        </template>
                    </Column>
                    <Column header="Ngày tạo / mượn">
                        <template #body="{ data }">
                            {{ formatDate(data.ngayMuon, true) }}
                        </template>
                    </Column>
                    <Column header="Hạn nhận / Hạn trả">
                        <template #body="{ data }">
                            {{ formatDate(data.ngayHenTra, true) }}
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
    </div>
</template>
