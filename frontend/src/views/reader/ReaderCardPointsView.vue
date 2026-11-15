<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import ProgressBar from 'primevue/progressbar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import docGiaService from '@/services/docgia.service';
import { useAuthStore } from '@/stores/auth.store';
import {
    THANG_DIEM_MUON_SACH,
    GOI_GIA_HAN_OPTIONS,
    PHUONG_THUC_THANH_TOAN_OPTIONS,
} from '@/utils/constants';
import {
    formatDate,
    getLoaiDocGiaLabel,
    getGoiGiaHanLabel,
    getHanMucMuonTheoDiem,
} from '@/utils/formatters';

const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const selectedGoi = ref('1_thang');
const selectedPhuongThuc = ref('tienMat');
const submittingRenewal = ref(false);

const profile = computed(() => authStore.userProfile || {});
const maxBooks = computed(() => getHanMucMuonTheoDiem(profile.value.diemDocGia));

function handleRequestRenewal() {
    confirm.require({
        header: 'Xác nhận Tạo yêu cầu Gia hạn thẻ',
        message: 'Hệ thống sẽ tạo khoản phí gia hạn thẻ tương ứng. Bạn có thể thanh toán và nhờ nhân viên xác nhận tại quầy.',
        icon: 'pi pi-calendar-plus',
        acceptLabel: 'Tạo yêu cầu gia hạn',
        rejectLabel: 'Hủy',
        accept: async () => {
            submittingRenewal.value = true;
            try {
                const res = await docGiaService.taoKhoanThanhToanGiaHan(
                    authStore.userId,
                    {
                        goiGiaHan: selectedGoi.value,
                        phuongThuc: selectedPhuongThuc.value,
                    },
                );
                toast.add({
                    severity: 'success',
                    summary: 'Đã tạo yêu cầu gia hạn',
                    detail: `Mã giao dịch: ${res.data?.maThanhToan}`,
                    life: 4500,
                });
                await authStore.refreshProfile();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể tạo yêu cầu',
                    detail: err.message,
                    life: 4500,
                });
            } finally {
                submittingRenewal.value = false;
            }
        },
    });
}

onMounted(async () => {
    await authStore.refreshProfile();
    if (
        profile.value.chuKyThanhToan &&
        profile.value.chuKyThanhToan !== '6_thang_mien_phi'
    ) {
        selectedGoi.value = profile.value.chuKyThanhToan;
    }
});
</script>

