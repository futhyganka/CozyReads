<script setup>
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
</script>

<template>
    <Card>
        <template #header>
            <div class="cr-book-cover">
                <img
                    v-if="book.hinhAnh"
                    :src="book.hinhAnh"
                    :alt="book.tenSach"
                    style="width: 100%; height: 100%; object-fit: cover"
                />
                <div v-else class="cr-flex-col cr-flex-center cr-gap-xs">
                    <i class="pi pi-book" style="font-size: 2.5rem"></i>
                    <span class="cr-muted">{{ book.maSach }}</span>
                </div>
            </div>
        </template>
        <template #title>
            <div class="cr-flex-between">
                <Tag
                    :value="book.danhMuc?.tenDm || 'Sách thư viện'"
                    severity="secondary"
                />
                <Tag
                    :value="
                        book.soQuyen > 0
                            ? `Còn ${book.soQuyen} quyển`
                            : 'Tạm hết'
                    "
                    :severity="book.soQuyen > 0 ? 'success' : 'danger'"
                />
            </div>
            <div style="margin-top: 0.5rem; font-size: 1.05rem; font-weight: 700">
                {{ book.tenSach }}
            </div>
        </template>
        <template #subtitle>
            <div class="cr-flex-col cr-gap-xs">
                <span>
                    <i class="pi pi-user" style="font-size: 0.8rem"></i>
                    {{ book.tacGia?.tenTg || 'Chưa rõ tác giả' }}
                </span>
                <span>
                    <i class="pi pi-building" style="font-size: 0.8rem"></i>
                    {{ book.maNXB?.tenNxb || 'NXB' }} ({{ book.namXuatBan }})
                </span>
            </div>
        </template>
        <template #content>
            <div class="cr-flex-between" style="margin-top: 0.25rem">
                <span class="cr-muted">Giá bìa:</span>
                <strong>{{ formatCurrency(book.donGia) }}</strong>
            </div>
        </template>
        <template #footer>
            <div class="cr-flex cr-gap-sm">
                <Button
                    label="Chi tiết"
                    icon="pi pi-eye"
                    severity="secondary"
                    outlined
                    fluid
                    @click="emit('view-detail', book)"
                />
                <Button
                    label="Giữ sách"
                    icon="pi pi-bookmark"
                    :disabled="book.soQuyen <= 0"
                    :loading="reserving"
                    fluid
                    @click="emit('reserve', book)"
                />
            </div>
        </template>
    </Card>
</template>
