import api from './api';

export const thanhToanService = {
    getDanhSachThanhToan(params = {}) {
        return api.get('/kythanhtoans', { params });
    },
    getChiTietThanhToan(id) {
        return api.get(`/kythanhtoans/${id}`);
    },
    taoThanhToan(payload) {
        return api.post('/kythanhtoans', payload);
    },
    capNhatThanhToan(id, payload) {
        return api.put(`/kythanhtoans/${id}`, payload);
    },
    xacNhanThanhToan(id, payload = {}) {
        return api.post(`/kythanhtoans/${id}/xac-nhan`, payload);
    },
    huyThanhToan(id, payload = {}) {
        return api.post(`/kythanhtoans/${id}/huy`, payload);
    },
    xoaThanhToan(id) {
        return api.delete(`/kythanhtoans/${id}`);
    },
    getThanhToanCuaDocGia(docGiaId) {
        return api.get(`/kythanhtoans/doc-gia/${docGiaId}`);
    },
};

export default thanhToanService;