<template>
    <div class="cr-flex-col cr-gap-lg">
        <div class="cr-grid-2">
            <Card>
                <template #title>Thông tin Thẻ Độc giả</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-sm">
                        <div class="cr-flex-between">
                            <span class="cr-muted">Mã thẻ độc giả:</span>
                            <Tag :value="profile.maDocGia" severity="secondary" />
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Họ và tên:</span>
                            <strong>{{ profile.hoLot }} {{ profile.ten }}</strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Loại độc giả:</span>
                            <strong>{{ getLoaiDocGiaLabel(profile.loaiDocGia) }}</strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Trạng thái thẻ:</span>
                            <StatusTag type="docGia" :value="profile.trangThaiTaiKhoan" />
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Chu kỳ gia hạn:</span>
                            <strong>
                                {{
                                    profile.chuKyThanhToan
                                        ? getGoiGiaHanLabel(profile.chuKyThanhToan)
                                        : 'Chưa đăng ký gói'
                                }}
                            </strong>
                        </div>
                        <div class="cr-flex-between">
                            <span class="cr-muted">Ngày hết hạn thẻ:</span>
                            <strong v-if="profile.ngayHetHanThe">
                                {{ formatDate(profile.ngayHetHanThe) }}
                            </strong>
                            <Tag
                                v-else
                                value="Chưa kích hoạt gói thẻ"
                                severity="warn"
                            />
                        </div>
                    </div>
                </template>
            </Card>

            <Card>
                <template #title>Điểm Uy tín & Hạn mức Mượn sách</template>
                <template #content>
                    <div class="cr-flex-col cr-gap-md">
                        <div class="cr-flex-between">
                            <span>Điểm uy tín hiện tại:</span>
                            <strong style="font-size: 1.4rem; color: var(--cr-primary)">
                                {{ profile.diemDocGia ?? 0 }} / 100 điểm
                            </strong>
                        </div>

                        <ProgressBar :value="Number(profile.diemDocGia || 0)" />

                        <Message severity="info" :closable="false">
                            Với <strong>{{ profile.diemDocGia ?? 0 }} điểm</strong>, bạn được phép mượn tối đa <strong>{{ maxBooks }} cuốn sách</strong> cùng lúc.
                        </Message>

                        <div class="cr-muted">
                            Mốc tích điểm không vi phạm gần nhất:
                            <strong>{{ formatDate(profile.ngayCapNhatDiemKhongViPham) }}</strong>
                            (Mỗi 3 ngày không có sách quá hạn/báo mất được +1 điểm).
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Gia hạn thẻ dành cho Độc giả tự do -->
        <Card v-if="profile.loaiDocGia === 'docGia_tuDo'">
            <template #title>
                {{
                    profile.ngayHetHanThe
                        ? 'Đăng ký Gia hạn Thẻ Độc giả Tự do'
                        : 'Đăng ký Gói Kích hoạt Thẻ Độc giả Tự do'
                }}
            </template>
            <template #subtitle>
                {{
                    profile.ngayHetHanThe
                        ? 'Tạo yêu cầu thanh toán phí gia hạn chu kỳ thẻ'
                        : 'Chọn gói thẻ và tạo yêu cầu thanh toán để kích hoạt quyền đặt giữ / mượn sách'
                }}
            </template>
            <template #content>
                <Message
                    v-if="!profile.ngayHetHanThe"
                    severity="warn"
                    :closable="false"
                    style="margin-bottom: 1rem"
                >
                    Thẻ Độc giả tự do của bạn mới tạo và <strong>chưa kích hoạt gói sử dụng</strong>. Vui lòng chọn chu kỳ gói bên dưới, tạo yêu cầu thanh toán và hoàn tất đóng phí tại quầy thư viện để bắt đầu đặt giữ hoặc mượn sách.
                </Message>
                <div class="cr-form-grid">
                    <div class="cr-field">
                        <label class="cr-label">Chọn gói chu kỳ gia hạn</label>
                        <Select
                            v-model="selectedGoi"
                            :options="GOI_GIA_HAN_OPTIONS"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Phương thức thanh toán dự kiến</label>
                        <Select
                            v-model="selectedPhuongThuc"
                            :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>
                <div style="margin-top: 1rem">
                    <Button
                        label="Tạo yêu cầu Thanh toán Gia hạn"
                        icon="pi pi-calendar-plus"
                        :loading="submittingRenewal"
                        @click="handleRequestRenewal"
                    />
                </div>
            </template>
        </Card>

        <Card v-else>
            <template #title>Chế độ Gia hạn Tự động Miễn phí</template>
            <template #content>
                <Message severity="success" :closable="false">
                    Thẻ của bạn thuộc nhóm <strong>{{ getLoaiDocGiaLabel(profile.loaiDocGia) }}</strong> nên được hệ thống tự động gia hạn miễn phí theo chu kỳ 6 tháng (180 ngày) khi đến hạn.
                </Message>
            </template>
        </Card>

        <Card>
            <template #title>Bảng Thang điểm Uy tín CozyReads</template>
            <template #content>
                <DataTable :value="THANG_DIEM_MUON_SACH" size="small">
                    <Column header="Khoảng điểm">
                        <template #body="{ data }">
                            {{ data.min }} - {{ data.max }} điểm
                        </template>
                    </Column>
                    <Column header="Hạn mức mượn">
                        <template #body="{ data }">
                            <Tag
                                :value="`${data.soSachToiDa} cuốn`"
                                :severity="data.soSachToiDa > 0 ? 'success' : 'danger'"
                            />
                        </template>
                    </Column>
                    <Column field="label" header="Chi tiết" />
                </DataTable>
            </template>
        </Card>
    </div>
</template>
