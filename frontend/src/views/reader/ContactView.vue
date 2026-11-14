<script setup>
import Card from 'primevue/card';
import Message from 'primevue/message';
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Liên hệ Thư viện CozyReads</h1>
                <p class="cr-page-subtitle">
                    Thông tin quầy phục vụ độc giả và hỗ trợ thủ tục thẻ thư viện
                </p>
            </div>
        </div>

        <div class="cr-grid-2 cr-section">
            <Card>
                <template #title>Thông tin Quầy Thư viện</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-sm">
                        <div>
                            <span class="cr-muted">Địa chỉ quầy mượn trả:</span>
                            <div><strong>Khu II, Đường 3/2, Quận Ninh Kiều, TP. Cần Thơ</strong></div>
                        </div>
                        <div>
                            <span class="cr-muted">Điện thoại trực quầy:</span>
                            <div><strong>0988 888 888 — 0977 777 777</strong></div>
                        </div>
                        <div>
                            <span class="cr-muted">Email hỗ trợ hệ thống:</span>
                            <div><strong>support@cozyreads.library.vn</strong></div>
                        </div>
                        <div>
                            <span class="cr-muted">Thời gian làm việc tại quầy:</span>
                            <div><strong>Thứ 2 - Thứ 7 (07:30 - 11:30 & 13:30 - 17:30)</strong></div>
                        </div>
                    </div>
                </template>
            </Card>

            <Card>
                <template #title>Hướng dẫn hỗ trợ nhanh</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-sm cr-muted">
                        <p>
                            • <strong>Xác nhận nhận sách giữ online:</strong> Vui lòng cung cấp Mã độc giả (VD: DGA0000000) tại quầy trong vòng 24 giờ sau khi đặt giữ.
                        </p>
                        <p>
                            • <strong>Thanh toán phí gia hạn / bồi thường sách mất:</strong> Độc giả có thể tạo yêu cầu thanh toán trên cổng tài khoản và hoàn tất xác nhận tại quầy thủ thư.
                        </p>
                        <Message severity="info" :closable="false">
                            Hệ thống hiện tiếp nhận yêu cầu hỗ trợ trực tiếp tại quầy hoặc qua số điện thoại/email thư viện (Backend chưa cung cấp API lưu biểu mẫu tin nhắn liên hệ trực tuyến).
                        </Message>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
