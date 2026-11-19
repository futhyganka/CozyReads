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
import nhaXuatBanService from '@/services/nhaxuatban.service';

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
    maNXB: '',
    tenNxb: '',
    diaChi: '',
});

async function fetchPublishers() {
    loading.value = true;
    try {
        const res = await nhaXuatBanService.getDanhSachNhaXuatBan({
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
    fetchPublishers();
}

function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    formError.value = '';
    form.maNXB = '';
    form.tenNxb = '';
    form.diaChi = '';
    dialogVisible.value = true;
}

function openEdit(item) {
    isEditing.value = true;
    editingId.value = item._id;
    formError.value = '';
    form.maNXB = item.maNXB;
    form.tenNxb = item.tenNxb;
    form.diaChi = item.diaChi || '';
    dialogVisible.value = true;
}

async function handleSave() {
    formError.value = '';
    if (!form.tenNxb.trim()) {
        formError.value = 'Tên nhà xuất bản là bắt buộc.';
        return;
    }

    saving.value = true;
    try {
        if (isEditing.value) {
            await nhaXuatBanService.capNhatNhaXuatBan(editingId.value, {
                tenNxb: form.tenNxb.trim(),
                diaChi: form.diaChi.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã cập nhật',
                detail: 'Cập nhật nhà xuất bản thành công.',
                life: 3000,
            });
        } else {
            await nhaXuatBanService.themNhaXuatBan({
                maNXB: form.maNXB.trim() || undefined,
                tenNxb: form.tenNxb.trim(),
                diaChi: form.diaChi.trim(),
            });
            toast.add({
                severity: 'success',
                summary: 'Đã thêm',
                detail: 'Thêm nhà xuất bản thành công.',
                life: 3000,
            });
        }
        dialogVisible.value = false;
        await fetchPublishers();
    } catch (err) {
        formError.value = err.message;
    } finally {
        saving.value = false;
    }
}

function handleDelete(item) {
    confirm.require({
        header: 'Xác nhận xóa nhà xuất bản',
        message: `Xóa nhà xuất bản "${item.tenNxb}" (${item.maNXB})?`,
        icon: 'pi pi-trash',
        acceptLabel: 'Xóa',
        rejectLabel: 'Hủy',
        accept: async () => {
            try {
                const res = await nhaXuatBanService.xoaNhaXuatBan(item._id);
                toast.add({
                    severity: 'success',
                    summary: 'Đã xóa',
                    detail: res.message,
                    life: 3000,
                });
                await fetchPublishers();
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
    fetchPublishers();
});
</script>

<template>
    <Card>
        <template #title>
            <div class="cr-flex-between">
                <span>Quản lý nhà xuất bản</span>
                <Button label="Thêm nhà xuất bản" @click="openCreate" />
            </div>
        </template>
        <template #content>
            <div class="cr-toolbar">
                <div class="cr-items-center cr-flex-wrap">
                    <InputText
                        v-model="search"
                        placeholder="Tìm mã, tên NXB, địa chỉ..."
                        @keyup.enter="
                            page = 1;
                            fetchPublishers();
                        "
                    />
                    <Button
                        label="Tìm"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        @click="
                            page = 1;
                            fetchPublishers();
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
                            fetchPublishers();
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
                emptyMessage="Không có nhà xuất bản nào."
                @page="onPage"
            >
                <Column field="maNXB" header="Mã NXB" />
                <Column field="tenNxb" header="Tên nhà xuất bản" />
                <Column field="diaChi" header="Địa chỉ" />
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
        :header="isEditing ? 'Cập nhật nhà xuất bản' : 'Thêm nhà xuất bản mới'"
        modal
        :style="{ width: '460px' }"
    >
        <form class="cr-flex-col cr-gap-md" @submit.prevent="handleSave">
            <Message v-if="formError" severity="error">{{ formError }}</Message>
            <div class="cr-field">
                <label class="cr-label">Mã NXB (để trống tự sinh)</label>
                <InputText v-model="form.maNXB" :disabled="isEditing" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Tên nhà xuất bản *</label>
                <InputText v-model="form.tenNxb" fluid />
            </div>
            <div class="cr-field">
                <label class="cr-label">Địa chỉ</label>
                <InputText v-model="form.diaChi" fluid />
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
