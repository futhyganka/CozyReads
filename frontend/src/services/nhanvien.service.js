import api from './api';

export const nhanVienService = {
    getDanhSachNhanVien(params = {}) {
        return api.get('/nhanviens', { params });
    },
    getChiTietNhanVien(id) {
        return api.get(`/nhanviens/${id}`);
    },
    taoNhanVien(payload) {
        return api.post('/nhanviens', payload);
    },
    capNhatNhanVien(id, payload) {
        return api.put(`/nhanviens/${id}`, payload);
    },
    xoaNhanVien(id) {
        return api.delete(`/nhanviens/${id}`);
    },
    doiMatKhau(id, payload) {
        return api.post(`/nhanviens/${id}/doi-mat-khau`, payload);
    },
};

export default nhanVienService;
