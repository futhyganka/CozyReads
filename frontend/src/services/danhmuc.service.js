import api from './api';

export const danhMucService = {
    getDanhSachDanhMuc(params = {}) {
        return api.get('/danhmucs', { params });
    },
    getChiTietDanhMuc(id) {
        return api.get(`/danhmucs/${id}`);
    },
    themDanhMuc(payload) {
        return api.post('/danhmucs', payload);
    },
    capNhatDanhMuc(id, payload) {
        return api.put(`/danhmucs/${id}`, payload);
    },
    xoaDanhMuc(id) {
        return api.delete(`/danhmucs/${id}`);
    },
};

export default danhMucService;
