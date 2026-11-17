import api from './api';

export const sachService = {
    getDanhSachSach(params = {}) {
        return api.get('/sachs', { params });
    },
    getGoiYSach(params = {}) {
        return api.get('/sachs/goi-y', { params });
    },
    getChiTietSach(id) {
        return api.get(`/sachs/${id}`);
    },
    themSach(payload) {
        return api.post('/sachs', payload);
    },
    capNhatSach(id, payload) {
        return api.put(`/sachs/${id}`, payload);
    },
    xoaSach(id) {
        return api.delete(`/sachs/${id}`);
    },
};

export default sachService;
