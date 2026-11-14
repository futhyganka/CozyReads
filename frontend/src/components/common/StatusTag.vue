<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';
import {
    getTrangThaiDocGiaMeta,
    getTrangThaiMuonMeta,
    getTrangThaiThanhToanMeta,
    getLoaiThanhToanMeta,
    getChucVuMeta,
} from '@/utils/formatters';

const props = defineProps({
    type: {
        type: String,
        required: true, // 'docGia' | 'muon' | 'thanhToan' | 'loaiThanhToan' | 'chucVu'
    },
    value: {
        type: String,
        default: '',
    },
});

const meta = computed(() => {
    switch (props.type) {
        case 'docGia':
            return getTrangThaiDocGiaMeta(props.value);
        case 'muon':
            return getTrangThaiMuonMeta(props.value);
        case 'thanhToan':
            return getTrangThaiThanhToanMeta(props.value);
        case 'loaiThanhToan':
            return getLoaiThanhToanMeta(props.value);
        case 'chucVu':
            return getChucVuMeta(props.value);
        default:
            return { label: props.value || '—', severity: 'secondary' };
    }
});
</script>

<template>
    <Tag :value="meta.label" :severity="meta.severity" />
</template>
