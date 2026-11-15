import api from './api';

export const phanHoiService = {
    guiLienHe(payload) {
        return api.post('/phanhois/lien-he', payload);
    },
    guiGopY(payload) {
        return api.post('/phanhois/gop-y', payload);
    },
    getDanhSachCuaToi(params = {}) {
        return api.get('/phanhois/cua-toi', { params });
    },
    getDanhSachPhanHoi(params = {}) {
        return api.get('/phanhois', { params });
    },
    getDanhSachLienHe(params = {}) {
        return api.get('/phanhois/lien-he', { params });
    },
    getDanhSachGopY(params = {}) {
        return api.get('/phanhois/gop-y', { params });
    },
    getChiTietPhanHoi(id, params = {}) {
        return api.get(`/phanhois/${id}`, { params });
    },
    capNhatTrangThai(id, payload) {
        return api.patch(`/phanhois/${id}/trang-thai`, payload);
    },
    guiPhanHoiLienHe(id, payload) {
        return api.post(`/phanhois/${id}/phan-hoi`, payload);
    },
};

export default phanHoiService;
