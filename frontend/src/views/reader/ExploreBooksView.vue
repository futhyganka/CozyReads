<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
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

const filters = reactive({
    search: route.query.search || '',
    danhMuc: route.query.danhMuc || null,
    tacGia: route.query.tacGia || null,
    maNXB: route.query.maNXB || null,
    minGia: null,
    maxGia: null,
    conHang: false,
    page: 1,
    limit: 12,
});

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
    filters.limit = event.rows;
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
            summary: 'Dành cho Độc giả',
            detail: 'Nhân viên vui lòng tạo phiếu mượn tại Cổng Quản lý.',
            life: 3500,
        });
        return;
    }

    confirm.require({
        header: 'Xác nhận Giữ sách trực tuyến (24h)',
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
        fetchBooks();
    },
);

onMounted(() => {
    loadFilterOptions();
    fetchBooks();
});
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Khám phá & Tra cứu Sách</h1>
                <p class="cr-page-subtitle">
                    Tìm kiếm theo tên sách, mã sách, tác giả, danh mục, nhà xuất bản và tình trạng tồn kho
                </p>
            </div>
        </div>

        <!-- Filter Panel -->
        <Card class="cr-section">
            <template #content>
                <form
                    class="cr-flex-col cr-gap-md"
                    @submit.prevent="handleApplyFilter"
                >
                    <div class="cr-grid-3">
                        <div class="cr-field">
                            <label class="cr-label">Từ khóa tìm kiếm</label>
                            <InputText
                                v-model="filters.search"
                                placeholder="Tên sách, mã sách, mô tả..."
                                fluid
                            />
                        </div>

                        <div class="cr-field">
                            <label class="cr-label">Danh mục sách</label>
                            <Select
                                v-model="filters.danhMuc"
                                :options="categories"
                                optionLabel="tenDm"
                                optionValue="_id"
                                placeholder="Tất cả danh mục"
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
                    </div>

                    <div class="cr-flex-between cr-flex-wrap">
                        <div class="cr-items-center">
                            <Checkbox
                                v-model="filters.conHang"
                                inputId="only-available"
                                binary
                            />
                            <label for="only-available" style="cursor: pointer">
                                Chỉ hiển thị sách còn khả dụng trong kho
                            </label>
                        </div>

                        <div class="cr-items-center">
                            <Button
                                type="button"
                                label="Đặt lại bộ lọc"
                                icon="pi pi-filter-slash"
                                severity="secondary"
                                outlined
                                @click="handleResetFilter"
                            />
                            <Button
                                type="submit"
                                label="Áp dụng lọc"
                                icon="pi pi-search"
                                :loading="loading"
                            />
                        </div>
                    </div>
                </form>
            </template>
        </Card>

        <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
            {{ errorMsg }}
        </Message>

        <div class="cr-flex-between" style="margin-bottom: 1rem">
            <span class="cr-muted">
                Tìm thấy <strong>{{ totalRecords }}</strong> đầu sách phù hợp
            </span>
        </div>

        <div v-if="loading" class="cr-grid-books">
            <Card v-for="n in 8" :key="n">
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
                    :rowsPerPageOptions="[8, 12, 24]"
                    @page="onPageChange"
                />
            </div>
        </template>
    </div>
</template>
