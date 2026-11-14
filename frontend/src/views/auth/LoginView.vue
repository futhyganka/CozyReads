<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const errorMsg = ref('');

const readerForm = reactive({
    identifier: '',
    password: '',
});

async function handleReaderLogin() {
    errorMsg.value = '';
    if (!readerForm.identifier.trim() || !readerForm.password) {
        errorMsg.value =
            'Vui lòng nhập đầy đủ Email (hoặc Mã độc giả) và mật khẩu.';
        return;
    }

    try {
        const res = await authStore.loginReader({
            identifier: readerForm.identifier.trim(),
            password: readerForm.password,
        });
        toast.add({
            severity: 'success',
            summary: 'Đăng nhập thành công',
            detail: `Chào mừng độc giả ${res.docGia?.hoLot || ''} ${res.docGia?.ten || ''}`.trim(),
            life: 3000,
        });
        const redirectPath =
            route.query.redirect &&
            !String(route.query.redirect).startsWith('/quan-ly')
                ? String(route.query.redirect)
                : '/';
        router.push(redirectPath);
    } catch (err) {
        errorMsg.value = err.message;
    }
}
</script>

<template>
    <Card>
        <template #title>
            <div style="text-align: center">Đăng nhập Độc giả CozyReads</div>
        </template>
        <template #subtitle>
            <div style="text-align: center">
                Sử dụng Email hoặc Mã thẻ độc giả để đặt giữ sách và quản lý tài khoản
            </div>
        </template>
        <template #content>
            <Message
                v-if="errorMsg"
                severity="error"
                style="margin-bottom: 1rem"
            >
                {{ errorMsg }}
            </Message>

            <form
                class="cr-flex-col cr-gap-md"
                @submit.prevent="handleReaderLogin"
            >
                <div class="cr-field">
                    <label class="cr-label" for="reader-id">
                        Email hoặc Mã độc giả
                    </label>
                    <InputText
                        id="reader-id"
                        v-model="readerForm.identifier"
                        placeholder="VD: docgia.an@gmail.com hoặc DGA0000000"
                        fluid
                    />
                </div>

                <div class="cr-field">
                    <label class="cr-label" for="reader-pass">
                        Mật khẩu
                    </label>
                    <Password
                        inputId="reader-pass"
                        v-model="readerForm.password"
                        :feedback="false"
                        toggleMask
                        placeholder="Nhập mật khẩu của bạn"
                        fluid
                    />
                </div>

                <div class="cr-flex-between">
                    <router-link to="/quen-mat-khau">
                        Quên mật khẩu?
                    </router-link>
                    <router-link to="/dang-ky">
                        Đăng ký thẻ độc giả mới
                    </router-link>
                </div>

                <Button
                    type="submit"
                    label="Đăng nhập"
                    icon="pi pi-sign-in"
                    :loading="authStore.loading"
                    fluid
                />
            </form>

            <Divider />
            <div class="cr-muted" style="text-align: center">
                Bạn muốn xem sách trước khi đăng nhập?
                <router-link to="/kham-pha">Khám phá kho sách ngay</router-link>
            </div>
        </template>
    </Card>
</template>
