<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import BookCard from '@/components/reader/BookCard.vue';
import sachService from '@/services/sach.service';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/utils/formatters';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const loading = ref(true);
const errorMsg = ref('');
const book = ref(null);
const imgError = ref(false);
const relatedBooks = ref([]);

const checkingEligibility = ref(false);
const eligibilityInfo = ref(null);
const eligibilityError = ref('');
const reserving = ref(false);

async function loadBookDetail() {
    loading.value = true;
    errorMsg.value = '';
    imgError.value = false;
    eligibilityInfo.value = null;
    eligibilityError.value = '';
    try {
        const res = await sachService.getChiTietSach(route.params.id);
        book.value = res.data;

        if (book.value?.danhMuc?._id) {
            const relRes = await sachService.getDanhSachSach({
                danhMuc: book.value.danhMuc._id,
                limit: 4,
            });
            relatedBooks.value = (relRes.data || []).filter(
                (b) => b._id !== book.value._id,
            );
        }
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

async function handleCheckEligibility() {
    if (!authStore.isReader || !book.value) return;
    checkingEligibility.value = true;
    eligibilityInfo.value = null;
    eligibilityError.value = '';
    try {
        const res = await muonTraService.kiemTraDieuKien({
            docGiaId: authStore.userId,
            sachId: book.value._id,
        });
        eligibilityInfo.value = res.data;
    } catch (err) {
        eligibilityError.value = err.message;
    } finally {
        checkingEligibility.value = false;
    }
}

function handleReserveBook(targetBook = book.value) {
    if (!targetBook) return;
    if (!authStore.isAuthenticated) {
        toast.add({
            severity: 'warn',
            summary: 'Vui lòng đăng nhập',
            detail: 'Bạn cần đăng nhập độc giả để đặt giữ sách.',
            life: 3500,
        });
        router.push({
            path: '/dang-nhap',
            query: { redirect: `/sach/${targetBook._id}` },
        });
        return;
    }
    if (!authStore.isReader) {
        toast.add({
            severity: 'info',
            summary: 'Dành cho độc giả',
            detail: 'Nhân viên vui lòng tạo phiếu mượn tại cổng quản lý.',
            life: 3500,
        });
        return;
    }

    confirm.require({
        header: 'Xác nhận giữ sách trực tuyến (24h)',
        message: `Đặt giữ cuốn "${targetBook.tenSach}"? Bạn có 24 giờ để đến quầy thư viện nhận sách.`,
        icon: 'pi pi-bookmark',
        acceptLabel: 'Xác nhận giữ sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            reserving.value = true;
            try {
                const res = await muonTraService.taoPhieuMuon({
                    sachId: targetBook._id,
                });
                toast.add({
                    severity: 'success',
                    summary: 'Giữ sách thành công',
                    detail: res.message,
                    life: 5000,
                });
                await loadBookDetail();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể giữ sách',
                    detail: err.message,
                    life: 4500,
                });
            } finally {
                reserving.value = false;
            }
        },
    });
}

watch(
    () => route.params.id,
    () => {
        if (route.params.id) loadBookDetail();
    },
);

onMounted(() => {
    loadBookDetail();
});
</script>

