<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import Skeleton from 'primevue/skeleton';
import Message from 'primevue/message';
import BookCard from '@/components/reader/BookCard.vue';
import sachService from '@/services/sach.service';
import danhMucService from '@/services/danhmuc.service';
import tacGiaService from '@/services/tacgia.service';
import nhaXuatBanService from '@/services/nhaxuatban.service';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const loading = ref(false);
const errorMsg = ref('');
const reservingId = ref(null);

const books = ref([]);
const totalRecords = ref(0);
const categories = ref([]);
const authors = ref([]);
const publishers = ref([]);

const DEFAULT_ROWS_COUNT = 3;

function getColumnsByViewport() {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w <= 540) return 1;
    if (w <= 820) return 2;
    if (w <= 1100) return 3;
    return 4;
}

const gridColumns = ref(getColumnsByViewport());

const filters = reactive({
    search: route.query.search || '',
    danhMuc: route.query.danhMuc || null,
    tacGia: route.query.tacGia || null,
    maNXB: route.query.maNXB || null,
    minGia: null,
    maxGia: null,
    conHang: route.query.conHang === 'true',
    page: 1,
    limit: gridColumns.value * DEFAULT_ROWS_COUNT,
});

// Không cần ẩn hiện bộ lọc trên trang /kham-pha, hiển thị trực tiếp

function handleViewportResize() {
    const nextCols = getColumnsByViewport();
    if (nextCols !== gridColumns.value) {
        gridColumns.value = nextCols;
        filters.limit = nextCols * DEFAULT_ROWS_COUNT;
        filters.page = 1;
        fetchBooks();
    }
}

async function loadFilterOptions() {
    try {
        const [dmRes, tgRes, nxbRes] = await Promise.all([
            danhMucService.getDanhSachDanhMuc({ limit: 100 }),
            tacGiaService.getDanhSachTacGia({ limit: 100 }),
            nhaXuatBanService.getDanhSachNhaXuatBan({ limit: 100 }),
        ]);
        categories.value = dmRes.data || [];
        authors.value = tgRes.data || [];
        publishers.value = nxbRes.data || [];
    } catch {
        // Bỏ qua lỗi phụ khi tải bộ lọc
    }
}

async function fetchBooks() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const params = {
            page: filters.page,
            limit: filters.limit,
        };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.danhMuc) params.danhMuc = filters.danhMuc;
        if (filters.tacGia) params.tacGia = filters.tacGia;
        if (filters.maNXB) params.maNXB = filters.maNXB;
        if (filters.minGia !== null && filters.minGia !== undefined) {
            params.minGia = filters.minGia;
        }
        if (filters.maxGia !== null && filters.maxGia !== undefined) {
            params.maxGia = filters.maxGia;
        }
        if (filters.conHang) params.conHang = true;

        const res = await sachService.getDanhSachSach(params);
        books.value = res.data || [];
        totalRecords.value = res.total || 0;
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

function handleApplyFilter() {
    filters.page = 1;
    fetchBooks();
}

function handleResetFilter() {
    filters.search = '';
    filters.danhMuc = null;
    filters.tacGia = null;
    filters.maNXB = null;
    filters.minGia = null;
    filters.maxGia = null;
    filters.conHang = false;
    filters.page = 1;
    router.replace({ path: '/kham-pha', query: {} });
    fetchBooks();
}

function onPageChange(event) {
    filters.page = event.page + 1;
    fetchBooks();
}

function handleReserveBook(book) {
    if (!authStore.isAuthenticated) {
        toast.add({
            severity: 'warn',
            summary: 'Vui lòng đăng nhập',
            detail: 'Bạn cần đăng nhập tài khoản độc giả để giữ sách trực tuyến.',
            life: 3500,
        });
        router.push({ path: '/dang-nhap', query: { redirect: '/kham-pha' } });
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
        message: `Đặt giữ cuốn "${book.tenSach}"? Vui lòng đến quầy thư viện trong 24 giờ để hoàn tất thủ tục nhận sách.`,
        icon: 'pi pi-bookmark',
        acceptLabel: 'Đặt giữ sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            reservingId.value = book._id;
            try {
                const res = await muonTraService.taoPhieuMuon({ sachId: book._id });
                toast.add({
                    severity: 'success',
                    summary: 'Thành công',
                    detail: res.message,
                    life: 4500,
                });
                await fetchBooks();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể giữ sách',
                    detail: err.message,
                    life: 4500,
                });
            } finally {
                reservingId.value = null;
            }
        },
    });
}

