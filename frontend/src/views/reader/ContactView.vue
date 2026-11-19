<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import StatusTag from '@/components/common/StatusTag.vue';
import phanHoiService from '@/services/phanhoi.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/utils/formatters';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const noiDung = ref('');
const noiDungError = ref('');
const apiError = ref('');
const submitting = ref(false);

const myContacts = ref([]);
const loadingHistory = ref(false);

function validateForm() {
    if (!noiDung.value || !noiDung.value.trim()) {
        noiDungError.value = 'Vui lòng nhập nội dung liên hệ.';
        return false;
    }
    noiDungError.value = '';
    return true;
}

async function loadMyContacts() {
    if (!authStore.isReader) return;
    loadingHistory.value = true;
    try {
        const res = await phanHoiService.getDanhSachCuaToi({
            loai: 'lienHe',
            limit: 20,
        });
        myContacts.value = res.data || [];
    } catch {
        // Bỏ qua lỗi phụ khi tải lịch sử
    } finally {
        loadingHistory.value = false;
    }
}

async function handleSubmitContact() {
    apiError.value = '';
    if (!validateForm()) {
        return;
    }

    submitting.value = true;
    try {
        const res = await phanHoiService.guiLienHe({
            noiDung: noiDung.value.trim(),
        });
        noiDung.value = '';
        noiDungError.value = '';
        toast.add({
            severity: 'success',
            summary: 'Đã gửi liên hệ',
            detail:
                res.message ||
                `Đã ghi nhận yêu cầu liên hệ mã ${res.data?.maPhanHoi || ''}.`,
            life: 4500,
        });
        await loadMyContacts();
    } catch (err) {
        apiError.value = err.message;
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadMyContacts();
});
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Liên hệ thư viện CozyReads</h1>
                <p class="cr-page-subtitle">
                    Thông tin quầy phục vụ độc giả và gửi yêu cầu hỗ trợ trực tuyến
                </p>
            </div>
        </div>

        <div class="cr-grid-2 cr-section">
            <div class="cr-flex-col cr-gap-md">
                <Card>
                    <template #title>Thông tin quầy thư viện</template>
                    <template #content>
                        <div class="cr-flex-col cr-gap-sm">
                            <div>
                                <span class="cr-muted">Địa chỉ quầy mượn trả:</span>
                                <div>
                                    <strong>
                                        Khu II, Đường 3/2, Quận Ninh Kiều, TP. Cần Thơ
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Điện thoại trực quầy:</span>
                                <div>
                                    <strong>0988 888 888 — 0977 777 777</strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Email hỗ trợ hệ thống:</span>
                                <div>
                                    <strong>nganb2410735@student.ctu.edu.vn</strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Thời gian làm việc tại quầy:</span>
                                <div>
                                    <strong>
                                        Thứ 2 - Thứ 7 (07:30 -  20:30)
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <Card>
                    <template #title>Hướng dẫn hỗ trợ nhanh</template>
                    <template #content>
                        <div class="cr-flex-col cr-gap-sm cr-muted">
                            <p>
                                • <strong>Xác nhận nhận sách giữ online:</strong> Vui lòng đến quầy nhận sách trong vòng 24 giờ sau khi đặt giữ.
                            </p>
                            <p>
                                • <strong>Thanh toán phí gia hạn / bồi thường sách mất:</strong> Độc giả có thể tạo yêu cầu thanh toán trên hệ thống thư viện hoặc đến quầy thủ thư thanh toán trực tiếp.
                            </p>
                            <p>
                                • <strong>Phản hồi yêu cầu liên hệ:</strong> Thư viện sẽ gửi câu trả lời trực tiếp vào địa chỉ Email gắn với hồ sơ thẻ độc giả của bạn.
                            </p>
                        </div>
                    </template>
                </Card>
            </div>

            <Card>
                <template #title>Gửi yêu cầu liên hệ trực tuyến</template>
                <template #content>
                    <div
                        v-if="!authStore.isReader"
                        class="cr-flex-col cr-gap-md"
                    >
                        <Message severity="info" :closable="false">
                            Vui lòng đăng nhập tài khoản để gửi yêu cầu liên hệ. Nhân viên sẽ sớm phản hồi về địa chỉ Email của bạn.
                        </Message>
                        <div>
                            <Button
                                label="Đăng nhập độc giả"
                                icon="pi pi-sign-in"
                                @click="
                                    router.push({
                                        path: '/dang-nhap',
                                        query: { redirect: '/lien-he' },
                                    })
                                "
                            />
                        </div>
                    </div>

                    <form
                        v-else
                        class="cr-flex-col cr-gap-md"
                        novalidate
                        @submit.prevent="handleSubmitContact"
                    >
                        <Message v-if="apiError" severity="error">
                            {{ apiError }}
                        </Message>

                        <div class="cr-grid-2">
                            <div>
                                <span class="cr-muted">Mã độc giả:</span>
                                <div>
                                    <strong>
                                        {{ authStore.userProfile?.maDocGia || '—' }}
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Họ tên độc giả:</span>
                                <div>
                                    <strong>{{ authStore.displayName }}</strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Email nhận phản hồi:</span>
                                <div>
                                    <strong>
                                        {{ authStore.userProfile?.email || '—' }}
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <span class="cr-muted">Số điện thoại:</span>
                                <div>
                                    <strong>
                                        {{ authStore.userProfile?.dienThoai || '—' }}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div class="cr-field">
                            <label class="cr-label" for="contact-content">
                                Nội dung liên hệ *
                            </label>
                            <Textarea
                                id="contact-content"
                                v-model="noiDung"
                                rows="6"
                                placeholder="Nhập nội dung câu hỏi hoặc yêu cầu hỗ trợ của bạn..."
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
                            label="Gửi yêu cầu liên hệ"
                            icon="pi pi-send"
                            :loading="submitting"
                            fluid
                        />
                    </form>
                </template>
            </Card>
        </div>

        <!-- Lịch sử liên hệ của độc giả -->
        <Card v-if="authStore.isReader" class="cr-section">
            <template #title>Lịch sử liên hệ của tôi</template>
            <template #content>
                <DataTable
                    :value="myContacts"
                    :loading="loadingHistory"
                    paginator
                    :rows="5"
                    emptyMessage="Bạn chưa gửi yêu cầu liên hệ nào."
                    responsiveLayout="scroll"
                >
                    <Column field="maPhanHoi" header="Mã liên hệ">
                        <template #body="{ data }">
                            <strong>{{ data.maPhanHoi }}</strong>
                        </template>
                    </Column>
                    <Column header="Nội dung liên hệ">
                        <template #body="{ data }">
                            <div style="white-space: pre-wrap">
                                {{ data.noiDung }}
                            </div>
                        </template>
                    </Column>
                    <Column header="Ngày gửi">
                        <template #body="{ data }">
                            {{ formatDate(data.createdAt, true) }}
                        </template>
                    </Column>
                    <Column header="Trạng thái">
                        <template #body="{ data }">
                            <StatusTag type="phanHoi" :value="data.trangThai" />
                        </template>
                    </Column>
                    <Column header="Phản hồi từ thư viện">
                        <template #body="{ data }">
                            <div
                                v-if="data.noiDungPhanHoi"
                                style="white-space: pre-wrap"
                            >
                                {{ data.noiDungPhanHoi }}
                            </div>
                            <span v-else class="cr-muted">
                                Đang chờ phản hồi qua Email
                            </span>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </div>
</template>
