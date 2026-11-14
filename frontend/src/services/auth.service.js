import api from './api';

export const authService = {
    guiOtpDangKy(email) {
        return api.post('/auth/gui-otp-dang-ky', { email });
    },
    xacThucOtp(email, otp) {
        return api.post('/auth/xac-thuc-otp', { email, otp });
    },
    dangKyDocGia(payload) {
        return api.post('/auth/dang-ky-doc-gia', payload);
    },
    dangNhapDocGia(payload) {
        return api.post('/auth/dang-nhap-doc-gia', payload);
    },
    dangNhapNhanVien(payload) {
        return api.post('/auth/dang-nhap-nhan-vien', payload);
    },
    guiOtpQuenMatKhau(email) {
        return api.post('/auth/gui-otp-quen-mat-khau', { email });
    },
    datLaiMatKhau(payload) {
        return api.post('/auth/dat-lai-mat-khau', payload);
    },
};

export default authService;
