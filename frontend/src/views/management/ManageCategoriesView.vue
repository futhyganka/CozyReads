<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import danhMucService from '@/services/danhmuc.service';

const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const saving = ref(false);
const items = ref([]);
const totalRecords = ref(0);
const search = ref('');
const page = ref(1);
const limit = ref(10);

const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const formError = ref('');

const form = reactive({
    maDM: '',
    tenDm: '',
    moTa: '',
});

async function fetchCategories() {
    loading.value = true;
    try {
        const res = await danhMucService.getDanhSachDanhMuc({
            search: search.value.trim() || undefined,
            page: page.value,
            limit: limit.value,
        });
        items.value = res.data || [];
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
    page.value = event.page + 1;
    limit.value = event.rows;
    fetchCategories();
}

function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    form.maDM = '';
    form.tenDm = '';
    form.moTa = '';
    dialogVisible.value = true;
}

function openEdit(item) {
    isEditing.value = true;
    editingId.value = item._id;
    formError.value = '';
    form.maDM = item.maDM;
    form.tenDm = item.tenDm;
    form.moTa = item.moTa || '';
    dialogVisible.value = true;
}

async function handleSave() {
    formError.value = '';
    if (!form.tenDm.trim()) {
        formError.value = 'Tên danh mục là bắt buộc.';
        return;
    }

    saving.value = true;
    try {
        if (isEditing.value) {
            await danhMucService.capNhatDanhMuc(editingId.value, {
                tenDm: form.tenDm.trim(),
                moTa: form.moTa.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật danh mục thành công.',
                life: 3000,
            });
        } else {
            await danhMucService.themDanhMuc({
                maDM: form.maDM.trim() || undefined,
                tenDm: form.tenDm.trim(),
                moTa: form.moTa.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã thêm',
                detail: 'Thêm danh mục thành công.',
                life: 3000,
            });
        }
        dialogVisible.value = false;
        await fetchCategories();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleDelete(item) {
    confirm.require({
        header: 'Xác nhận Xóa Danh mục',
        message: `Xóa danh mục "${item.tenDm}" (${item.maDM})? Hệ thống sẽ từ chối nếu đang có sách thuộc danh mục này.`,
        icon: 'pi pi-trash',
        acceptLabel: 'Xóa',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await danhMucService.xoaDanhMuc(item._id);
                toast.add({
                    severity: 'success',
                    summary: 'Đã xóa',
                    detail: res.message,
                    life: 3000,
                });
                await fetchCategories();
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Không thể xóa',
                    detail: err.message,
                    life: 4000,
                });
            }
        },
    });
}

onMounted(() => {
    fetchCategories();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between">
                <span>Quản lý Danh mục Sách</span>
                <Button label="Thêm Danh mục" icon="pi pi-plus" @click="openCreate" />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center">
                    <InputText
                        v-model="search"
                        placeholder="Tìm mã hoặc tên danh mục..."
                        @keyup.enter="
                            page = 1;
                            fetchCategories();
                        "
                    />
                    <Button
                        label="Tìm"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            page = 1;
                            fetchCategories();
                        "
                    />
                </div>
            </div>

            <DataTable
                :value="items"
                :loading="loading"
                lazy
                paginator
                :rows="limit"
                :totalRecords="totalRecords"
                emptyMessage="Không có danh mục nào."
                @page="onPage"
            >
                <Column field="maDM" header="Mã danh mục" />
                <Column field="tenDm" header="Tên danh mục" />
                <Column field="moTa" header="Mô tả" />
                <Column header="Thao tác">
                    <template #body="{ data }">
                        <div class="cr-items-center">
                            <Button
                                icon="pi pi-pencil"
                                severity="secondary"
                                outlined
                                size="small"
                                @click="openEdit(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                size="small"
                                @click="handleDelete(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>

    <Dialog
        v-model:visible="dialogVisible"
        :header="isEditing ? 'Cập nhật Danh mục' : 'Thêm Danh mục mới'"
        modal
        :style="{ width: '460px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSave">
            <Message v-if="formError" severity="error">{{ formError }}</Message>
            <div class="cr-field">
                <label class="cr-label">Mã danh mục (Để trống tự sinh)</label>
                <InputText v-model="form.maDM" :disabled="isEditing" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Tên danh mục *</label>
                <InputText v-model="form.tenDm" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Mô tả</label>
                <Textarea v-model="form.moTa" rows="3" fluid />
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="dialogVisible = false"
                />
                <Button type="submit" label="Lưu" icon="pi pi-save" :loading="saving" />
            </div>
        </form>
    </Dialog>
</template>