<template>
    <div class="cr-container cr-page">
        <div style="margin-bottom: 1rem">
            <Button
                label="Quay lại danh sách sách"
                icon="pi pi-arrow-left"
                severity="secondary"
                text
                @click="router.push('/kham-pha')"
            />
        </div>

        <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
            {{ errorMsg }}
        </Message>

        <Card v-if="loading">
            <template #content>
                <div class="cr-grid-2">
                    <Skeleton height="360px" />
                    <div class="cr-flex-col cr-gap-md">
                        <Skeleton width="80%" height="2rem" />
                        <Skeleton width="50%" height="1.2rem" />
                        <Skeleton height="120px" />
                    </div>
                </div>
            </template>
        </Card>

        <template v-else-if="book">
            <Card class="cr-section">
                <template #content>
                    <div class="cr-grid-sidebar" style="grid-template-columns: 300px 1fr">
                        <div class="cr-book-cover-lg">
                            <img
                                v-if="book.hinhAnh && !imgError"
                                :src="book.hinhAnh"
                                :alt="book.tenSach"
                                referrerpolicy="no-referrer"
                                @error="imgError = true"
                            />
                            <div
                                v-else
                                class="cr-flex-col cr-flex-center cr-gap-sm"
                                style="min-height: 360px; width: 100%"
                            >
                                <i class="pi pi-book" style="font-size: 3.5rem"></i>
                                <strong>{{ book.maSach }}</strong>
                            </div>
                        </div>

                        <div class="cr-flex-col cr-gap-md">
                            <div class="cr-items-center cr-flex-wrap">
                                <Tag :value="`Mã sách: ${book.maSach}`" severity="secondary" />
                                <Tag
                                    :value="book.danhMuc?.tenDm || 'Danh mục'"
                                    severity="info"
                                />
                                <Tag
                                    :value="
                                        book.soQuyen > 0
                                            ? `Còn ${book.soQuyen} quyển tại kho`
                                            : 'Tạm hết sách'
                                    "
                                    :severity="book.soQuyen > 0 ? 'success' : 'danger'"
                                />
                            </div>

                            <h1 style="font-size: 1.75rem; font-weight: 800">
                                {{ book.tenSach }}
                            </h1>

                            <div class="cr-grid-2">
                                <div>
                                    <span class="cr-muted">Tác giả:</span>
                                    <div>
                                        <strong>{{ book.tacGia?.tenTg || '—' }}</strong>
                                        <span v-if="book.tacGia?.quocTich" class="cr-muted">
                                            ({{ book.tacGia.quocTich }})
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span class="cr-muted">Nhà xuất bản:</span>
                                    <div>
                                        <strong>{{ book.maNXB?.tenNxb || '—' }}</strong>
                                    </div>
                                </div>
                                <div>
                                    <span class="cr-muted">Năm xuất bản:</span>
                                    <div><strong>{{ book.namXuatBan || '—' }}</strong></div>
                                </div>
                                <div>
                                    <span class="cr-muted">Ngôn ngữ / Nguồn gốc:</span>
                                    <div>
                                        <strong>
                                            {{ book.ngonNgu || 'Tiếng Việt' }}
                                            {{ book.nguonGoc ? ` - ${book.nguonGoc}` : '' }}
                                        </strong>
                                    </div>
                                </div>
                                <div>
                                    <span class="cr-muted">Giá bìa (căn cứ bồi thường nếu mất):</span>
                                    <div>
                                        <strong style="font-size: 1.15rem; color: var(--cr-primary)">
                                            {{ formatCurrency(book.donGia) }}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <Divider style="margin: 0.25rem 0" />

                            <div>
                                <div class="cr-label" style="margin-bottom: 0.25rem">
                                    Giới thiệu nội dung
                                </div>
                                <p class="cr-muted">
                                    {{
                                        book.moTa ||
                                        'Đầu sách lưu hành tại Thư viện CozyReads. Độc giả có thể đặt giữ sách trực tuyến hoặc mượn trực tiếp tại quầy.'
                                    }}
                                </p>
                            </div>

                            <Message
                                v-if="eligibilityInfo"
                                severity="success"
                                :closable="false"
                            >
                                Bạn đủ điều kiện mượn cuốn sách này! Hiện bạn đang giữ
                                <strong>{{ eligibilityInfo.soSachDangGiu }}/{{ eligibilityInfo.soSachToiDa }}</strong>
                                cuốn theo hạn mức điểm uy tín ({{ eligibilityInfo.docGia?.diemDocGia }} điểm).
                            </Message>

                            <Message
                                v-if="eligibilityError"
                                severity="warn"
                                :closable="false"
                            >
                                {{ eligibilityError }}
                            </Message>

                            <div class="cr-flex cr-gap-sm cr-flex-wrap">
                                <Button
                                    label="Đặt giữ sách trực tuyến (24h)"
                                    icon="pi pi-bookmark"
                                    :disabled="book.soQuyen <= 0"
                                    :loading="reserving"
                                    @click="handleReserveBook(book)"
                                />
                                <Button
                                    v-if="authStore.isReader"
                                    label="Kiểm tra điều kiện mượn của tôi"
                                    icon="pi pi-check-circle"
                                    severity="secondary"
                                    outlined
                                    :loading="checkingEligibility"
                                    @click="handleCheckEligibility"
                                />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Related Books -->
            <section v-if="relatedBooks.length > 0" class="cr-section">
                <div class="cr-page-header">
                    <h2 class="cr-page-title">Sách cùng danh mục</h2>
                </div>
                <div class="cr-grid-books">
                    <BookCard
                        v-for="rel in relatedBooks"
                        :key="rel._id"
                        :book="rel"
                        @view-detail="(b) => router.push(`/sach/${b._id}`)"
                        @reserve="handleReserveBook"
                    />
                </div>
            </section>
        </template>
    </div>
</template>
