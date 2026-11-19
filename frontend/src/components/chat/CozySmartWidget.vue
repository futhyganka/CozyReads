<script setup>
import { ref, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import chatService from '@/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';
import chatbotImg from '@/assets/chat-bot.png';

const router = useRouter();
const authStore = useAuthStore();

const isOpen = ref(false);
const inputMessage = ref('');
const loading = ref(false);
const chatContainer = ref(null);

const DEFAULT_WELCOME_MESSAGE = {
    id: 'welcome',
    sender: 'bot',
    text: 'Xin chào! Mình là trợ lý thư viện CozySmart. Bạn cần hỗ trợ gì nè? 😊',
    timestamp: new Date(),
    books: [],
};

// Quản lý lịch sử tin nhắn trong phiên (không mất khi đóng/mở lại)
const messages = ref([DEFAULT_WELCOME_MESSAGE]);

function toggleChat() {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        scrollToBottom();
    }
}

function scrollToBottom() {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
}

async function handleSendMessage(customText = null) {
    const textToSend = typeof customText === 'string' ? customText : inputMessage.value;
    if (!textToSend || !textToSend.trim() || loading.value) return;

    const userText = textToSend.trim();
    inputMessage.value = '';

    const userMsgId = 'user_' + Date.now();
    messages.value.push({
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: new Date(),
        books: [],
    });

    scrollToBottom();
    loading.value = true;

    try {
        // Chuẩn bị lịch sử hội thoại trước đó gửi lên backend (loại bỏ câu chào mừng, lỗi và tin nhắn hiện tại)
        const history = messages.value
            .filter((m) => m.id !== 'welcome' && m.id !== userMsgId && !m.isError)
            .slice(-6)
            .map((m) => ({
                role: m.sender === 'user' ? 'user' : 'model',
                content: m.text,
            }));

        const res = await chatService.guiTinNhan({
            message: userText,
            history,
        });

        messages.value.push({
            id: 'bot_' + Date.now(),
            sender: 'bot',
            text: res.reply || 'Cảm ơn bạn! Nếu cần tìm thêm sách, cứ nhắn cho mình nhé.',
            timestamp: new Date(),
            books: Array.isArray(res.books) ? res.books : [],
        });
    } catch (err) {
        let errorMsg = 'Rất tiếc, CozySmart gặp sự cố kết nối trong giây lát. Bạn vui lòng thử lại sau nhé!';
        if (err.message && err.message.toLowerCase().includes('timeout')) {
            errorMsg = 'Hệ thống phản hồi hơi lâu do đường truyền mạng. Bạn vui lòng thử gửi lại nhé!';
        } else if (err.response?.data?.message) {
            errorMsg = err.response.data.message;
        }

        messages.value.push({
            id: 'bot_err_' + Date.now(),
            sender: 'bot',
            text: errorMsg,
            timestamp: new Date(),
            isError: true,
            books: [],
        });
    } finally {
        loading.value = false;
        scrollToBottom();
    }
}

function handleViewBook(book) {
    const bookId = book._id || book.sachId;
    if (bookId) {
        router.push(`/sach/${bookId}`);
    }
}

// Format văn bản đơn giản (in đậm **bold**, xuống dòng)
function formatMessageText(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.06); padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>')
        .replace(/\n/g, '<br />');
}

// Khi người dùng đăng xuất hoặc chuyển tài khoản -> làm mới cuộc hội thoại
watch(
    () => authStore.userId,
    () => {
        messages.value = [DEFAULT_WELCOME_MESSAGE];
    },
);
</script>

