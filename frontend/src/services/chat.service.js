import api from './api';

export const chatService = {
    guiTinNhan(payload) {
        return api.post('/chat/message', payload, {
            timeout: 30000,
        });
    },
};

export default chatService;
