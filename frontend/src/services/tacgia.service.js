import api from './api';

export const tacGiaService = {
    getDanhSachTacGia(params = {}) {
        return api.get('/tacgias', { params });
    },
    getChiTietTacGia(id) {
        return api.get(`/tacgias/${id}`);
    },
    themTacGia(payload) {
        return api.post('/tacgias', payload);
    },
    capNhatTacGia(id, payload) {
        return api.put(`/tacgias/${id}`, payload);
    },
    xoaTacGia(id) {
        return api.delete(`/tacgias/${id}`);
    },
};

export default tacGiaService;
