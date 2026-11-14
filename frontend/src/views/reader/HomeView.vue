<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
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
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const searchKeyword = ref('');
const loading = ref(true);
const errorMsg = ref('');
const reservingId = ref(null);

const latestBooks = ref([]);
const categories = ref([]);
const stats = ref({
    totalBooks: 0,
    totalCategories: 0,
    totalAuthors: 0,
    totalPublishers: 0,
});

async function loadHomeData() {
    loading.value = true;
    errorMsg.value = '';
    try {
        const [sachRes, dmRes, tgRes, nxbRes] = await Promise.all([
            sachService.getDanhSachSach({ page: 1, limit: 8 }),
            danhMucService.getDanhSachDanhMuc({ page: 1, limit: 12 }),
            tacGiaService.getDanhSachTacGia({ page: 1, limit: 1 }),
            nhaXuatBanService.getDanhSachNhaXuatBan({ page: 1, limit: 1 }),
        ]);

        latestBooks.value = sachRes.data || [];
        categories.value = dmRes.data || [];
        stats.value = {
            totalBooks: sachRes.total || 0,
            totalCategories: dmRes.total || 0,
            totalAuthors: tgRes.total || 0,
            totalPublishers: nxbRes.total || 0,
        };
    } catch (err) {
        errorMsg.value = err.message;
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    router.push({
        path: '/kham-pha',
        query: searchKeyword.value.trim()
            ? { search: searchKeyword.value.trim() }
            : {},
    });
}

function handleViewDetail(book) {
    router.push(`/sach/${book._id}`);
}

function handleReserveBook(book) {
    if (!authStore.isAuthenticated) {
        toast.add({
            severity: 'warn',
            summary: 'Cần đăng nhập',
            detail: 'Vui lòng đăng nhập tài khoản độc giả để đặt giữ sách trực tuyến.',
            life: 3500,
        });
        router.push({ path: '/dang-nhap', query: { redirect: `/sach/${book._id}` } });
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
        message: `Bạn muốn đặt giữ cuốn "${book.tenSach}"? Bạn cần đến quầy thư viện trong vòng 24 giờ để nhận sách.`,
        icon: 'pi pi-bookmark',
        acceptLabel: 'Đặt giữ sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            reservingId.value = book._id;
            try {
                const res = await muonTraService.taoPhieuMuon({ sachId: book._id });
                toast.add({
                    severity: 'success',
                    summary: 'Giữ sách thành công',
                    detail: res.message,
                    life: 4500,
                });
                await loadHomeData();
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

onMounted(() => {
    loadHomeData();
});
</script>

<template>
    <div class="cr-container cr-page">
        <!-- Hero Search Section -->
        <Card class="cr-section">
            <template #content>
                <div class="cr-flex-col cr-gap-md" style="padding: 1rem 0.5rem">
                    <div class="cr-items-center">
                        <Tag value="CozyReads Library" severity="secondary" icon="pi pi-sparkles" />
                        <Tag value="Giữ sách trực tuyến 24h" severity="info" />
                    </div>
                    <h1 style="font-size: 2rem; font-weight: 800; color: var(--cr-text)">
                        Khám phá Kho tàng Tri thức tại CozyReads
                    </h1>
                    <p class="cr-muted" style="max-width: 720px; font-size: 1rem">
                        Tra cứu hàng trăm đầu sách văn học, khoa học, kỹ năng. Đặt giữ sách trực tuyến nhanh chóng và nhận sách trực tiếp tại quầy thư viện trong vòng 24 giờ.
                    </p>

                    <form
                        class="cr-flex cr-gap-sm cr-flex-wrap"
                        style="max-width: 680px; margin-top: 0.25rem"
                        @submit.prevent="handleSearch"
                    >
                        <div style="flex: 1; min-width: 240px">
                            <InputText
                                v-model="searchKeyword"
                                placeholder="Tìm theo tên sách, mã sách, nội dung mô tả..."
                                fluid
                            />
                        </div>
                        <Button
                            type="submit"
                            label="Tìm kiếm sách"
                            icon="pi pi-search"
                        />
                        <Button
                            type="button"
                            label="Bộ lọc nâng cao"
                            icon="pi pi-sliders-h"
                            severity="secondary"
                            outlined
                            @click="router.push('/kham-pha')"
                        />
                    </form>

                    <div v-if="categories.length" class="cr-items-center cr-flex-wrap">
                        <span class="cr-muted">Danh mục nổi bật:</span>
                        <Button
                            v-for="dm in categories"
                            :key="dm._id"
                            :label="dm.tenDm"
                            size="small"
                            severity="secondary"
                            outlined
                            @click="router.push({ path: '/kham-pha', query: { danhMuc: dm._id } })"
                        />
                    </div>
                </div>
            </template>
        </Card>

        <!-- Library Live Stats -->
        <div class="cr-grid-stats cr-section">
            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Tổng số đầu sách</div>
                            <div style="font-size: 1.75rem; font-weight: 800">
                                {{ stats.totalBooks }}
                            </div>
                        </div>
                        <i class="pi pi-book" style="font-size: 2rem; color: var(--cr-primary)"></i>
                    </div>
                </template>
            </Card>
            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Danh mục chuyên đề</div>
                            <div style="font-size: 1.75rem; font-weight: 800">
                                {{ stats.totalCategories }}
                            </div>
                        </div>
                        <i class="pi pi-tags" style="font-size: 2rem; color: var(--cr-sage-dark)"></i>
                    </div>
                </template>
            </Card>
            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Tác giả trong kho</div>
                            <div style="font-size: 1.75rem; font-weight: 800">
                                {{ stats.totalAuthors }}
                            </div>
                        </div>
                        <i class="pi pi-users" style="font-size: 2rem; color: var(--cr-primary)"></i>
                    </div>
                </template>
            </Card>
            <Card>
                <template #content>
                    <div class="cr-flex-between">
                        <div>
                            <div class="cr-muted">Nhà xuất bản đối tác</div>
                            <div style="font-size: 1.75rem; font-weight: 800">
                                {{ stats.totalPublishers }}
                            </div>
                        </div>
                        <i class="pi pi-building" style="font-size: 2rem; color: var(--cr-sage-dark)"></i>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Latest Books -->
        <section class="cr-section">
            <div class="cr-page-header">
                <div>
                    <h2 class="cr-page-title">Sách mới cập nhật</h2>
                    <p class="cr-page-subtitle">
                        Những đầu sách mới nhất hiện có tại thư viện CozyReads
                    </p>
                </div>
                <Button
                    label="Xem tất cả sách"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    severity="secondary"
                    outlined
                    @click="router.push('/kham-pha')"
                />
            </div>

            <Message v-if="errorMsg" severity="error" style="margin-bottom: 1rem">
                {{ errorMsg }}
            </Message>

            <div v-if="loading" class="cr-grid-books">
                <Card v-for="n in 4" :key="n">
                    <template #content>
                        <Skeleton height="220px" style="margin-bottom: 1rem" />
                        <Skeleton width="70%" height="1.5rem" style="margin-bottom: 0.5rem" />
                        <Skeleton width="50%" height="1rem" />
                    </template>
                </Card>
            </div>

            <div v-else-if="latestBooks.length === 0" class="cr-empty-state">
                <i class="pi pi-inbox" style="font-size: 2.5rem; margin-bottom: 0.5rem"></i>
                <p>Hiện chưa có đầu sách nào trong hệ thống.</p>
            </div>

            <div v-else class="cr-grid-books">
                <BookCard
                    v-for="book in latestBooks"
                    :key="book._id"
                    :book="book"
                    :reserving="reservingId === book._id"
                    @view-detail="handleViewDetail"
                    @reserve="handleReserveBook"
                />
            </div>
        </section>

        <!-- How It Works -->
        <section class="cr-section">
            <div class="cr-page-header">
                <div>
                    <h2 class="cr-page-title">Quy trình Mượn sách & Điểm uy tín</h2>
                    <p class="cr-page-subtitle">
                        Minh bạch, không phạt tiền quá hạn — quản lý hạn mức theo điểm uy tín độc giả
                    </p>
                </div>
            </div>
            <div class="cr-grid-3">
                <Card>
                    <template #title>1. Đăng ký & Nhận 100 điểm</template>
                    <template #content>
                        <p class="cr-muted">
                            Đăng ký tài khoản độc giả xác thực qua Email OTP. Mỗi thẻ mới mặc định có <strong>100 điểm uy tín</strong> (hạn mức mượn tối đa 3 cuốn cùng lúc).
                        </p>
                    </template>
                </Card>
                <Card>
                    <template #title>2. Giữ sách Online 24h</template>
                    <template #content>
                        <p class="cr-muted">
                            Đặt giữ sách trực tuyến trên website. Hệ thống giữ chỗ cuốn sách cho bạn trong <strong>24 giờ</strong> để bạn đến quầy thư viện xác nhận nhận sách.
                        </p>
                    </template>
                </Card>
                <Card>
                    <template #title>3. Mượn 14 ngày & Tích điểm</template>
                    <template #content>
                        <p class="cr-muted">
                            Thời hạn mượn tiêu chuẩn là <strong>14 ngày</strong>. Mỗi 3 ngày không vi phạm bạn được cộng +1 điểm (tối đa 100 điểm). Quá hạn không phạt tiền, chỉ trừ 1 điểm/ngày/cuốn.
                        </p>
                    </template>
                </Card>
            </div>
        </section>
    </div>
</template>
