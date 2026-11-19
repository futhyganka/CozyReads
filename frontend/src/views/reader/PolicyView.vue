<script setup>
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { THANG_DIEM_MUON_SACH, GOI_GIA_HAN_OPTIONS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
</script>

<template>
    <div class="cr-container cr-page">
        <div class="cr-page-header">
            <div>
                <h1 class="cr-page-title">Chính sách & quy định thư viện</h1>
                <p class="cr-page-subtitle">
                    Các quy tắc nghiệp vụ chính thức đang áp dụng trên hệ thống CozyReads
                </p>
            </div>
        </div>

        <div class="cr-grid-2 cr-section">
            <Card>
                <template #title>1. Thang điểm uy tín & hạn mức mượn</template>
                <template #content>
                    <p class="cr-muted" style="margin-bottom: 1rem">
                        Mỗi độc giả khi mở thẻ có <strong>100 điểm</strong> (tối thiểu 0, tối đa 100). Cứ mỗi <strong>3 ngày không vi phạm</strong> được cộng <strong>+1 điểm</strong>.
                    </p>
                    <DataTable :value="THANG_DIEM_MUON_SACH" size="small">
                        <Column header="Mức điểm">
                            <template #body="{ data }">
                                {{ data.min }} - {{ data.max }} điểm
                            </template>
                        </Column>
                        <Column field="soSachToiDa" header="Số sách tối đa">
                            <template #body="{ data }">
                                <Tag
                                    :value="`${data.soSachToiDa} cuốn`"
                                    :severity="data.soSachToiDa > 0 ? 'success' : 'danger'"
                                />
                            </template>
                        </Column>
                        <Column field="label" header="Quy định" />
                    </DataTable>
                </template>
            </Card>

            <Card>
                <template #title>2. Quy định mượn, trả, quá hạn & mất sách</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-sm cr-muted">
                        <div>
                            • <strong>Giữ sách trực tuyến:</strong> Độc giả được đặt giữ sách online trong vòng <strong>24 giờ</strong>. Quá 24 giờ chưa đến quầy nhận sách, phiếu giữ tự động hủy và hoàn lại tồn kho.
                        </div>
                        <div>
                            • <strong>Thời hạn mượn tiêu chuẩn:</strong> <strong>14 ngày</strong> kể từ khi nhân viên xác nhận tại quầy. Không được mượn trùng 2 cuốn của cùng một đầu sách.
                        </div>
                        <div>
                            • <strong>Trả sách quá hạn:</strong> <strong>Không phạt tiền!</strong> Hệ thống tự động trừ <strong>1 điểm / ngày / cuốn sách quá hạn</strong>.
                        </div>
                        <div>
                            • <strong>Làm mất hoặc hỏng sách:</strong> Bồi thường theo <strong>100% đơn giá bìa</strong> của sách và bị trừ điểm gấp <strong>2 lần (x2)</strong> mức điểm quá hạn theo ngày.
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <Card>
            <template #title>3. Chính sách thẻ độc giả & gia hạn</template>
            <template #content>
                <p class="cr-muted" style="margin-bottom: 1rem">
                    Sinh viên, giảng viên và nhân viên được gia hạn tự động <strong>gói 6 tháng miễn phí (180 ngày)</strong> (trừ sinh viên đã tốt nghiệp). Độc giả tự do áp dụng bảng phí gia hạn sau (thời gian ân hạn thanh toán là <strong>7 ngày</strong> trước khi tạm khóa thẻ):
                </p>
                <DataTable :value="GOI_GIA_HAN_OPTIONS" size="small">
                    <Column field="label" header="Tên gói gia hạn" />
                    <Column field="soNgay" header="Số ngày hiệu lực">
                        <template #body="{ data }">{{ data.soNgay }} ngày</template>
                    </Column>
                    <Column field="gia" header="Mức phí">
                        <template #body="{ data }">
                            <strong>{{ formatCurrency(data.gia) }}</strong>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </div>
</template>
