import api from './api';

export const docGiaService = {
    getDanhSachDocGia(params = {}) {
        return api.get('/docgias', { params });
    },
    getChiTietDocGia(id) {
        return api.get(`/docgias/${id}`);
    },
    taoDocGia(payload) {
        return api.post('/docgias', payload);
    },
    guiOtpDoiEmail(id, emailMoi) {
        return api.post(`/docgias/${id}/gui-otp-doi-email`, { emailMoi });
    },
    capNhatDocGia(id, payload) {
        return api.put(`/docgias/${id}`, payload);
    },
    xoaDocGia(id) {
        return api.delete(`/docgias/${id}`);
    },
    doiMatKhau(id, payload) {
        return api.post(`/docgias/${id}/doi-mat-khau`, payload);
    },
    capNhatTrangThaiThe(id, trangThai) {
        return api.patch(`/docgias/${id}/trang-thai`, { trangThai });
    },
    capNhatDiem(id, diem) {
        return api.patch(`/docgias/${id}/diem`, { diem });
    },
    taoKhoanThanhToanGiaHan(id, payload) {
        return api.post(`/docgias/${id}/gia-han`, payload);
    },
};

export default docGiaService;
