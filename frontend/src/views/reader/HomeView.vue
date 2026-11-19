<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
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
import logoImg from '@/assets/logo.png';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

// =========================================================================
// 1. SLIDER 3 TRANG (TỰ ĐỘNG LƯỚT NGANG + BẤM CHUYỂN TRANG THỦ CÔNG)
// =========================================================================
const currentSlide = ref(0);
const TOTAL_SLIDES = 3;
const AUTO_SLIDE_MS = 5500;
const isSliderPaused = ref(false);
let slideTimer = null;

const slideTabs = [
    {
        index: 0,
        shortLabel: 'Trang 1: CozyReads & Slogan',
    },
    {
        index: 1,
        shortLabel: 'Trang 2: Quy trình mượn sách',
    },
    {
        index: 2,
        shortLabel: 'Trang 3: Điểm uy tín độc giả',
    },
];

const sliderTrackStyle = computed(() => ({
    transform: `translate3d(-${currentSlide.value * 100}%, 0, 0)`,
}));

function startSlideTimer() {
    stopSlideTimer();
    slideTimer = setInterval(() => {
        if (!isSliderPaused.value) {
            currentSlide.value = (currentSlide.value + 1) % TOTAL_SLIDES;
        }
    }, AUTO_SLIDE_MS);
}

function stopSlideTimer() {
    if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
    }
}

function goToSlide(index) {
    currentSlide.value = (index + TOTAL_SLIDES) % TOTAL_SLIDES;
    startSlideTimer();
}

function nextSlide() {
    goToSlide(currentSlide.value + 1);
}

function prevSlide() {
    goToSlide(currentSlide.value - 1);
}

// =========================================================================
// 2. THANH TÌM KIẾM + BỘ LỌC TRÊN TRANG CHỦ
// =========================================================================
const showAdvancedFilters = ref(false);

const searchFilters = reactive({
    search: '',
    danhMuc: null,
    tacGia: null,
    maNXB: null,
    conHang: false,
});

const activeFilterCount = computed(() => {
    let count = 0;
    if (searchFilters.danhMuc) count += 1;
    if (searchFilters.tacGia) count += 1;
    if (searchFilters.maNXB) count += 1;
    if (searchFilters.conHang) count += 1;
    return count;
});

const categories = ref([]);
const authors = ref([]);
const publishers = ref([]);
const reservingId = ref(null);

async function loadFilterData() {
    try {
        const [dmRes, tgRes, nxbRes] = await Promise.all([
            danhMucService.getDanhSachDanhMuc({ page: 1, limit: 50 }),
            tacGiaService.getDanhSachTacGia({ page: 1, limit: 100 }),
            nhaXuatBanService.getDanhSachNhaXuatBan({ page: 1, limit: 100 }),
        ]);
        categories.value = dmRes.data || [];
        authors.value = tgRes.data || [];
        publishers.value = nxbRes.data || [];
    } catch {
        // Bỏ qua lỗi phụ khi tải danh mục bộ lọc
    }
}

function handleSearchAndFilter() {
    const query = {};
    if (searchFilters.search.trim()) query.search = searchFilters.search.trim();
    if (searchFilters.danhMuc) query.danhMuc = searchFilters.danhMuc;
    if (searchFilters.tacGia) query.tacGia = searchFilters.tacGia;
    if (searchFilters.maNXB) query.maNXB = searchFilters.maNXB;
    if (searchFilters.conHang) query.conHang = 'true';

    router.push({
        path: '/kham-pha',
        query,
    });
}

function handleResetSearchFilters() {
    searchFilters.search = '';
    searchFilters.danhMuc = null;
    searchFilters.tacGia = null;
    searchFilters.maNXB = null;
    searchFilters.conHang = false;
}

// =========================================================================
// 3. SMART RECOMMENDATIONS (GỢI Ý SÁCH THÔNG MINH)
// =========================================================================
const recommendedBooks = ref([]);
const recommendationTitle = ref('Sách nổi bật');
const recommendationSubtitle = ref(
    'Những cuốn sách được yêu thích tại CozyReads, biết đâu bạn sẽ tìm thấy cuốn sách dành cho mình.',
);
const recommendationType = ref('popular');
const recommendationCase = ref('A');
const loadingRecommendations = ref(true);
const recommendationError = ref('');

