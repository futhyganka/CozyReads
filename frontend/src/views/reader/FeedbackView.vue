<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import phanHoiService from '@/services/phanhoi.service';
import { useAuthStore } from '@/stores/auth.store';

const toast = useToast();
const authStore = useAuthStore();

const noiDung = ref('');
const guiAnDanh = ref(false);
const noiDungError = ref('');
const apiError = ref('');
const submitting = ref(false);
const lastSubmitted = ref(null);

function validateForm() {
    if (!noiDung.value || !noiDung.value.trim()) {
        noiDungError.value = 'Vui lòng nhập nội dung góp ý.';
        return false;
    }
    noiDungError.value = '';
    return true;
}

async function handleSubmitFeedback() {
    apiError.value = '';
    if (!validateForm()) {
        return;
    }

    submitting.value = true;
    try {
        const res = await phanHoiService.guiGopY({
            noiDung: noiDung.value.trim(),
            guiAnDanh: authStore.isReader ? guiAnDanh.value : true,
        });
        lastSubmitted.value = res.data;
        noiDung.value = '';
        noiDungError.value = '';
        toast.add({
            severity: 'success',
            summary: 'Gửi góp ý thành công',
            detail:
                res.message ||
                'Cảm ơn bạn đã đóng góp ý kiến cho Thư viện CozyReads.',
            life: 4500,
        });
    } catch (err) {
        apiError.value = err.message;
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Góp ý Thư viện CozyReads</h1>
                <p class="cr-page-subtitle">
                    Mọi ý kiến đóng góp của bạn đều giúp CozyReads hoàn thiện chất lượng phục vụ
                </p>
            </div>
        </div>

        <div class="cr-grid-2 cr-section">
            <Card>
                <template #title>Gửi Ý kiến Góp ý</template>
                <template #content>
                    <form
                        class="cr-flex-col cr-gap-md"
                        novalidate
                        @submit.prevent="handleSubmitFeedback"
                    >
                        <Message v-if="apiError" severity="error">
                            {{ apiError }}
                        </Message>

                        <Message
                            v-if="lastSubmitted"
                            severity="success"
                            :closable="true"
                            @close="lastSubmitted = null"
                        >
                            Đã ghi nhận góp ý mã
                            <strong>{{ lastSubmitted.maPhanHoi }}</strong>. Cảm ơn sự đóng góp của bạn!
                        </Message>

                        <div class="cr-flex-between cr-flex-wrap">
                            <div>
                                <span class="cr-muted">Tư cách người gửi: </span>
                                <Tag
                                    v-if="!authStore.isReader || guiAnDanh"
                                    value="Ẩn danh"
                                    severity="secondary"
                                />
                                <Tag
                                    v-else
                                    :value="`${authStore.displayName} (${authStore.userProfile?.maDocGia || ''})`"
                                    severity="info"
                                />
                            </div>

                            <div
                                v-if="authStore.isReader"
                                class="cr-items-center"
                            >
                                <Checkbox
                                    v-model="guiAnDanh"
                                    inputId="anonymous-feedback"
                                    binary
                                />
                                <label
                                    for="anonymous-feedback"
                                    style="cursor: pointer"
                                >
                                    Gửi góp ý ẩn danh
                                </label>
                            </div>
                        </div>

                        <div class="cr-field">
                            <label class="cr-label" for="feedback-content">
                                Nội dung góp ý *
                            </label>
                            <Textarea
                                id="feedback-content"
                                v-model="noiDung"
                                rows="6"
                                placeholder="Nhập ý kiến đóng góp về dịch vụ, không gian thư viện, quy trình mượn trả hoặc kho sách..."
                                :invalid="!!noiDungError"
                                :class="{ 'cr-input-invalid': !!noiDungError }"
                                fluid
                                @update:modelValue="validateForm"
                                @blur="validateForm"
                            />
                            <small v-if="noiDungError" class="cr-error">
                                {{ noiDungError }}
                            </small>
                        </div>

                        <Button
                            type="submit"
                            label="Gửi Góp ý"
                            icon="pi pi-comment"
                            :loading="submitting"
                            fluid
                        />
                    </form>
                </template>
            </Card>

            <Card>
                <template #title>Về Chức năng Góp ý</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-sm cr-muted">
                        <p>
                            • <strong>Tiếp nhận & Xem xét:</strong> Toàn bộ ý kiến góp ý được chuyển trực tiếp tới bộ phận Quản lý và Thủ thư của CozyReads để rà soát và cải thiện chất lượng dịch vụ.
                        </p>
                        <p>
                            • <strong>Quyền riêng tư:</strong> Khách chưa đăng nhập hoặc độc giả chọn chế độ ẩn danh sẽ được hệ thống ghi nhận hoàn toàn <strong>Ẩn danh</strong> (không lưu thông tin định danh cá nhân).
                        </p>
                        <p>
                            • <strong>Cần phản hồi trực tiếp?</strong> Nếu bạn có câu hỏi hoặc vấn đề tài khoản cần thư viện trả lời qua Email, vui lòng sử dụng trang
                            <router-link to="/lien-he">Liên hệ</router-link>.
                        </p>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
