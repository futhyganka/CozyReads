<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Password from 'primevue/password';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import StatusTag from '@/components/common/StatusTag.vue';
import docGiaService from '@/services/docgia.service';
import authService from '@/services/auth.service';
import muonTraService from '@/services/muontra.service';
import { useAuthStore } from '@/stores/auth.store';
import {
    LOAI_DOC_GIA_OPTIONS,
    TRANG_THAI_DOC_GIA_OPTIONS,
    GOI_GIA_HAN_OPTIONS,
    PHUONG_THUC_THANH_TOAN_OPTIONS,
    PHAI_OPTIONS,
    REGEX,
} from '@/utils/constants';
import {
    formatDate,
    getLoaiDocGiaLabel,
    getHanMucMuonTheoDiem,
} from '@/utils/formatters';

const toast = useToast();
const confirm = useConfirm();
const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const readers = ref([]);
const totalRecords = ref(0);

const query = reactive({
    search: '',
    loaiDocGia: null,
    trangThai: null,
    page: 1,
    limit: 10,
});

// Dialog Tạo / Sửa hồ sơ độc giả tại quầy
const formDialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const formError = ref('');

// Xác thực OTP tại quầy nếu có nhập email khi tạo mới
const otpCode = ref('');
const registrationToken = ref('');
const otpSent = ref(false);
const otpLoading = ref(false);

const form = reactive({
    hoLot: '',
    ten: '',
    dienThoai: '',
    email: '',
    password: '',
    loaiDocGia: 'docGia_tuDo',
    chuKyThanhToan: '1_thang',
    ngaySinh: null,
    phai: 'khac',
    diaChi: '',
});

// Dialog Đổi trạng thái thẻ & Điều chỉnh điểm
const statusDialogVisible = ref(false);
const selectedReader = ref(null);
const newTrangThai = ref('hoatDong');
const newDiem = ref(100);
const newGoiGiaHan = ref('1_thang');
const newPhuongThuc = ref('tienMat');

// Dialog Lịch sử mượn của độc giả
const historyDialogVisible = ref(false);
const readerBorrows = ref([]);
const historyLoading = ref(false);

async function fetchReaders() {
    loading.value = true;
    try {
        const params = {
            page: query.page,
            limit: query.limit,
        };
        if (query.search.trim()) params.search = query.search.trim();
        if (query.loaiDocGia) params.loaiDocGia = query.loaiDocGia;
        if (query.trangThai) params.trangThai = query.trangThai;

        const res = await docGiaService.getDanhSachDocGia(params);
        readers.value = res.data || [];
        totalRecords.value = res.total || 0;
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        loading.value = false;
    }
}

function onPage(event) {
    query.page = event.page + 1;
    query.limit = event.rows;
    fetchReaders();
}

function openCreateDialog() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    otpCode.value = '';
    registrationToken.value = '';
    otpSent.value = false;

    form.hoLot = '';
    form.ten = '';
    form.dienThoai = '';
    form.email = '';
    form.password = '';
    form.loaiDocGia = 'docGia_tuDo';
    form.chuKyThanhToan = '1_thang';
    form.ngaySinh = null;
    form.phai = 'khac';
    form.diaChi = '';
    formDialogVisible.value = true;
}

function openEditDialog(reader) {
    isEditing.value = true;
    editingId.value = reader._id;
    formError.value = '';
    form.hoLot = reader.hoLot || '';
    form.ten = reader.ten || '';
    form.dienThoai = reader.dienThoai || '';
    form.email = reader.email || '';
    form.ngaySinh = reader.ngaySinh ? new Date(reader.ngaySinh) : null;
    form.phai = reader.phai || 'khac';
    form.diaChi = reader.diaChi || '';
    formDialogVisible.value = true;
}

async function handleSendCounterOtp() {
    formError.value = '';
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!REGEX.EMAIL.test(trimmedEmail)) {
        formError.value = 'Địa chỉ email không hợp lệ.';
        return;
    }

    otpLoading.value = true;
    try {
        await authService.guiOtpDangKy(trimmedEmail);
        form.email = trimmedEmail;
        otpSent.value = true;
        toast.add({
            severity: 'info',
            summary: 'Đã gửi OTP',
            detail: `Đã gửi mã OTP tới ${trimmedEmail}`,
            life: 3500,
        });
    } catch (err) {
        formError.value = err.message;
    } finally {
        otpLoading.value = false;
    }
}