async function loadRecommendations() {
    loadingRecommendations.value = true;
    recommendationError.value = '';
    recommendedBooks.value = [];
    try {
        const res = await sachService.getGoiYSach({ limit: 8 });
        recommendationTitle.value = res.title || 'Sách nổi bật';
        recommendationSubtitle.value =
            res.subtitle ||
            'Những cuốn sách được yêu thích tại CozyReads, biết đâu bạn sẽ tìm thấy cuốn sách dành cho mình.';
        recommendationType.value = res.loaiGoiY || 'popular';
        recommendationCase.value = res.caseType || 'A';
        recommendedBooks.value = res.data || [];
    } catch (err) {
        recommendationError.value =
            err.message || 'Không thể tải danh sách sách gợi ý.';
    } finally {
        loadingRecommendations.value = false;
    }
}

watch(
    () => [authStore.readerToken, authStore.userId],
    () => {
        loadRecommendations();
    },
);

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
        router.push({
            path: '/dang-nhap',
            query: { redirect: `/sach/${book._id}` },
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
        message: `Bạn muốn đặt giữ cuốn "${book.tenSach}"? Bạn cần đến quầy thư viện trong vòng 24 giờ để nhận sách.`,
        icon: 'pi pi-bookmark',
        acceptLabel: 'Đặt giữ sách',
        rejectLabel: 'Hủy',
        accept: async () => {
            reservingId.value = book._id;
            try {
                const res = await muonTraService.taoPhieuMuon({
                    sachId: book._id,
                });
                toast.add({
                    severity: 'success',
                    summary: 'Giữ sách thành công',
                    detail: res.message,
                    life: 4500,
                });
                await loadRecommendations();
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
    startSlideTimer();
    loadFilterData();
    loadRecommendations();
});

onUnmounted(() => {
    stopSlideTimer();
});
</script>

<template>
    <div class="cr-container cr-page">
        <!-- =============================================================== -->
        <!-- 1. HERO SLIDER 3 TRANG (TỰ ĐỘNG LƯỚT NGANG & 3 DẤU TRÒN)         -->
        <!-- =============================================================== -->
        <section
            class="cr-hero-slider cr-section"
            @mouseenter="isSliderPaused = true"
            @mouseleave="isSliderPaused = false"
        >
            <!-- Nút điều hướng Trái / Phải -->
            <button
                type="button"
                class="cr-slider-arrow cr-slider-arrow-prev"
                aria-label="Trang trước"
                @click="prevSlide"
            >
                <i class="pi pi-chevron-left"></i>
            </button>
            <button
                type="button"
                class="cr-slider-arrow cr-slider-arrow-next"
                aria-label="Trang tiếp"
                @click="nextSlide"
            >
                <i class="pi pi-chevron-right"></i>
            </button>

            <div class="cr-slider-viewport">
                <div class="cr-slider-track" :style="sliderTrackStyle">
                    <!-- TRANG 1: SLOGAN CỦA COZYREADS -->
                    <div
                        class="cr-slide cr-slide-slogan"
                        :class="{ 'is-active': currentSlide === 0 }"
                    >
                        <div class="cr-slide-grid">
                            <div class="cr-slide-left">
                                <h1 class="cr-slide-heading">
                                    Đọc sách an yên, kết nối tri thức mỗi ngày cùng
                                    <span class="cr-highlight-text">CozyReads</span>
                                </h1>
                                <p class="cr-slide-desc">
                                    Nơi mỗi trang sách mở ra một hành trình mới. Tra cứu tồn kho trực tuyến theo thời gian thực, đặt giữ sách yêu thích tại nhà và tận hưởng trải nghiệm mượn đọc văn minh, thân thiện.
                                </p>
                                <div class="cr-slogan-quote">
                                    “Mỗi cuốn sách là một người bạn đồng hành dịu dàng trên hành trình trưởng thành.”
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TRANG 2: QUY TRÌNH MƯỢN SÁCH -->
                    <div
                        class="cr-slide cr-slide-process"
                        :class="{ 'is-active': currentSlide === 1 }"
                    >
                        <div class="cr-slide-header-center">
                            <h2 class="cr-slide-heading-md">
                                3 bước mượn sách đơn giản tại thư viện CozyReads
                            </h2>
                            <p class="cr-slide-desc-center">
                                Chủ động giữ trước cuốn sách bạn cần ngay trên website, không lo hết sách khi đến quầy thư viện
                            </p>
                        </div>

                        <div class="cr-process-steps">
                            <div class="cr-step-card">
                                <div class="cr-step-number">01</div>
                                <h3>Đặt giữ sách trực tuyến (24h)</h3>
                                <p>
                                    Chọn đầu sách còn trong kho trên website và bấm
                                    <strong>Giữ sách</strong>. Hệ thống trừ tồn kho tạm thời và giữ riêng cuốn sách cho bạn trong vòng <strong>24 giờ</strong>.
                                </p>
                            </div>

                            <div class="cr-step-card">
                                <div class="cr-step-number">02</div>
                                <h3>Nhận sách tại quầy thư viện</h3>
                                <p>
                                    Đến quầy thư viện trong thời hạn 24 giờ, đọc
                                    <strong>Mã độc giả</strong> để thủ thư bàn giao sách. Nếu quá 24 giờ chưa nhận, phiếu giữ tự động hủy và hoàn lại kho.
                                </p>
                            </div>

                            <div class="cr-step-card">
                                <div class="cr-step-number">03</div>
                                <h3>Đọc sách 14 ngày & hoàn trả</h3>
                                <p>
                                    Thời hạn mượn tiêu chuẩn là
                                    <strong>14 ngày</strong> kể từ lúc nhận sách. Trả sách đúng hạn tại quầy để duy trì điểm uy tín tối đa và tiếp tục mượn sách mới.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- TRANG 3: ĐIỂM UY TÍN ĐỘC GIẢ -->
                    <div
                        class="cr-slide cr-slide-points"
                        :class="{ 'is-active': currentSlide === 2 }"
                    >
                        <div class="cr-slide-grid">
                            <div class="cr-slide-left">
                                <h2 class="cr-slide-heading">
                                    Điểm uy tín
                                </h2>
                                <p class="cr-slide-desc">
                                    CozyReads khuyến khích thói quen đọc và hoàn trả sách đúng hạn thông qua hệ thống điểm uy tín tự động thay vì thu tiền phạt trễ hạn:
                                </p>
                                <div class="cr-points-rules">
                                    <div class="cr-rule-pill is-plus">
                                        <strong>100 điểm</strong>
                                        <span>Cấp ngay khi kích hoạt thẻ độc giả mới</span>
                                    </div>
                                    <div class="cr-rule-pill is-plus">
                                        <strong>+1 điểm / 3 ngày</strong>
                                        <span>Tự động cộng khi không có sách quá hạn (tối đa 100đ)</span>
                                    </div>
                                    <div class="cr-rule-pill is-minus">
                                        <strong>-1 điểm / ngày</strong>
                                        <span>Trừ trên mỗi cuốn sách trả quá hạn (báo mất trừ x2)</span>
                                    </div>
                                </div>
                            </div>

                            <div class="cr-slide-right">
                                <div class="cr-tier-board">
                                    <div class="cr-tier-board-title">
                                        Bảng hạn mức mượn sách theo điểm uy tín
                                    </div>
                                    <div class="cr-tier-list">
                                        <div class="cr-tier-row tier-high">
                                            <div class="cr-tier-range">71 – 100 điểm</div>
                                            <div class="cr-tier-quota">
                                                Mượn tối đa <strong>3 cuốn</strong>
                                            </div>
                                        </div>
                                        <div class="cr-tier-row tier-mid">
                                            <div class="cr-tier-range">41 – 70 điểm</div>
                                            <div class="cr-tier-quota">
                                                Mượn tối đa <strong>2 cuốn</strong>
                                            </div>
                                        </div>
                                        <div class="cr-tier-row tier-low">
                                            <div class="cr-tier-range">11 – 40 điểm</div>
                                            <div class="cr-tier-quota">
                                                Mượn tối đa <strong>1 cuốn</strong>
                                            </div>
                                        </div>
                                        <div class="cr-tier-row tier-lock">
                                            <div class="cr-tier-range">0 – 10 điểm</div>
                                            <div class="cr-tier-quota">
                                                <strong>Không được mượn sách</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="cr-flex-between cr-items-center"
                                        style="margin-top: 0.5rem"
                                    >
                                        <span class="cr-muted" style="font-size: 0.8rem">
                                            Áp dụng đồng nhất cho mọi đối tượng thẻ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3 dấu tròn chuyển trang dưới đáy Slider -->
            <div class="cr-slider-dots">
                <button
                    v-for="tab in slideTabs"
                    :key="tab.index"
                    type="button"
                    class="cr-slider-dot"
                    :class="{ 'is-active': currentSlide === tab.index }"
                    :aria-label="tab.shortLabel"
                    @click="goToSlide(tab.index)"
                ></button>
            </div>
        </section>

        <!-- =============================================================== -->
        <!-- 2. THANH TÌM KIẾM + BỘ LỌC ẨN                                   -->
        <!-- =============================================================== -->
        <section class="cr-section cr-search-section">
            <form
                class="cr-flex-col cr-gap-sm"
                @submit.prevent="handleSearchAndFilter"
            >
                <!-- Thanh tìm kiếm dạng viên thuốc duy nhất (tích hợp nút mở bộ lọc bên trong) -->
                <div class="cr-search-pill">
                    <input
                        v-model="searchFilters.search"
                        type="text"
                        class="cr-search-pill-input"
                        placeholder="Nhập tên sách, mã sách, nội dung mô tả..."
                    />

                    <button
                        type="button"
                        class="cr-pill-filter-trigger"
                        :class="{
                            'is-open': showAdvancedFilters,
                            'has-active': activeFilterCount > 0,
                        }"
                        @click="showAdvancedFilters = !showAdvancedFilters"
                    >
                        <i class="pi pi-sliders-h"></i>
                        <span>Bộ lọc</span>
                        <span
                            v-if="activeFilterCount > 0"
                            class="cr-filter-badge"
                        >
                            {{ activeFilterCount }}
                        </span>
                    </button>

                    <span class="cr-search-pill-divider"></span>

                    <button
                        type="submit"
                        class="cr-search-pill-btn"
                        aria-label="Tìm kiếm"
                    >
                        <i class="pi pi-search"></i>
                    </button>
                </div>

                <!-- Dải bộ lọc dạng viên thuốc (chỉ hiển thị khi bấm nút "Bộ lọc") -->
                <div
                    v-show="showAdvancedFilters"
                    class="cr-filter-tray"
                >
                    <div class="cr-filter-pills-row">
                        <Select
                            v-model="searchFilters.danhMuc"
                            :options="categories"
                            optionLabel="tenDm"
                            optionValue="_id"
                            placeholder="Danh mục: Tất cả"
                            filter
                            :filterFields="['tenDm']"
                            filterPlaceholder="Tìm nhanh danh mục..."
                            emptyFilterMessage="Không tìm thấy danh mục"
                            resetFilterOnHide
                            showClear
                            class="cr-pill-select"
                        />

                        <Select
                            v-model="searchFilters.tacGia"
                            :options="authors"
                            optionLabel="tenTg"
                            optionValue="_id"
                            placeholder="Tác giả: Tất cả"
                            filter
                            :filterFields="['tenTg']"
                            filterPlaceholder="Tìm nhanh tác giả..."
                            emptyFilterMessage="Không tìm thấy tác giả"
                            resetFilterOnHide
                            showClear
                            class="cr-pill-select"
                        />

                        <Select
                            v-model="searchFilters.maNXB"
                            :options="publishers"
                            optionLabel="tenNxb"
                            optionValue="_id"
                            placeholder="Nhà xuất bản: Tất cả"
                            filter
                            :filterFields="['tenNxb']"
                            filterPlaceholder="Tìm nhanh NXB..."
                            emptyFilterMessage="Không tìm thấy nhà xuất bản"
                            resetFilterOnHide
                            showClear
                            class="cr-pill-select"
                        />

                        <button
                            type="button"
                            class="cr-stock-chip"
                            :class="{ 'is-active': searchFilters.conHang }"
                            @click="searchFilters.conHang = !searchFilters.conHang"
                        >
                            <i
                                :class="
                                    searchFilters.conHang
                                        ? 'pi pi-check-circle'
                                        : 'pi pi-circle'
                                "
                            ></i>
                            <span>Còn trong kho</span>
                        </button>

                        <button
                            v-if="activeFilterCount > 0 || searchFilters.search"
                            type="button"
                            class="cr-reset-chip"
                            @click="handleResetSearchFilters"
                        >
                            <i class="pi pi-refresh"></i>
                            <span>Đặt lại</span>
                        </button>
                    </div>

                    <div
                        v-if="categories.length"
                        class="cr-quick-topics-row"
                    >
                        <span class="cr-quick-topics-label">Danh mục nổi bật:</span>
                        <button
                            v-for="dm in categories.slice(0, 6)"
                            :key="dm._id"
                            type="button"
                            class="cr-topic-chip"
                            :class="{
                                'is-selected': searchFilters.danhMuc === dm._id,
                            }"
                            @click="
                                searchFilters.danhMuc =
                                    searchFilters.danhMuc === dm._id
                                        ? null
                                        : dm._id
                            "
                        >
                            {{ dm.tenDm }}
                        </button>
                    </div>
                </div>
            </form>
        </section>

        <!-- =============================================================== -->
        <!-- 3. SMART RECOMMENDATIONS (GỢI Ý SÁCH THÔNG MINH)                -->
        <!-- =============================================================== -->
        <section class="cr-section">
            <div class="cr-page-header">
                <div>
                    <h2 class="cr-page-title">{{ recommendationTitle }}</h2>
                    <p class="cr-page-subtitle">
                        {{ recommendationSubtitle }}
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

            <Message
                v-if="recommendationError"
                severity="error"
                style="margin-bottom: 1rem"
            >
                <div class="cr-flex-between cr-items-center" style="width: 100%">
                    <span>{{ recommendationError }}</span>
                    <Button
                        label="Thử lại"
                        size="small"
                        severity="secondary"
                        text
                        @click="loadRecommendations"
                    />
                </div>
            </Message>

            <div v-if="loadingRecommendations" class="cr-grid-books">
                <Card v-for="n in 4" :key="n">
                    <template #content>
                        <Skeleton height="220px" style="margin-bottom: 1rem" />
                        <Skeleton
                            width="70%"
                            height="1.5rem"
                            style="margin-bottom: 0.5rem"
                        />
                        <Skeleton width="50%" height="1rem" />
                    </template>
                </Card>
            </div>

            <div
                v-else-if="recommendedBooks.length === 0"
                class="cr-empty-state"
            >
                <i
                    class="pi pi-inbox"
                    style="font-size: 2.5rem; margin-bottom: 0.5rem"
                ></i>
                <p>Hiện chưa có sách phù hợp để hiển thị.</p>
            </div>

            <div v-else class="cr-grid-books">
                <BookCard
                    v-for="book in recommendedBooks"
                    :key="book._id"
                    :book="book"
                    :reserving="reservingId === book._id"
                    @view-detail="handleViewDetail"
                    @reserve="handleReserveBook"
                />
            </div>
        </section>
    </div>