watch(
    () => route.query,
    (q) => {
        if (q.search !== undefined) filters.search = String(q.search);
        if (q.danhMuc !== undefined) filters.danhMuc = q.danhMuc || null;
        if (q.tacGia !== undefined) filters.tacGia = q.tacGia || null;
        if (q.maNXB !== undefined) filters.maNXB = q.maNXB || null;
        if (q.conHang !== undefined) filters.conHang = q.conHang === 'true';
        fetchBooks();
    },
);

onMounted(() => {
    window.addEventListener('resize', handleViewportResize);
    loadFilterOptions();
    fetchBooks();
});

onUnmounted(() => {
    window.removeEventListener('resize', handleViewportResize);
});
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Khám phá & tra cứu sách</h1>
                <p class="cr-page-subtitle">
                    Tìm kiếm theo tên sách, mã sách, tác giả, danh mục, nhà xuất bản và tình trạng tồn kho
                </p>
            </div>
        </div>

        <!-- Search Pill + Filter Toolbar -->
        <section class="cr-section cr-search-section">
            <form
                class="cr-flex-col cr-gap-md"
                @submit.prevent="handleApplyFilter"
            >
                <!-- Thanh tìm kiếm dạng viên thuốc (Pill) -->
                <div class="cr-search-pill">
                    <input
                        v-model="filters.search"
                        type="text"
                        class="cr-search-pill-input"
                        placeholder="Nhập tên sách, mã sách, nội dung mô tả..."
                    />

                    <span class="cr-search-pill-divider"></span>

                    <button
                        type="submit"
                        class="cr-search-pill-btn"
                        aria-label="Tìm kiếm"
                        :disabled="loading"
                    >
                        <i class="pi pi-search"></i>
                    </button>
                </div>

                <!-- Khung bộ lọc chi tiết (hiển thị trực tiếp, không cần bấm) -->
                <div class="cr-advanced-filter-panel">
                    <div class="cr-grid-3">
                        <div class="cr-field">
                            <label class="cr-label">Danh mục sách</label>
                            <Select
                                v-model="filters.danhMuc"
                                :options="categories"
                                optionLabel="tenDm"
                                optionValue="_id"
                                placeholder="Tất cả danh mục"
                                filter
                                :filterFields="['tenDm']"
                                filterPlaceholder="Tìm nhanh danh mục..."
                                emptyFilterMessage="Không tìm thấy danh mục"
                                resetFilterOnHide
                                showClear
                                fluid
                            />
                        </div>

                        <div class="cr-field">
                            <label class="cr-label">Tác giả</label>
                            <Select
                                v-model="filters.tacGia"
                                :options="authors"
                                optionLabel="tenTg"
                                optionValue="_id"
                                placeholder="Tất cả tác giả"
                                filter
                                :filterFields="['tenTg']"
                                filterPlaceholder="Tìm nhanh tác giả..."
                                emptyFilterMessage="Không tìm thấy tác giả"
                                resetFilterOnHide
                                showClear
                                fluid
                            />
                        </div>

                        <div class="cr-field">
                            <label class="cr-label">Nhà xuất bản</label>
                            <Select
                                v-model="filters.maNXB"
                                :options="publishers"
                                optionLabel="tenNxb"
                                optionValue="_id"
                                placeholder="Tất cả NXB"
                                filter
                                :filterFields="['tenNxb']"
                                filterPlaceholder="Tìm nhanh NXB..."
                                emptyFilterMessage="Không tìm thấy nhà xuất bản"
                                resetFilterOnHide
                                showClear
                                fluid
                            />
                        </div>

                        <div class="cr-field">
                            <label class="cr-label">Giá bìa tối thiểu (VNĐ)</label>
                            <InputNumber
                                v-model="filters.minGia"
                                :min="0"
                                placeholder="Từ 0 ₫"
                                fluid
                            />
                        </div>

                        <div class="cr-field">
                            <label class="cr-label">Giá bìa tối đa (VNĐ)</label>
                            <InputNumber
                                v-model="filters.maxGia"
                                :min="0"
                                placeholder="Đến..."
                                fluid
                            />
                        </div>

                        <div
                            class="cr-field cr-flex cr-flex-col cr-gap-xs"
                            style="justify-content: flex-end"
                        >
                            <div class="cr-items-center" style="height: 42px">
                                <Checkbox
                                    v-model="filters.conHang"
                                    inputId="only-available"
                                    binary
                                />
                                <label
                                    for="only-available"
                                    style="cursor: pointer; font-size: 0.875rem"
                                >
                                    Chỉ sách còn trong kho
                                </label>
                            </div>
                        </div>
                    </div>

                    <div
                        class="cr-flex-between cr-flex-wrap"
                        style="padding-top: 0.75rem; border-top: 1px dashed var(--cr-border, #e8e2d7)"
                    >
                        <Button
                            type="button"
                            label="Đặt lại bộ lọc"
                            icon="pi pi-filter-slash"
                            severity="secondary"
                            outlined
                            size="small"
                            @click="handleResetFilter"
                        />
                        <Button
                            type="submit"
                            label="Áp dụng lọc"
                            icon="pi pi-check"
                            size="small"
                            :loading="loading"
                        />
                    </div>
                </div>
            </form>
        </section>

        <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
            {{ errorMsg }}
        </Message>

        <div class="cr-flex-between" style="margin-bottom: 1rem">
            <span class="cr-muted">
                Tìm thấy <strong>{{ totalRecords }}</strong> đầu sách phù hợp
            </span>
        </div>

        <div v-if="loading" class="cr-grid-books">
            <Card v-for="n in filters.limit" :key="n">
                <template #content>
                    <Skeleton height="220px" style="margin-bottom: 1rem" />
                    <Skeleton width="75%" height="1.4rem" style="margin-bottom: 0.5rem" />
                    <Skeleton width="50%" height="1rem" />
                </template>
            </Card>
        </div>

        <Card v-else-if="books.length === 0">
            <template #content>
                <div class="cr-empty-state">
                    <i class="pi pi-search" style="font-size: 2.5rem; margin-bottom: 0.5rem"></i>
                    <p>Không tìm thấy đầu sách nào khớp với điều kiện tra cứu.</p>
                </div>
            </template>
        </Card>

        <template v-else>
            <div class="cr-grid-books">
                <BookCard
                    v-for="book in books"
                    :key="book._id"
                    :book="book"
                    :reserving="reservingId === book._id"
                    @view-detail="(b) => router.push(`/sach/${b._id}`)"
                    @reserve="handleReserveBook"
                />
            </div>

            <div style="margin-top: 1.5rem">
                <Paginator
                    :rows="filters.limit"
                    :totalRecords="totalRecords"
                    :first="(filters.page - 1) * filters.limit"
                    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink JumpToPageInput"
                    @page="onPageChange"
                />
            </div>
        </template>
    </div>
