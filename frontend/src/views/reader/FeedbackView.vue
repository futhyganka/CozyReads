<script setup>
import Card from 'primevue/card';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Góp ý & Đề xuất Sách mới</h1>
                <p class="cr-page-subtitle">
                    Ý kiến đóng góp của độc giả giúp CozyReads nâng cao chất lượng phục vụ
                </p>
            </div>
        </div>

        <Card>
            <template #title>Trạng thái chức năng Góp ý trực tuyến</template>
            <template #content>
                <div class="cr-flex-col cr-gap-md">
                    <Message severity="warn" :closable="false">
                        <strong>Chức năng gửi biểu mẫu góp ý trực tuyến hiện chưa khả dụng:</strong>
                        Backend hiện tại chưa có API endpoint lưu trữ thông tin góp ý / phản hồi từ độc giả. Theo quy tắc toàn vẹn dữ liệu, hệ thống không sử dụng nút bấm giả hoặc lưu trữ tạm thời.
                    </Message>

                    <p class="cr-muted">
                        Nếu bạn muốn đề xuất bổ sung đầu sách mới hoặc phản ánh chất lượng dịch vụ, vui lòng liên hệ trực tiếp với thủ thư tại quầy hoặc gửi email về địa chỉ hỗ trợ của thư viện.
                    </p>

                    <div class="cr-items-center">
                        <Button
                            label="Xem thông tin Liên hệ"
                            icon="pi pi-envelope"
                            @click="router.push('/lien-he')"
                        />
                        <Button
                            label="Khám phá Kho sách"
                            icon="pi pi-compass"
                            severity="secondary"
                            outlined
                            @click="router.push('/kham-pha')"
                        />
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
