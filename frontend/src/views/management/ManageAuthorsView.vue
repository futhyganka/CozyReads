<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import tacGiaService from '@/services/tacgia.service';

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
    maTG: '',
    tenTg: '',
    quocTich: 'Việt Nam',
});

async function fetchAuthors() {
    loading.value = true;
    try {
        const res = await tacGiaService.getDanhSachTacGia({
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
    fetchAuthors();
}

function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    form.maTG = '';
    form.tenTg = '';
    form.quocTich = 'Việt Nam';
    dialogVisible.value = true;
}

function openEdit(item) {
    isEditing.value = true;
    editingId.value = item._id;
    formError.value = '';
    form.maTG = item.maTG;
    form.tenTg = item.tenTg;
    form.quocTich = item.quocTich || 'Việt Nam';
    dialogVisible.value = true;
}

async function handleSave() {
    formError.value = '';
    if (!form.tenTg.trim()) {
        formError.value = 'Tên tác giả là bắt buộc.';
        return;
    }

    saving.value = true;
    try {
        if (isEditing.value) {
            await tacGiaService.capNhatTacGia(editingId.value, {
                tenTg: form.tenTg.trim(),
                quocTich: form.quocTich.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật tác giả thành công.',
                life: 3000,
            });
        } else {
            await tacGiaService.themTacGia({
                maTG: form.maTG.trim() || undefined,
                tenTg: form.tenTg.trim(),
                quocTich: form.quocTich.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã thêm',
                detail: 'Thêm tác giả thành công.',
                life: 3000,
            });
        }
        dialogVisible.value = false;
        await fetchAuthors();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleDelete(item) {
    confirm.require({
        header: 'Xác nhận xóa tác giả',
        message: `Xóa tác giả "${item.tenTg}" (${item.maTG})?`,
        icon: 'pi pi-trash',
        acceptLabel: 'Xóa',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await tacGiaService.xoaTacGia(item._id);
                toast.add({
                    severity: 'success',
                    summary: 'Đã xóa',
                    detail: res.message,
                    life: 3000,
                });
                await fetchAuthors();
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
    fetchAuthors();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between">
                <span>Quản lý tác giả</span>
                <Button label="Thêm tác giả" @click="openCreate" />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <InputText
                        v-model="search"
                        placeholder="Tìm mã, tên tác giả, quốc tịch..."
                        @keyup.enter="
                            page = 1;
                            fetchAuthors();
                        "
                    />
                    <Button
                        label="Tìm"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            page = 1;
                            fetchAuthors();
                        "
                    />
                    <Button
                        v-if="search"
                        label="Đặt lại"
                        icon="pi pi-filter-slash"
                        severity="secondary"
                        outlined
                        @click="
                            search = '';
                            page = 1;
                            fetchAuthors();
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
                emptyMessage="Không có tác giả nào."
                @page="onPage"
            >
                <Column field="maTG" header="Mã tác giả" />
                <Column field="tenTg" header="Tên tác giả" />
                <Column field="quocTich" header="Quốc tịch" />
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
        :header="isEditing ? 'Cập nhật tác giả' : 'Thêm tác giả mới'"
        modal
        :style="{ width: '440px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSave">
            <Message v-if="formError" severity="error">{{ formError }}</Message>
            <div class="cr-field">
                <label class="cr-label">Mã tác giả (để trống tự sinh)</label>
                <InputText v-model="form.maTG" :disabled="isEditing" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Họ tên tác giả *</label>
                <InputText v-model="form.tenTg" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Quốc tịch</label>
                <InputText v-model="form.quocTich" fluid />
            </div>
            <div class="cr-flex cr-gap-sm" style="justify-content: flex-end">
                <Button
                    type="button"
                    label="Hủy"
                    severity="secondary"
                    outlined
                    @click="dialogVisible = false"
                />
                <Button type="submit" label="Lưu" :loading="saving" />
            </div>
        </form>
    </Dialog>
</template>
