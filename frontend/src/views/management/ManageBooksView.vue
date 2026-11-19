<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import sachService from '@/services/sach.service';
import danhMucService from '@/services/danhmuc.service';
import tacGiaService from '@/services/tacgia.service';
import nhaXuatBanService from '@/services/nhaxuatban.service';
import { formatCurrency } from '@/utils/formatters';
import { readImageFileAsDataUrl } from '@/utils/imageUpload';

const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const saving = ref(false);
const books = ref([]);
const totalRecords = ref(0);

const categories = ref([]);
const authors = ref([]);
const publishers = ref([]);

const query = reactive({
    search: '',
    danhMuc: null,
    tacGia: null,
    maNXB: null,
    conHang: null,
    page: 1,
    limit: 10,
});

const stockOptions = [
    { label: 'Còn sách trong kho', value: 'true' },
    { label: 'Hết sách (0 quyển)', value: 'false' },
];

const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const formError = ref('');
const bookImageInput = ref(null);
const selectedFileName = ref('');

async function handleBookImageChange(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    formError.value = '';
    try {
        form.hinhAnh = await readImageFileAsDataUrl(file, {
            maxWidth: 600,
            maxHeight: 900,
        });
        selectedFileName.value = file.name;
    } catch (err) {
        formError.value = err.message;
    } finally {
        if (event.target) event.target.value = '';
    }
}

function clearBookImage() {
    form.hinhAnh = '';
    selectedFileName.value = '';
    if (bookImageInput.value) bookImageInput.value.value = '';
}

const form = reactive({
    maSach: '',
    tenSach: '',
    tacGia: null,
    danhMuc: null,
    maNXB: null,
    namXuatBan: new Date().getFullYear(),
    donGia: 50000,
    soQuyen: 5,
    ngonNgu: 'Tiếng Việt',
    nguonGoc: '',
    hinhAnh: '',
    moTa: '',
});

async function loadRefData() {
    try {
        const [dmRes, tgRes, nxbRes] = await Promise.all([
            danhMucService.getDanhSachDanhMuc({ limit: 100 }),
            tacGiaService.getDanhSachTacGia({ limit: 100 }),
            nhaXuatBanService.getDanhSachNhaXuatBan({ limit: 100 }),
        ]);
        categories.value = dmRes.data || [];
        authors.value = tgRes.data || [];
        publishers.value = nxbRes.data || [];
    } catch {
        // Bỏ qua lỗi phụ
    }
}

async function fetchBooks() {
    loading.value = true;
    try {
        const params = {
            page: query.page,
            limit: query.limit,
        };
        if (query.search.trim()) params.search = query.search.trim();
        if (query.danhMuc) params.danhMuc = query.danhMuc;
        if (query.tacGia) params.tacGia = query.tacGia;
        if (query.maNXB) params.maNXB = query.maNXB;
        if (query.conHang !== null && query.conHang !== undefined) {
            params.conHang = query.conHang;
        }

        const res = await sachService.getDanhSachSach(params);
        books.value = res.data || [];
        totalRecords.value = res.total || 0;
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Lỗi tải danh sách sách',
            detail: err.message,
            life: 4000,
        });
    } finally {
        loading.value = false;
    }
}

function handleResetFilters() {
    query.search = '';
    query.danhMuc = null;
    query.tacGia = null;
    query.maNXB = null;
    query.conHang = null;
    query.page = 1;
    fetchBooks();
}

function onPage(event) {
    query.page = event.page + 1;
    query.limit = event.rows;
    fetchBooks();
}

function openCreateDialog() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    form.maSach = '';
    form.tenSach = '';
    form.tacGia = authors.value[0]?._id || null;
    form.danhMuc = categories.value[0]?._id || null;
    form.maNXB = publishers.value[0]?._id || null;
    form.namXuatBan = new Date().getFullYear();
    form.donGia = 50000;
    form.soQuyen = 5;
    form.ngonNgu = 'Tiếng Việt';
    form.nguonGoc = '';
    form.hinhAnh = '';
    form.moTa = '';
    selectedFileName.value = '';
    dialogVisible.value = true;
}

function openEditDialog(book) {
    isEditing.value = true;
    editingId.value = book._id;
    formError.value = '';
    form.maSach = book.maSach;
    form.tenSach = book.tenSach;
    form.tacGia = book.tacGia?._id || book.tacGia;
    form.danhMuc = book.danhMuc?._id || book.danhMuc;
    form.maNXB = book.maNXB?._id || book.maNXB;
    form.namXuatBan = book.namXuatBan;
    form.donGia = book.donGia;
    form.soQuyen = book.soQuyen;
    form.ngonNgu = book.ngonNgu || 'Tiếng Việt';
    form.nguonGoc = book.nguonGoc || '';
    form.hinhAnh = book.hinhAnh || '';
    form.moTa = book.moTa || '';
    selectedFileName.value = '';
    dialogVisible.value = true;
}

