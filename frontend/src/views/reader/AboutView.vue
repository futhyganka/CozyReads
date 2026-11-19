<script setup>
import Card from 'primevue/card';
import Tag from 'primevue/tag';
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Giới thiệu thư viện CozyReads</h1>
                <p class="cr-page-subtitle">
                    Không gian đọc sách ấm áp, hiện đại với hệ thống quản lý minh bạch dựa trên điểm uy tín
                </p>
            </div>
            <Tag value="Caramel & Sage Edition" severity="secondary" />
        </div>

        <div class="cr-grid-2 cr-section">
            <Card>
                <template #title>Sứ mệnh của CozyReads</template>
                <template #content>
                    <p class="cr-muted">
                        CozyReads được xây dựng nhằm kết nối cộng đồng yêu sách thông qua nền tảng số hóa quy trình mượn trả. Độc giả có thể tra cứu tồn kho theo thời gian thực, đặt giữ sách trực tuyến trong 24 giờ và theo dõi minh bạch lịch sử mượn trả cũng như điểm uy tín cá nhân.
                    </p>
                </template>
            </Card>

            <Card>
                <template #title>Đối tượng phục vụ</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-xs cr-muted">
                        <div>• <strong>Sinh viên & giảng viên:</strong> Miễn phí gia hạn thẻ theo chu kỳ 6 tháng (180 ngày).</div>
                        <div>• <strong>Nhân viên nội bộ:</strong> Miễn phí thẻ đọc sách chu kỳ 6 tháng.</div>
                        <div>• <strong>Độc giả tự do:</strong> Linh hoạt lựa chọn gói thẻ 1 tháng, 3 tháng hoặc 6 tháng.</div>
                    </div>
                </template>
            </Card>
        </div>

        <Card>
            <template #title>Giá trị cốt lõi</template>
            <template #content>
                <div class="cr-grid-3">
                    <div class="cr-flex-col cr-gap-xs">
                        <strong><i class="pi pi-check-circle"></i> Không phạt tiền quá hạn</strong>
                        <p class="cr-muted">
                            CozyReads không thu tiền phạt trả sách trễ hạn mà sử dụng cơ chế điểm uy tín tự động để khuyến khích ý thức trả sách đúng hạn.
                        </p>
                    </div>
                    <div class="cr-flex-col cr-gap-xs">
                        <strong><i class="pi pi-bookmark"></i> Giữ sách trực tuyến 24h</strong>
                        <p class="cr-muted">
                            Trừ tồn kho nguyên tử ngay khi đặt giữ online, đảm bảo luôn có sách chờ bạn tại quầy trong vòng 24 giờ.
                        </p>
                    </div>
                    <div class="cr-flex-col cr-gap-xs">
                        <strong><i class="pi pi-shield"></i> Bảo mật xác thực OTP</strong>
                        <p class="cr-muted">
                            Mọi thao tác đăng ký, khôi phục mật khẩu và thay đổi email đều được bảo vệ qua mã OTP 6 chữ số gửi tới hộp thư.
                        </p>
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>