async function handleVerifyCounterOtp() {
    formError.value = '';
    if (!/^\d{6}$/.test(otpCode.value.trim())) {
        formError.value = 'Mã OTP gồm 6 chữ số.';
        return;
    }
    otpLoading.value = true;
    try {
        const res = await authService.xacThucOtp(
            form.email,
            otpCode.value.trim(),
        );
        registrationToken.value = res.registrationToken || res.verificationToken;
        otpCode.value = '';
        toast.add({
            severity: 'success',
            summary: 'Đã xác thực Email',
            detail: 'Bạn có thể lưu hồ sơ độc giả ngay.',
            life: 3000,
        });
    } catch (err) {
        formError.value = err.message;
    } finally {
        otpLoading.value = false;
    }
}

async function handleSaveReader() {
    formError.value = '';
    if (!form.hoLot.trim() || !form.ten.trim()) {
        formError.value = 'Họ lót và tên là bắt buộc.';
        return;
    }
    if (!REGEX.SO_DIEN_THOAI.test(form.dienThoai.trim())) {
        formError.value =
            'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09).';
        return;
    }

    saving.value = true;
    try {
        if (isEditing.value) {
            await docGiaService.capNhatDocGia(editingId.value, {
                hoLot: form.hoLot.trim(),
                ten: form.ten.trim(),
                dienThoai: form.dienThoai.trim(),
                ngaySinh: form.ngaySinh || null,
                phai: form.phai,
                diaChi: form.diaChi.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật thông tin độc giả thành công.',
                life: 3000,
            });
        } else {
            if (form.email.trim() && !registrationToken.value) {
                formError.value =
                    'Khi nhập email cho độc giả tại quầy, bắt buộc phải gửi và xác thực OTP trước (hoặc để trống trường email).';
                saving.value = false;
                return;
            }

            const payload = {
                hoLot: form.hoLot.trim(),
                ten: form.ten.trim(),
                dienThoai: form.dienThoai.trim(),
                loaiDocGia: form.loaiDocGia,
                chuKyThanhToan:
                    form.loaiDocGia === 'docGia_tuDo'
                        ? form.chuKyThanhToan
                        : '6_thang_mien_phi',
                ngaySinh: form.ngaySinh || null,
                phai: form.phai,
                diaChi: form.diaChi.trim(),
            };
            if (form.password) payload.password = form.password;
            if (form.email.trim() && registrationToken.value) {
                payload.email = form.email.trim().toLowerCase();
                payload.registrationToken = registrationToken.value;
            }

            await docGiaService.taoDocGia(payload);
            toast.add({
                severity: 'success',
                summary: 'Đã tạo thẻ độc giả',
                detail: 'Tạo hồ sơ độc giả tại quầy thành công.',
                life: 3500,
            });
        }
        formDialogVisible.value = false;
        await fetchReaders();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function openManageCardDialog(reader) {
    selectedReader.value = reader;
    newTrangThai.value = reader.trangThaiTaiKhoan;
    newDiem.value = reader.diemDocGia ?? 100;
    newGoiGiaHan.value =
        reader.chuKyThanhToan && reader.chuKyThanhToan !== '6_thang_mien_phi'
            ? reader.chuKyThanhToan
            : '1_thang';
    statusDialogVisible.value = true;
}

async function handleUpdateCardStatus() {
    if (!selectedReader.value) return;
    saving.value = true;
    try {
        await docGiaService.capNhatTrangThaiThe(
            selectedReader.value._id,
            newTrangThai.value,
        );
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật trạng thái thẻ',
            detail: `Trạng thái thẻ của ${selectedReader.value.maDocGia} đã được cập nhật.`,
            life: 3000,
        });
        statusDialogVisible.value = false;
        await fetchReaders();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

async function handleUpdatePoints() {
    if (!selectedReader.value) return;
    saving.value = true;
    try {
        await docGiaService.capNhatDiem(selectedReader.value._id, newDiem.value);
        toast.add({
            severity: 'success',
            summary: 'Đã cập nhật điểm uy tín',
            detail: `Điểm của ${selectedReader.value.maDocGia}: ${newDiem.value} điểm.`,
            life: 3000,
        });
        statusDialogVisible.value = false;
        await fetchReaders();
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

async function handleCreateRenewalForReader() {
    if (!selectedReader.value) return;
    saving.value = true;
    try {
        const res = await docGiaService.taoKhoanThanhToanGiaHan(
            selectedReader.value._id,
            {
                goiGiaHan: newGoiGiaHan.value,
                phuongThuc: newPhuongThuc.value,
            },
        );
        toast.add({
            severity: 'success',
            summary: 'Đã tạo khoản gia hạn',
            detail: `Mã giao dịch: ${res.data?.maThanhToan}`,
            life: 4000,
        });
        statusDialogVisible.value = false;
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

async function openReaderHistory(reader) {
    selectedReader.value = reader;
    historyDialogVisible.value = true;
    historyLoading.value = true;
    try {
        const res = await muonTraService.getLichSuMuon(reader._id);
        readerBorrows.value = res.data || [];
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.message,
            life: 4000,
        });
    } finally {
        historyLoading.value = false;
    }
}

function handleDeleteReader(reader) {
    confirm.require({
        header: 'Xác nhận Xóa / Hủy Độc giả',
        message: `Xóa hoặc hủy hồ sơ độc giả "${reader.hoLot} ${reader.ten}" (${reader.maDocGia})? Nếu độc giả đã có lịch sử giao dịch, hệ thống sẽ chuyển sang trạng thái Đã hủy.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Xác nhận',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await docGiaService.xoaDocGia(reader._id);
                toast.add({
                    severity: 'success',
                    summary: 'Hoàn tất',
                    detail: res.message,
                    life: 4000,
                });
                await fetchReaders();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Lỗi',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

onMounted(() => {
    fetchReaders();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Quản lý Hồ sơ & Thẻ Độc giả</span>
                <Button
                    label="Tạo Độc giả tại Quầy"
                    icon="pi pi-user-plus"
                    @click="openCreateDialog"
                />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <InputText
                        v-model="query.search"
                        placeholder="Mã ĐG, họ tên, SĐT, email..."
                        @keyup.enter="
                            query.page = 1;
                            fetchReaders();
                        "
                    />
                    <Select
                        v-model="query.loaiDocGia"
                        :options="LOAI_DOC_GIA_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Đối tượng"
                        showClear
                        @change="
                            query.page = 1;
                            fetchReaders();
                        "
                    />
                    <Select
                        v-model="query.trangThai"
                        :options="TRANG_THAI_DOC_GIA_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Trạng thái thẻ"
                        showClear
                        @change="
                            query.page = 1;
                            fetchReaders();
                        "
                    />
                    <Button
                        label="Lọc"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            query.page = 1;
                            fetchReaders();
                        "
                    />
                </div>
            </div>

            <DataTable
                :value="readers"
                :loading="loading"
                lazy
                paginator
                :rows="query.limit"
                :totalRecords="totalRecords"
                :rowsPerPageOptions="[10, 20, 50]"
                emptyMessage="Không tìm thấy độc giả nào."
                @page="onPage"
            >
                <Column field="maDocGia" header="Mã ĐG" />
                <Column header="Họ tên & Liên hệ">
                    <template #body="{ data }">
                        <strong>{{ data.hoLot }} {{ data.ten }}</strong>
                        <div class="cr-muted">
                            {{ data.dienThoai }}
                            {{ data.email ? ` • ${data.email}` : '' }}
                        </div>
                    </template>
                </Column>
                <Column header="Đối tượng">
                    <template #body="{ data }">
                        {{ getLoaiDocGiaLabel(data.loaiDocGia) }}
                    </template>
                </Column>
                <Column header="Điểm uy tín">
                    <template #body="{ data }">
                        <Tag
                            :value="`${data.diemDocGia}đ (Tối đa ${getHanMucMuonTheoDiem(data.diemDocGia)} cuốn)`"
                            :severity="data.diemDocGia > 40 ? 'success' : 'warn'"
                        />
                    </template>
                </Column>
                <Column header="Hạn thẻ">
                    <template #body="{ data }">
                        {{ formatDate(data.ngayHetHanThe) }}
                    </template>
                </Column>
                <Column header="Trạng thái">
                    <template #body="{ data }">
                        <StatusTag type="docGia" :value="data.trangThaiTaiKhoan" />
                    </template>
                </Column>
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center">
                            <Button
                                icon="pi pi-id-card"
                                severity="info"
                                outlined
                                size="small"
                                title="Quản lý thẻ, điểm & gia hạn"
                                @click="openManageCardDialog(data)"
                            />
                            <Button
                                icon="pi pi-history"
                                severity="secondary"
                                outlined
                                size="small"
                                title="Xem lịch sử mượn"
                                @click="openReaderHistory(data)"
                            />
                            <Button
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                size="small"
                                title="Sửa thông tin"
                                @click="openEditDialog(data)"
                            />
                            <Button
                                v-if="authStore.isAdmin"
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                title="Xóa / Hủy độc giả"
                                @click="handleDeleteReader(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <!-- Dialog Tạo / Sửa Độc giả -->
    <Dialog
        v-model:visible="formDialogVisible"
        :header="
            isEditing
                ? 'Cập nhật Thông tin Độc giả'
                : 'Tạo Hồ sơ Độc giả tại Quầy'
        "
        modal
        :style="{ width: '620px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSaveReader">
            <Message v-if="formError" severity="error">{{ formError }}</Message>

            <div class="cr-form-grid">
                <div class="cr-field">
                    <label class="cr-label">Họ và tên lót *</label>
                    <InputText v-model="form.hoLot" fluid />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Tên *</label>
                    <InputText v-model="form.ten" fluid />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Số điện thoại *</label>
                    <InputText
                        v-model="form.dienThoai"
                        maxlength="10"
                        placeholder="10 chữ số (bắt đầu 03, 05, 07, 08, 09)"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Giới tính</label>
                    <Select
                        v-model="form.phai"
                        :options="PHAI_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Ngày sinh</label>
                    <DatePicker
                        v-model="form.ngaySinh"
                        dateFormat="dd/mm/yy"
                        showIcon
                        fluid
                    />
                </div>

                <template v-if="!isEditing">
                    <div class="cr-field">
                        <label class="cr-label">Đối tượng độc giả</label>
                        <Select
                            v-model="form.loaiDocGia"
                            :options="LOAI_DOC_GIA_OPTIONS"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                    <div
                        v-if="form.loaiDocGia === 'docGia_tuDo'"
                        class="cr-field"
                    >
                        <label class="cr-label">Gói chu kỳ thẻ</label>
                        <Select
                            v-model="form.chuKyThanhToan"
                            :options="GOI_GIA_HAN_OPTIONS"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                    <div class="cr-field">
                        <label class="cr-label">Mật khẩu đăng nhập (Tùy chọn)</label>
                        <Password
                            v-model="form.password"
                            :feedback="false"
                            toggleMask
                            fluid
                        />
                    </div>

                    <div class="cr-field cr-field-full">
                        <label class="cr-label">
                            Email (Tùy chọn — Nếu nhập email bắt buộc xác thực OTP)
                        </label>
                        <div class="cr-flex cr-gap-xs">
                            <InputText
                                v-model="form.email"
                                type="email"
                                :disabled="Boolean(registrationToken)"
                                placeholder="Để trống nếu tạo nhanh không cần email"
                                fluid
                            />
                            <Button
                                v-if="form.email && !registrationToken"
                                type="button"
                                label="Gửi OTP"
                                icon="pi pi-send"
                                severity="secondary"
                                outlined
                                :loading="otpLoading"
                                @click="handleSendCounterOtp"
                            />
                        </div>
                        <div
                            v-if="otpSent && !registrationToken"
                            class="cr-flex cr-gap-xs"
                            style="margin-top: 0.5rem"
                        >
                            <InputText
                                v-model="otpCode"
                                maxlength="6"
                                placeholder="Nhập 6 số OTP"
                            />
                            <Button
                                type="button"
                                label="Xác thực OTP"
                                icon="pi pi-check"
                                :loading="otpLoading"
                                @click="handleVerifyCounterOtp"
                            />
                        </div>
                        <Tag
                            v-if="registrationToken"
                            value="Đã xác thực OTP Email"
                            severity="success"
                        />
                    </div>
                </template>

                <div class="cr-field cr-field-full">
                    <label class="cr-label">Địa chỉ</label>
                    <InputText v-model="form.diaChi" fluid />
                </div>
            </div>

            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="formDialogVisible = false"
                />
                <Button
                    type="submit"
                    label="Lưu Hồ sơ"
                    icon="pi pi-save"
                    :loading="saving"
                />
            </div>
        </form>
    </Dialog>

    <!-- Dialog Quản lý Thẻ, Điểm & Gia hạn -->
    <Dialog
        v-model:visible="statusDialogVisible"
        :header="`Quản lý Thẻ Độc giả: ${selectedReader?.maDocGia || ''}`"
        modal
        :style="{ width: '500px' }"
    >
        <div v-if="selectedReader" class="cr-flex-col cr-gap-lg">
            <div class="cr-flex-col cr-gap-sm">
                <label class="cr-label">1. Cập nhật Trạng thái Thẻ</label>
                <div class="cr-flex cr-gap-sm">
                    <Select
                        v-model="newTrangThai"
                        :options="TRANG_THAI_DOC_GIA_OPTIONS"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                    <Button
                        label="Cập nhật"
                        icon="pi pi-check"
                        :loading="saving"
                        @click="handleUpdateCardStatus"
                    />
                </div>
            </div>

            <div class="cr-flex-col cr-gap-sm">
                <label class="cr-label">2. Điều chỉnh Điểm Uy tín (0 - 100)</label>
                <div class="cr-flex cr-gap-sm">
                    <InputNumber
                        v-model="newDiem"
                        :min="0"
                        :max="100"
                        fluid
                    />
                    <Button
                        label="Lưu điểm"
                        icon="pi pi-star"
                        :loading="saving"
                        @click="handleUpdatePoints"
                    />
                </div>
            </div>

            <div
                v-if="selectedReader.loaiDocGia === 'docGia_tuDo'"
                class="cr-flex-col cr-gap-sm"
            >
                <label class="cr-label">3. Tạo Khoản Thanh toán Gia hạn Thẻ</label>
                <Select
                    v-model="newGoiGiaHan"
                    :options="GOI_GIA_HAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
                <Select
                    v-model="newPhuongThuc"
                    :options="PHUONG_THUC_THANH_TOAN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    fluid
                />
                <Button
                    label="Tạo khoản phí gia hạn"
                    icon="pi pi-calendar-plus"
                    severity="secondary"
                    outlined
                    :loading="saving"
                    @click="handleCreateRenewalForReader"
                />
            </div>
        </div>
    </Dialog>

    <!-- Dialog Xem lịch sử mượn của Độc giả -->
    <Dialog
        v-model:visible="historyDialogVisible"
        :header="`Lịch sử Mượn trả: ${selectedReader?.hoLot || ''} ${selectedReader?.ten || ''} (${selectedReader?.maDocGia || ''})`"
        modal
        :style="{ width: '760px' }"
    >
        <DataTable
            :value="readerBorrows"
            :loading="historyLoading"
            paginator
            :rows="6"
            size="small"
            emptyMessage="Độc giả chưa có lịch sử mượn sách."
        >
            <Column header="Tên sách">
                <template #body="{ data }">
                    <strong>{{ data.maSach?.tenSach }}</strong>
                    <div class="cr-muted">{{ data.maSach?.maSach }}</div>
                </template>
            </Column>
            <Column header="Ngày mượn">
                <template #body="{ data }">{{ formatDate(data.ngayMuon) }}</template>
            </Column>
            <Column header="Hạn trả">
                <template #body="{ data }">{{ formatDate(data.ngayHenTra) }}</template>
            </Column>
            <Column header="Ngày trả">
                <template #body="{ data }">{{ formatDate(data.ngayTra) }}</template>
            </Column>
            <Column header="Trạng thái">
                <template #body="{ data }">
                    <StatusTag type="muon" :value="data.trangThai" />
                </template>
            </Column>
        </DataTable>
    </Dialog>
</template>