<template>
    <div class="cr-cozysmart-root">
        <!-- Floating Button -->
        <button
            type="button"
            class="cr-cozysmart-fab"
            :class="{ 'is-active': isOpen }"
            :title="isOpen ? 'Thu nhỏ CozySmart' : 'Trò chuyện cùng CozySmart'"
            aria-label="Trợ lý CozySmart"
            @click="toggleChat"
        >
            <i v-if="isOpen" class="pi pi-times" style="font-size: 1.35rem"></i>
            <img v-else :src="chatbotImg" alt="CozySmart" class="cr-fab-img" />
        </button>

        <!-- Chat Window Popover -->
        <div v-show="isOpen" class="cr-cozysmart-window">
            <!-- Header -->
            <div class="cr-cozysmart-header">
                <div class="cr-items-center cr-gap-sm">
                    <div class="cr-bot-avatar">
                        <img :src="chatbotImg" alt="CozySmart" class="cr-bot-avatar-img" />
                    </div>
                    <div>
                        <div class="cr-bot-title">CozySmart</div>
                        <div class="cr-bot-status">
                            <span class="cr-status-dot"></span>
                            <span>Trợ lý AI trực tuyến</span>
                        </div>
                    </div>
                </div>
                <div class="cr-items-center cr-gap-xs">
                    <Button
                        icon="pi pi-minus"
                        severity="secondary"
                        text
                        rounded
                        size="small"
                        title="Thu nhỏ"
                        @click="isOpen = false"
                    />
                </div>
            </div>

            <!-- Body: Message List -->
            <div ref="chatContainer" class="cr-cozysmart-body">
                <div
                    v-for="msg in messages"
                    :key="msg.id"
                    class="cr-message-row"
                    :class="msg.sender === 'user' ? 'is-user' : 'is-bot'"
                >
                    <div v-if="msg.sender === 'bot'" class="cr-msg-avatar">
                        <img :src="chatbotImg" alt="CozySmart" class="cr-msg-avatar-img" />
                    </div>

                    <div class="cr-msg-content">
                        <!-- Message Bubble -->
                        <div
                            class="cr-msg-bubble"
                            :class="{ 'is-error': msg.isError }"
                            v-html="formatMessageText(msg.text)"
                        ></div>

                        <!-- Mini Books Carousel / Cards -->
                        <div v-if="msg.books && msg.books.length > 0" class="cr-mini-books-list">
                            <div
                                v-for="book in msg.books"
                                :key="book._id || book.sachId"
                                class="cr-mini-book-card"
                                @click="handleViewBook(book)"
                            >
                                <img
                                    v-if="book.hinhAnh"
                                    :src="book.hinhAnh"
                                    :alt="book.tenSach"
                                    class="cr-mini-book-img"
                                    @error="$event.target.style.display = 'none'"
                                />
                                <div v-else class="cr-mini-book-placeholder">
                                    <i class="pi pi-book"></i>
                                </div>
                                <div class="cr-mini-book-info">
                                    <div class="cr-mini-book-title" :title="book.tenSach">
                                        {{ book.tenSach }}
                                    </div>
                                    <div class="cr-mini-book-author">
                                        {{ book.tacGia || book.trangThai || 'CozyReads' }}
                                    </div>
                                    <div class="cr-flex-between cr-items-center" style="margin-top: 4px;">
                                        <Tag
                                            v-if="book.soQuyen !== undefined"
                                            :value="book.soQuyen > 0 ? `Còn ${book.soQuyen}` : 'Tạm hết'"
                                            :severity="book.soQuyen > 0 ? 'success' : 'danger'"
                                            size="small"
                                        />
                                        <span class="cr-mini-book-btn">Xem chi tiết <i class="pi pi-arrow-right" style="font-size: 0.7rem"></i></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Typing Indicator -->
                <div v-if="loading" class="cr-message-row is-bot">
                    <div class="cr-msg-avatar">
                        <img :src="chatbotImg" alt="CozySmart" class="cr-msg-avatar-img" />
                    </div>
                    <div class="cr-msg-bubble cr-typing-bubble">
                        <span class="cr-typing-dot"></span>
                        <span class="cr-typing-dot"></span>
                        <span class="cr-typing-dot"></span>
                    </div>
                </div>
            </div>

            <!-- Footer: Input Box -->
            <div class="cr-cozysmart-footer">
                <form class="cr-chat-form" @submit.prevent="handleSendMessage()">
                    <InputText
                        v-model="inputMessage"
                        placeholder="Hỏi CozySmart"
                        class="cr-chat-input"
                        :disabled="loading"
                        autocomplete="off"
                    />
                    <Button
                        type="submit"
                        icon="pi pi-send"
                        severity="primary"
                        rounded
                        size="small"
                        :disabled="!inputMessage.trim() || loading"
                        title="Gửi tin nhắn"
                    />
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cr-cozysmart-root {
    position: relative;
    z-index: 9999;
}