</template>

<style scoped>
/* ========================================================================= */
/* HERO SLIDER 3 TRANG — CARAMEL & SAGE                                      */
/* ========================================================================= */
.cr-hero-slider {
    position: relative;
    background-color: var(--cr-card, #ffffff);
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(67, 53, 40, 0.04);
}

.cr-slider-viewport {
    width: 100%;
    overflow: hidden;
}

.cr-slider-track {
    display: flex;
    flex-wrap: nowrap;
    width: 100%;
    transition: transform 0.45s ease-in-out;
    will-change: transform;
}

.cr-slide {
    flex: 0 0 100%;
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    min-height: 310px;
    padding: 2rem 3.75rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
}

.cr-slide-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 2rem;
    align-items: center;
}

.cr-slide-left {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

/* Trang 1: Bố cục 1 cột căn giữa hài hòa cho Slogan CozyReads */
.cr-slide-slogan .cr-slide-grid {
    grid-template-columns: 1fr;
    max-width: 780px;
    margin: 0 auto;
    text-align: center;
}

.cr-slide-slogan .cr-slide-left {
    align-items: center;
    gap: 1rem;
}

.cr-slide-slogan .cr-slide-desc {
    max-width: 680px;
    font-size: 1rem;
}

.cr-slogan-quote {
    margin-top: 0.25rem;
    padding: 0.75rem 1.35rem;
    background-color: #fdfcfa;
    border: 1px solid var(--cr-border, #e8e2d7);
    border-left: 4px solid var(--cr-primary, #a65c25);
    border-radius: 10px;
    font-style: italic;
    color: var(--cr-text, #433528);
    font-size: 0.925rem;
    line-height: 1.55;
    width: fit-content;
    max-width: 100%;
}

.cr-slide-heading {
    font-size: 1.95rem;
    font-weight: 800;
    line-height: 1.3;
    color: var(--cr-text, #433528);
    margin: 0;
}

.cr-slide-heading-md {
    font-size: 1.65rem;
    font-weight: 800;
    line-height: 1.3;
    color: var(--cr-text, #433528);
    margin: 0 0 0.35rem;
}

.cr-highlight-text {
    color: var(--cr-primary, #a65c25);
}

.cr-slide-desc {
    color: var(--cr-text-muted, #75685b);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
}

.cr-slide-header-center {
    text-align: center;
    max-width: 720px;
    margin: 0 auto 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.cr-slide-desc-center {
    color: var(--cr-text-muted, #75685b);
    font-size: 0.925rem;
    margin: 0;
}

/* Trang 2: 3 bước quy trình mượn sách */
.cr-process-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.15rem;
}

.cr-step-card {
    position: relative;
    background-color: #fdfcfa;
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 12px;
    padding: 1.15rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}

.cr-step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 26px;
    border-radius: 6px;
    background-color: rgba(166, 92, 37, 0.12);
    color: var(--cr-primary, #a65c25);
    font-size: 0.825rem;
    font-weight: 800;
    line-height: 1;
}

.cr-step-card h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--cr-text, #433528);
    margin: 0.1rem 0 0;
}

.cr-step-card p {
    font-size: 0.86rem;
    color: var(--cr-text-muted, #75685b);
    line-height: 1.55;
    margin: 0;
}

/* Trang 3: Điểm uy tín độc giả */
.cr-points-rules {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.cr-rule-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: #fdfcfa;
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 10px;
    padding: 0.6rem 0.9rem;
    font-size: 0.86rem;
}

.cr-rule-pill strong {
    min-width: 120px;
    font-weight: 800;
    flex-shrink: 0;
}

.cr-rule-pill.is-plus strong {
    color: #526549;
}

.cr-rule-pill.is-minus strong {
    color: #c53030;
}

.cr-tier-board {
    background-color: #fdfcfa;
    border: 1px solid var(--cr-border, #e8e2d7);
    border-radius: 14px;
    padding: 1.15rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.cr-tier-board-title {
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--cr-text, #433528);
    padding-bottom: 0.4rem;
    border-bottom: 1px dashed var(--cr-border, #e8e2d7);
}

.cr-tier-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}

.cr-tier-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    font-size: 0.875rem;
}

.cr-tier-range {
    font-weight: 700;
}

.cr-tier-row.tier-high {
    background: #edf1e9;
    color: #41503a;
}

.cr-tier-row.tier-mid {
    background: #f4efe4;
    color: #713a18;
}

.cr-tier-row.tier-low {
    background: #fffbeb;
    color: #92400e;
}

.cr-tier-row.tier-lock {
    background: #fef2f2;
    color: #b91c1c;
}

/* Nút mũi tên Trái / Phải */
.cr-slider-arrow {
    position: absolute;
    top: 46%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--cr-border, #e8e2d7);
    background: var(--cr-card, #ffffff);
    color: var(--cr-text, #433528);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 5;
    transition: all 0.2s ease;
}

.cr-slider-arrow:hover {
    background: var(--cr-primary, #a65c25);
    color: #ffffff;
    border-color: var(--cr-primary, #a65c25);
}

.cr-slider-arrow-prev {
    left: 0.85rem;
}

.cr-slider-arrow-next {
    right: 0.85rem;
}

/* 3 dấu tròn chuyển trang dưới đáy Slider */
.cr-slider-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    padding: 0.35rem 0 1.1rem;
}

.cr-slider-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: #d6cec0;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
}

.cr-slider-dot:hover {
    background: #bd865b;
}

.cr-slider-dot.is-active {
    background: var(--cr-primary, #a65c25);
    transform: scale(1.2);
}

/* ========================================================================= */
/* THANH TÌM KIẾM VIÊN THUỐC (PILL) + BỘ LỌC ẨN                              */
/* ========================================================================= */
.cr-search-section {
    max-width: 880px;
    margin-left: auto;
    margin-right: auto;
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

/* Nút mở Bộ lọc nằm gọn bên trong thanh Pill */
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

/* Khay bộ lọc mở rộng bên dưới: gọn nhẹ, không đóng khung thô */
.cr-filter-tray {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    padding: 0.35rem 0.25rem 0;
}

.cr-filter-pills-row {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
}

.cr-pill-select {
    flex: 1 1 190px;
    max-width: 230px;
    border-radius: 999px !important;
    background-color: var(--cr-card, #ffffff) !important;
    border: 1px solid var(--cr-border, #e8e2d7) !important;
    box-shadow: 0 2px 8px rgba(67, 53, 40, 0.03);
    font-size: 0.875rem;
}

:deep(.cr-pill-select .p-select-label) {
    padding: 0.48rem 0.95rem;
    font-size: 0.86rem;
}

.cr-stock-chip {
    height: 38px;
    padding: 0 1rem;
    border-radius: 999px;
    border: 1px solid var(--cr-border, #e8e2d7);
    background-color: var(--cr-card, #ffffff);
    color: var(--cr-text, #433528);
    font-size: 0.86rem;
    font-weight: 600;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(67, 53, 40, 0.03);
    transition: all 0.18s ease;
}

.cr-stock-chip:hover {
    border-color: var(--cr-primary, #a65c25);
}

.cr-stock-chip.is-active {
    background-color: #edf1e9;
    border-color: #a8b59a;
    color: #41503a;
}

.cr-reset-chip {
    height: 38px;
    padding: 0 0.9rem;
    border-radius: 999px;
    border: 1px dashed var(--cr-border, #e8e2d7);
    background-color: transparent;
    color: var(--cr-text-muted, #75685b);
    font-size: 0.84rem;
    font-weight: 600;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    transition: all 0.18s ease;
}

.cr-reset-chip:hover {
    border-color: var(--cr-primary, #a65c25);
    color: var(--cr-primary, #a65c25);
    background-color: #ffffff;
}

.cr-quick-topics-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
}

.cr-quick-topics-label {
    font-size: 0.82rem;
    color: var(--cr-text-muted, #75685b);
    margin-right: 0.15rem;
}

.cr-topic-chip {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--cr-border, #e8e2d7);
    background-color: var(--cr-card, #ffffff);
    color: var(--cr-text-muted, #75685b);
    font-size: 0.8rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s ease;
}

.cr-topic-chip:hover {
    border-color: var(--cr-primary, #a65c25);
    color: var(--cr-primary, #a65c25);
}

.cr-topic-chip.is-selected {
    background-color: var(--cr-primary, #a65c25);
    border-color: var(--cr-primary, #a65c25);
    color: #ffffff;
}

@media (max-width: 992px) {
    .cr-slide {
        padding: 1.75rem 2.75rem 1rem;
    }
    .cr-slide-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
    }
    .cr-process-steps {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .cr-slide {
        padding: 1.5rem 1.25rem 1rem;
    }
    .cr-slider-arrow {
        display: none;
    }
    .cr-slide-heading {
        font-size: 1.5rem;
    }
    .cr-pill-select {
        max-width: 100%;
    }
}
</style>
