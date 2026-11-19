<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    imageSrc: {
        type: String,
        default: '',
    },
    outputSize: {
        type: Number,
        default: 360,
    },
});

const emit = defineEmits(['update:visible', 'confirm']);

const VIEWPORT_SIZE = 260;

const naturalWidth = ref(0);
const naturalHeight = ref(0);
const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const dragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const startOffsetX = ref(0);
const startOffsetY = ref(0);

// Hệ số cơ sở để ảnh phủ kín khung vuông VIEWPORT_SIZE ở mức zoom = 1
const baseScale = computed(() => {
    if (!naturalWidth.value || !naturalHeight.value) return 1;
    return Math.max(
        VIEWPORT_SIZE / naturalWidth.value,
        VIEWPORT_SIZE / naturalHeight.value,
    );
});

const renderedWidth = computed(
    () => naturalWidth.value * baseScale.value * zoom.value,
);
const renderedHeight = computed(
    () => naturalHeight.value * baseScale.value * zoom.value,
);

function clampOffsets() {
    const maxOffsetX = Math.max(0, (renderedWidth.value - VIEWPORT_SIZE) / 2);
    const maxOffsetY = Math.max(0, (renderedHeight.value - VIEWPORT_SIZE) / 2);
    offsetX.value = Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX.value));
    offsetY.value = Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY.value));
}

function handleImageLoad(event) {
    const img = event.target;
    naturalWidth.value = img.naturalWidth || 300;
    naturalHeight.value = img.naturalHeight || 300;
    zoom.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
}

watch(
    () => props.imageSrc,
    () => {
        zoom.value = 1;
        offsetX.value = 0;
        offsetY.value = 0;
    },
);

watch(zoom, () => {
    clampOffsets();
});

function onPointerDown(e) {
    e.preventDefault();
    dragging.value = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartX.value = clientX;
    dragStartY.value = clientY;
    startOffsetX.value = offsetX.value;
    startOffsetY.value = offsetY.value;

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
}

function onPointerMove(e) {
    if (!dragging.value) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offsetX.value = startOffsetX.value + (clientX - dragStartX.value);
    offsetY.value = startOffsetY.value + (clientY - dragStartY.value);
    clampOffsets();
}

function onPointerUp() {
    dragging.value = false;
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    zoom.value = Math.min(3, Math.max(1, Number((zoom.value + delta).toFixed(2))));
}

function adjustZoom(delta) {
    zoom.value = Math.min(3, Math.max(1, Number((zoom.value + delta).toFixed(2))));
}

function resetTransform() {
    zoom.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
}

function handleConfirmCrop() {
    if (!props.imageSrc || !naturalWidth.value) return;
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = props.outputSize;
        canvas.height = props.outputSize;
        const ctx = canvas.getContext('2d');

        const totalScale = baseScale.value * zoom.value;
        // Tọa độ góc trái trên của khung VIEWPORT trên ảnh gốc
        const imgLeftInViewport =
            (VIEWPORT_SIZE - renderedWidth.value) / 2 + offsetX.value;
        const imgTopInViewport =
            (VIEWPORT_SIZE - renderedHeight.value) / 2 + offsetY.value;

        const sx = Math.max(0, -imgLeftInViewport / totalScale);
        const sy = Math.max(0, -imgTopInViewport / totalScale);
        const sSize = VIEWPORT_SIZE / totalScale;

        ctx.drawImage(
            img,
            sx,
            sy,
            sSize,
            sSize,
            0,
            0,
            props.outputSize,
            props.outputSize,
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        emit('confirm', croppedDataUrl);
        emit('update:visible', false);
    };
    img.src = props.imageSrc;
}
</script>

<template>
    <Dialog
        :visible="visible"
        header="Cắt & căn chỉnh ảnh đại diện"
        modal
        :style="{ width: '400px' }"
        @update:visible="(val) => emit('update:visible', val)"
    >
        <div class="cr-flex-col cr-gap-md" style="align-items: center">
            <div class="cr-muted" style="text-align: center; font-size: 0.85rem">
                Kéo ảnh để di chuyển vị trí và dùng thanh trượt (hoặc con lăn chuột) để phóng to / thu nhỏ.
            </div>

            <!-- Khung cắt ảnh -->
            <div
                :style="{
                    width: `${VIEWPORT_SIZE}px`,
                    height: `${VIEWPORT_SIZE}px`,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    background: '#1e1e1e',
                    cursor: dragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                }"
                @mousedown="onPointerDown"
                @touchstart="onPointerDown"
                @wheel="onWheel"
            >
                <img
                    v-if="imageSrc"
                    :src="imageSrc"
                    alt="Ảnh cần cắt"
                    draggable="false"
                    :style="{
                        width: `${renderedWidth}px`,
                        height: `${renderedHeight}px`,
                        maxWidth: 'none',
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                        pointerEvents: 'none',
                    }"
                    @load="handleImageLoad"
                />

                <!-- Lớp mặt nạ hình tròn hướng dẫn vùng hiển thị avatar -->
                <div
                    style="
                        position: absolute;
                        inset: 0;
                        border-radius: 50%;
                        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.48);
                        border: 2px solid rgba(255, 255, 255, 0.85);
                        pointer-events: none;
                    "
                ></div>
            </div>

            <!-- Thanh điều chỉnh thu phóng -->
            <div class="cr-items-center" style="width: 100%; max-width: 280px; gap: 0.5rem">
                <Button
                    type="button"
                    icon="pi pi-minus"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    :disabled="zoom <= 1"
                    @click="adjustZoom(-0.15)"
                />
                <input
                    v-model.number="zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.02"
                    style="flex: 1; accent-color: var(--cr-primary); cursor: pointer"
                />
                <Button
                    type="button"
                    icon="pi pi-plus"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    :disabled="zoom >= 3"
                    @click="adjustZoom(0.15)"
                />
                <Button
                    type="button"
                    icon="pi pi-refresh"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    title="Đặt lại vị trí"
                    @click="resetTransform"
                />
            </div>

            <div class="cr-flex cr-gap-sm" style="width: 100%; justify-content: flex-end; margin-top: 0.25rem">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="emit('update:visible', false)"
                />
                <Button
                    type="button"
                    label="Xác nhận cắt ảnh"
                    icon="pi pi-check"
                    @click="handleConfirmCrop"
                />
            </div>
        </div>
    </Dialog>
</template>
