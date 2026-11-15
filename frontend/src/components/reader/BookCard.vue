<script setup>
import { ref, computed, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { formatCurrency } from '@/utils/formatters';

const props = defineProps({
    book: {
        type: Object,
        required: true,
    },
    reserving: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['view-detail', 'reserve']);

const imgError = ref(false);
watch(
    () => props.book?.hinhAnh,
    () => {
        imgError.value = false;
    },
);

const categoryName = computed(
    () =>
        props.book.danhMuc?.tenDm ||
        props.book.maDM?.[0]?.tenDm ||
        'Sách thư viện',
);

const authorName = computed(
    () =>
        props.book.tacGia?.tenTg ||
        props.book.maTG?.[0]?.tenTg ||
        'Chưa rõ tác giả',
);

const publisherInfo = computed(() => {
    const nxb = props.book.maNXB?.tenNxb || 'NXB';
    return props.book.namXuatBan ? `${nxb} (${props.book.namXuatBan})` : nxb;
});
</script>

<template>
    <Card class="cr-book-card" @click="emit('view-detail', book)">
        <template #header>
            <div class="cr-book-cover">
                <img
                    v-if="book.hinhAnh && !imgError"
                    :src="book.hinhAnh"
                    :alt="book.tenSach"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    @error="imgError = true"
                />
                <div v-else class="cr-flex-col cr-flex-center cr-gap-xs">
                    <i class="pi pi-book" style="font-size: 2.25rem"></i>
                    <span class="cr-muted" style="font-size: 0.8125rem">{{ book.maSach }}</span>
                </div>
            </div>
        </template>
        <template #title>
            <div class="cr-book-tags">
                <Tag
                    :value="categoryName"
                    :title="categoryName"
                    severity="secondary"
                    class="cr-book-category-tag"
                />
                <Tag
                    :value="
                        book.soQuyen > 0
                            ? `Còn ${book.soQuyen} quyển`
                            : 'Tạm hết'
                    "
                    :severity="book.soQuyen > 0 ? 'success' : 'danger'"
                    class="cr-book-stock-tag"
                />
            </div>
            <div class="cr-book-title" :title="book.tenSach">
                {{ book.tenSach }}
            </div>
        </template>
        <template #subtitle>
            <div class="cr-flex-col cr-gap-xs" style="margin-top: 0.125rem">
                <div class="cr-book-meta" :title="authorName">
                    <i class="pi pi-user" style="font-size: 0.8rem; flex-shrink: 0"></i>
                    <span>{{ authorName }}</span>
                </div>
                <div class="cr-book-meta" :title="publisherInfo">
                    <i class="pi pi-building" style="font-size: 0.8rem; flex-shrink: 0"></i>
                    <span>{{ publisherInfo }}</span>
                </div>
            </div>
        </template>
        <template #content>
            <div class="cr-flex-between" style="margin-top: 0.375rem">
                <span class="cr-muted">Giá bìa:</span>
                <strong>{{ formatCurrency(book.donGia) }}</strong>
            </div>
        </template>
        <template #footer>
            <Button
                label="Giữ sách"
                icon="pi pi-bookmark"
                :disabled="book.soQuyen <= 0"
                :loading="reserving"
                fluid
                @click.stop="emit('reserve', book)"
            />
        </template>
    </Card>
</template>