/* Floating Action Button */
.cr-cozysmart-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--cr-primary, #2e7d32);
    color: #ffffff;
    border: none;
    cursor: pointer;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
    padding: 11px;
    overflow: hidden;
}

.cr-cozysmart-fab:hover {
    transform: scale(1.06);
    box-shadow: none;
}

.cr-cozysmart-fab.is-active {
    background: #424242;
    box-shadow: none;
    padding: 0;
}

.cr-fab-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

/* Chat Window */
.cr-cozysmart-window {
    position: fixed;
    bottom: 94px;
    right: 24px;
    width: 380px;
    max-width: calc(100vw - 32px);
    height: 570px;
    max-height: calc(100vh - 120px);
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--cr-border, #e0e0e0);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    animation: crSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes crSlideUp {
    from {
        opacity: 0;
        transform: translateY(18px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Header */
.cr-cozysmart-header {
    padding: 12px 16px;
    background: #f1f8e9;
    border-bottom: 1px solid #dcedc8;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.cr-bot-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--cr-primary, #2e7d32);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    padding: 7px;
}

.cr-bot-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.cr-bot-title {
    font-weight: 700;
    font-size: 1rem;
    color: var(--cr-primary, #2e7d32);
    line-height: 1.2;
}

.cr-bot-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    color: #616161;
}

.cr-status-dot {
    width: 7px;
    height: 7px;
    background: #4caf50;
    border-radius: 50%;
}

/* Body */
.cr-cozysmart-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #fafafa;
}

.cr-message-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
}

.cr-message-row.is-user {
    justify-content: flex-end;
}

.cr-msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--cr-primary, #2e7d32);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    padding: 5px;
}

.cr-msg-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.cr-msg-content {
    max-width: 82%;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.cr-msg-bubble {
    padding: 9px 13px;
    border-radius: 14px;
    font-size: 0.875rem;
    line-height: 1.45;
    word-break: break-word;
}

.is-user .cr-msg-bubble {
    background: var(--cr-primary, #2e7d32);
    color: #ffffff;
    border-bottom-right-radius: 4px;
}

.is-bot .cr-msg-bubble {
    background: #ffffff;
    color: #2c3e50;
    border: 1px solid #e0e0e0;
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.cr-msg-bubble.is-error {
    background: #ffebee;
    color: #c62828;
    border-color: #ffcdd2;
}

/* Mini Book Cards */
.cr-mini-books-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
}

.cr-mini-book-card {
    display: flex;
    gap: 10px;
    background: #ffffff;
    border: 1px solid #dcdcdc;
    border-radius: 10px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cr-mini-book-card:hover {
    border-color: var(--cr-primary, #2e7d32);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.cr-mini-book-img {
    width: 44px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
}

.cr-mini-book-placeholder {
    width: 44px;
    height: 60px;
    background: #e8f5e9;
    color: var(--cr-primary, #2e7d32);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
}

.cr-mini-book-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.cr-mini-book-title {
    font-weight: 700;
    font-size: 0.8125rem;
    color: #2c3e50;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cr-mini-book-author {
    font-size: 0.75rem;
    color: #666;
    margin-top: 2px;
}

.cr-mini-book-btn {
    font-size: 0.725rem;
    color: var(--cr-primary, #2e7d32);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 3px;
}

/* Typing Indicator */
.cr-typing-bubble {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
}

.cr-typing-dot {
    width: 6px;
    height: 6px;
    background: #9e9e9e;
    border-radius: 50%;
    animation: crTypingBounce 1.4s infinite ease-in-out both;
}

.cr-typing-dot:nth-child(1) { animation-delay: -0.32s; }
.cr-typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes crTypingBounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
}

/* Footer Input */
.cr-cozysmart-footer {
    padding: 10px 12px;
    background: #ffffff;
    border-top: 1px solid #e0e0e0;
}

.cr-chat-form {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cr-chat-input {
    flex: 1;
    font-size: 0.875rem;
    border-radius: 20px;
    padding: 8px 14px;
}

/* Mobile responsive */
@media (max-width: 600px) {
    .cr-cozysmart-window {
        bottom: 84px;
        right: 12px;
        left: 12px;
        width: auto;
        height: 75vh;
    }
}
</style>