async function handleSaveBook() {
    formError.value = '';
    if (!form.tenSach.trim()) {
        formError.value = 'Tên sách là bắt buộc.';
        return;
    }
    if (!form.tacGia || !form.danhMuc || !form.maNXB) {
        formError.value = 'Vui lòng chọn đầy đủ tác giả, danh mục và nhà xuất bản.';
        return;
    }

    saving.value = true;
    try {
        const payload = {
            tenSach: form.tenSach.trim(),
            tacGia: form.tacGia,
            danhMuc: form.danhMuc,
            maNXB: form.maNXB,
            namXuatBan: Number(form.namXuatBan),
            donGia: Number(form.donGia),
            soQuyen: Number(form.soQuyen),
            ngonNgu: form.ngonNgu.trim(),
            nguonGoc: form.nguonGoc.trim(),
            hinhAnh: form.hinhAnh.trim(),
            moTa: form.moTa.trim(),
        };
        if (!isEditing.value && form.maSach.trim()) {
            payload.maSach = form.maSach.trim().toUpperCase();
        }

        if (isEditing.value) {
            await sachService.capNhatSach(editingId.value, payload);
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật thông tin sách thành công.',
                life: 3000,
            });
        } else {
            await sachService.themSach(payload);
            toast.add({
                severity: 'success',
                summary: 'Đã thêm sách',
                detail: 'Thêm đầu sách mới thành công.',
                life: 3000,
            });
        }
        dialogVisible.value = false;
        await fetchBooks();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleDeleteBook(book) {
    confirm.require({
        header: 'Xác nhận xóa / ngừng lưu hành sách',
        message: `Bạn có chắc chắn muốn xóa đầu sách "${book.tenSach}" (${book.maSach})? Nếu sách đã có lịch sử mượn trả, hệ thống sẽ chuyển tồn kho về 0 và gắn nhãn ngừng lưu hành.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Xác nhận xóa',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await sachService.xoaSach(book._id);
                toast.add({
                    severity: 'success',
                    summary: 'Hoàn tất',
                    detail: res.message,
                    life: 4000,
                });
                await fetchBooks();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể xóa sách',
                    detail: err.message,
                    life: 4500,
                });
            }
        },
    });
}

onMounted(() => {
    loadRefData();
    fetchBooks();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between cr-flex-wrap">
                <span>Quản lý đầu sách thư viện</span>
                <Button
                    label="Thêm đầu sách mới"
                    @click="openCreateDialog"
                />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <InputText
                        v-model="query.search"
                        placeholder="Tìm mã sách, tên sách, mô tả..."
                        @keyup.enter="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Select
                        v-model="query.danhMuc"
                        :options="categories"
                        optionLabel="tenDm"
                        optionValue="_id"
                        placeholder="Danh mục"
                        showClear
                        @change="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Select
                        v-model="query.tacGia"
                        :options="authors"
                        optionLabel="tenTg"
                        optionValue="_id"
                        placeholder="Tác giả"
                        showClear
                        @change="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Select
                        v-model="query.maNXB"
                        :options="publishers"
                        optionLabel="tenNxb"
                        optionValue="_id"
                        placeholder="Nhà xuất bản"
                        showClear
                        @change="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Select
                        v-model="query.conHang"
                        :options="stockOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tồn kho"
                        showClear
                        @change="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Button
                        label="Tìm kiếm"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            query.page = 1;
                            fetchBooks();
                        "
                    />
                    <Button
                        v-if="
                            query.search ||
                            query.danhMuc ||
                            query.tacGia ||
                            query.maNXB ||
                            query.conHang
                        "
                        label="Đặt lại"
                        icon="pi pi-filter-slash"
                        severity="secondary"
                        outlined
                        @click="handleResetFilters"
                    />
                </div>
            </div>

            <DataTable
                :value="books"
                :loading="loading"
                lazy
                paginator
                :rows="query.limit"
                :totalRecords="totalRecords"
                :rowsPerPageOptions="[10, 20, 50]"
                emptyMessage="Chưa có đầu sách nào."
                @page="onPage"
            >
                <Column field="maSach" header="Mã sách" />
                <Column header="Tên sách">
                    <template #body="{ data }">
                        <strong>{{ data.tenSach }}</strong>
                    </template>
                </Column>
                <Column header="Tác giả">
                    <template #body="{ data }">
                        {{ data.tacGia?.tenTg || '—' }}
                    </template>
                </Column>
                <Column header="Danh mục">
                    <template #body="{ data }">
                        <Tag :value="data.danhMuc?.tenDm || '—'" severity="secondary" />
                    </template>
                </Column>
                <Column header="Tồn kho">
                    <template #body="{ data }">
                        <Tag
                            :value="`${data.soQuyen} quyển`"
                            :severity="data.soQuyen > 0 ? 'success' : 'danger'"
                        />
                    </template>
                </Column>
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center">
                            <Button
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                size="small"
                                @click="openEditDialog(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                @click="handleDeleteBook(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <Dialog
        v-model:visible="dialogVisible"
        :header="isEditing ? 'Cập nhật đầu sách' : 'Thêm đầu sách mới'"
        modal
        :style="{ width: '680px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSaveBook">
            <Message v-if="formError" severity="error">{{ formError }}</Message>

            <div class="cr-form-grid">
                <div class="cr-field">
                    <label class="cr-label">Mã sách (để trống sẽ tự sinh)</label>
                    <InputText
                        v-model="form.maSach"
                        :disabled="isEditing"
                        placeholder="VD: MS00001"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Tên sách *</label>
                    <InputText v-model="form.tenSach" fluid />
                </div>

                <div class="cr-field">
                    <label class="cr-label">Danh mục *</label>
                    <Select
                        v-model="form.danhMuc"
                        :options="categories"
                        optionLabel="tenDm"
                        optionValue="_id"
                        placeholder="Chọn danh mục"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Tác giả *</label>
                    <Select
                        v-model="form.tacGia"
                        :options="authors"
                        optionLabel="tenTg"
                        optionValue="_id"
                        placeholder="Chọn tác giả"
                        fluid
                    />
                </div>

                <div class="cr-field">
                    <label class="cr-label">Nhà xuất bản *</label>
                    <Select
                        v-model="form.maNXB"
                        :options="publishers"
                        optionLabel="tenNxb"
                        optionValue="_id"
                        placeholder="Chọn NXB"
                        fluid
                    />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Năm xuất bản *</label>
                    <InputNumber
                        v-model="form.namXuatBan"
                        :useGrouping="false"
                        fluid
                    />
                </div>

                <div class="cr-field">
                    <label class="cr-label">Đơn giá bìa (VNĐ) *</label>
                    <InputNumber v-model="form.donGia" :min="0" fluid />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Số quyển tồn kho *</label>
                    <InputNumber v-model="form.soQuyen" :min="0" fluid />
                </div>

                <div class="cr-field">
                    <label class="cr-label">Ngôn ngữ</label>
                    <InputText v-model="form.ngonNgu" fluid />
                </div>
                <div class="cr-field">
                    <label class="cr-label">Nguồn gốc</label>
                    <InputText v-model="form.nguonGoc" fluid />
                </div>

                <div class="cr-field cr-field-full">
                    <label class="cr-label">Hình ảnh bìa sách</label>
                    <input
                        ref="bookImageInput"
                        type="file"
                        accept="image/*"
                        style="display: none"
                        @change="handleBookImageChange"
                    />
                    <div class="cr-items-center cr-flex-wrap" style="gap: 1rem">
                        <div
                            v-if="form.hinhAnh"
                            style="width: 76px; height: 108px; border: 1px solid var(--cr-border); border-radius: 6px; overflow: hidden; background: var(--cr-sage-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0"
                        >
                            <img
                                :src="form.hinhAnh"
                                alt="Xem trước bìa sách"
                                referrerpolicy="no-referrer"
                                style="width: 100%; height: 100%; object-fit: contain"
                            />
                        </div>
                        <div class="cr-flex-col cr-gap-xs">
                            <div class="cr-items-center cr-flex-wrap">
                                <Button
                                    type="button"
                                    :label="form.hinhAnh ? 'Đổi ảnh bìa khác' : 'Chọn tệp ảnh bìa từ máy'"
                                    icon="pi pi-upload"
                                    severity="secondary"
                                    outlined
                                    size="small"
                                    @click="bookImageInput?.click()"
                                />
                                <Button
                                    v-if="form.hinhAnh"
                                    type="button"
                                    label="Xóa ảnh"
                                    icon="pi pi-times"
                                    severity="danger"
                                    text
                                    size="small"
                                    @click="clearBookImage"
                                />
                            </div>
                            <span class="cr-muted">
                                {{
                                    selectedFileName
                                        ? `Đã chọn: ${selectedFileName}`
                                        : 'Hỗ trợ tệp JPG, PNG, WEBP, GIF, SVG (tối đa 5MB).'
                                }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="cr-field cr-field-full">
                    <label class="cr-label">Mô tả nội dung</label>
                    <Textarea v-model="form.moTa" rows="3" fluid />
                </div>
            </div>

            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="dialogVisible = false"
                />
                <Button
                    type="submit"
                    label="Lưu đầu sách"
                    :loading="saving"
                />
            </div>
        </form>
    </Dialog>
</template>
