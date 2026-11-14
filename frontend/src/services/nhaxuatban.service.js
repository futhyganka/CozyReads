import api from './api';

export const nhaXuatBanService = {
    getDanhSachNhaXuatBan(params = {}) {
        return api.get('/nhaxuatbans', { params });
    },
    getChiTietNhaXuatBan(id) {
        return api.get(`/nhaxuatbans/${id}`);
    },
    themNhaXuatBan(payload) {
        return api.post('/nhaxuatbans', payload);
    },
    capNhatNhaXuatBan(id, payload) {
        return api.put(`/nhaxuatbans/${id}`, payload);
    },
    xoaNhaXuatBan(id) {
        return api.delete(`/nhaxuatbans/${id}`);
    },
};

export default nhaXuatBanService;
