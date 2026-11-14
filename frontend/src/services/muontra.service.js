import api from './api';

export const muonTraService = {
    getDanhSachPhieuMuon(params = {}) {
        return api.get('/theodoimuonsachs', { params });
    },
    getChiTietPhieuMuon(id) {
        return api.get(`/theodoimuonsachs/${id}`);
    },
    kiemTraDieuKien(payload) {
        return api.post('/theodoimuonsachs/kiem-tra', payload);
    },
    taoPhieuMuon(payload) {
        return api.post('/theodoimuonsachs', payload);
    },
    xacNhanMuonTaiQuay(id, payload = {}) {
        return api.post(`/theodoimuonsachs/${id}/xac-nhan-quay`, payload);
    },
    getLichSuMuon(docGiaId) {
        return api.get(`/theodoimuonsachs/lich-su/${docGiaId}`);
    },
    capNhatPhieuMuon(id, payload) {
        return api.put(`/theodoimuonsachs/${id}`, payload);
    },
    traSach(id, payload = {}) {
        return api.post(`/theodoimuonsachs/${id}/tra-sach`, payload);
    },
    baoMatSach(id, payload = {}) {
        return api.post(`/theodoimuonsachs/${id}/bao-mat`, payload);
    },
    xoaPhieuMuon(id) {
        return api.delete(`/theodoimuonsachs/${id}`);
    },
};

export default muonTraService;