</template>

<style scoped>
.cr-search-section {
    width: 100%;
    margin-bottom: 2rem;
}

.cr-search-pill {
    width: 100%;
    height: 54px;
    background-color: var(--cr-card, #ffffff);
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 999px;
    box-shadow: 0 4px 18px rgba(67, 53, 40, 0.06);
    display: flex;
    align-items: center;
    padding: 0 0.5rem 0 1.45rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cr-search-pill:focus-within {
    border-color: var(--cr-primary, #a65c25);
    box-shadow: 0 4px 20px rgba(166, 92, 37, 0.12);
}

.cr-search-pill-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--cr-text, #433528);
    font-size: 0.96rem;
    font-family: inherit;
}

.cr-search-pill-input::placeholder {
    color: var(--cr-text-muted, #75685b);
    opacity: 0.8;
}

.cr-pill-filter-trigger {
    height: 36px;
    padding: 0 0.85rem;
    border-radius: 999px;
    border: 1px solid transparent;
    background-color: transparent;
    color: var(--cr-text-muted, #75685b);
    font-size: 0.86rem;
    font-weight: 600;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.18s ease;
}

.cr-pill-filter-trigger:hover {
    background-color: #faf8f3;
    color: var(--cr-text, #433528);
}

.cr-pill-filter-trigger.is-open {
    background-color: #f4efe4;
    border-color: #e8e2d7;
    color: var(--cr-primary, #a65c25);
}

.cr-pill-filter-trigger.has-active {
    background-color: #edf1e9;
    border-color: #dce4d5;
    color: #41503a;
}

.cr-filter-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background-color: var(--cr-primary, #a65c25);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
}

.cr-search-pill-divider {
    width: 1.5px;
    height: 24px;
    background-color: var(--cr-text, #433528);
    opacity: 0.28;
    margin: 0 0.35rem 0 0.45rem;
    flex-shrink: 0;
}

.cr-search-pill-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--cr-text, #433528);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.2s ease, background-color 0.2s ease;
}

.cr-search-pill-btn i {
    font-size: 1.15rem;
}

.cr-search-pill-btn:hover {
    color: var(--cr-primary, #a65c25);
    background-color: #faf8f3;
}

.cr-advanced-filter-panel {
    background-color: var(--cr-card, #ffffff);
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 16px;
    padding: 1.25rem 1.35rem;
    box-shadow: 0 6px 20px rgba(67, 53, 40, 0.05);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>
