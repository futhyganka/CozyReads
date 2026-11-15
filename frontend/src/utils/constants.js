export const ROLES = {
    KHACH: 'khach',
    DOCGIA: 'docGia',
    NHANVIEN: 'nhanVien',
    QUANTRIVIEN: 'quanTriVien',
};

export const LOAI_DOC_GIA = {
    DOCGIA_TUDO: 'docGia_tuDo',
    SINHVIEN: 'sinhVien',
    GIANGVIEN: 'giangVien',
    NHANVIEN: 'nhanVien',
};

export const LOAI_DOC_GIA_OPTIONS = [
    { label: 'Độc giả tự do', value: 'docGia_tuDo' },
    { label: 'Sinh viên', value: 'sinhVien' },
    { label: 'Giảng viên', value: 'giangVien' },
    { label: 'Nhân viên', value: 'nhanVien' },
];

export const TRANG_THAI_DOC_GIA = {
    HOAT_DONG: 'hoatDong',
    TAM_KHOA: 'tamKhoa',
    DA_HUY: 'daHuy',
};

export const TRANG_THAI_DOC_GIA_OPTIONS = [
    { label: 'Hoạt động', value: 'hoatDong', severity: 'success' },
    { label: 'Tạm khóa', value: 'tamKhoa', severity: 'warn' },
    { label: 'Đã hủy', value: 'daHuy', severity: 'danger' },
];

export const GOI_GIA_HAN_OPTIONS = [
    { label: 'Gói 1 tháng (30 ngày) - 20.000đ', value: '1_thang', gia: 20000, soNgay: 30 },
    { label: 'Gói 3 tháng (90 ngày) - 55.000đ', value: '3_thang', gia: 55000, soNgay: 90 },
    { label: 'Gói 6 tháng (180 ngày) - 100.000đ', value: '6_thang', gia: 100000, soNgay: 180 },
];

export const ALL_GOI_GIA_HAN_MAP = {
    '1_thang': { tenGoi: 'Gói 1 tháng (30 ngày)', gia: 20000, soNgay: 30 },
    '3_thang': { tenGoi: 'Gói 3 tháng (90 ngày)', gia: 55000, soNgay: 90 },
    '6_thang': { tenGoi: 'Gói 6 tháng (180 ngày)', gia: 100000, soNgay: 180 },
    '6_thang_mien_phi': { tenGoi: 'Gói 6 tháng miễn phí (SV, GV, NV)', gia: 0, soNgay: 180 },
};

export const CHUC_VU_NHAN_VIEN = {
    NHAN_VIEN: 'nhanVien',
    QUAN_LY: 'quanLy',
    ADMIN: 'admin',
    KHAC: 'khac',
};

export const CHUC_VU_OPTIONS = [
    { label: 'Nhân viên thư viện', value: 'nhanVien', severity: 'info' },
    { label: 'Quản lý', value: 'quanLy', severity: 'success' },
    { label: 'Quản trị viên (Admin)', value: 'admin', severity: 'warn' },
    { label: 'Khác', value: 'khac', severity: 'secondary' },
];

export const TRANG_THAI_MUON = {
    YEU_CAU_GIU_SACH: 'yeuCau_giuSach',
    DANG_MUON: 'dangMuon',
    DA_TRA: 'daTra',
    QUA_HAN: 'quaHan',
    DA_MAT: 'daMat',
    DA_BOI_THUONG: 'daBoiThuong',
    DA_HUY: 'daHuy',
};

export const TRANG_THAI_MUON_OPTIONS = [
    { label: 'Giữ sách trực tuyến (24h)', value: 'yeuCau_giuSach', severity: 'info' },
    { label: 'Đang mượn', value: 'dangMuon', severity: 'primary' },
    { label: 'Đã trả', value: 'daTra', severity: 'success' },
    { label: 'Quá hạn', value: 'quaHan', severity: 'danger' },
    { label: 'Báo mất / hỏng', value: 'daMat', severity: 'danger' },
    { label: 'Đã bồi thường', value: 'daBoiThuong', severity: 'secondary' },
    { label: 'Đã hủy', value: 'daHuy', severity: 'contrast' },
];

export const LOAI_THANH_TOAN = {
    PHI_PHAT_MAT_SACH: 'phiPhat_matSach',
    PHI_GIA_HAN: 'phi_giaHan',
};

export const LOAI_THANH_TOAN_OPTIONS = [
    { label: 'Phí gia hạn thẻ', value: 'phi_giaHan', severity: 'info' },
    { label: 'Bồi thường mất/hỏng sách', value: 'phiPhat_matSach', severity: 'warn' },
];

export const TRANG_THAI_THANH_TOAN = {
    CHO_XAC_NHAN: 'choXacNhan',
    DA_THANH_TOAN: 'daThanhToan',
    DA_HUY: 'daHuy',
};

export const TRANG_THAI_THANH_TOAN_OPTIONS = [
    { label: 'Chờ xác nhận', value: 'choXacNhan', severity: 'warn' },
    { label: 'Đã thanh toán', value: 'daThanhToan', severity: 'success' },
    { label: 'Đã hủy', value: 'daHuy', severity: 'danger' },
];

export const LOAI_PHAN_HOI = {
    LIEN_HE: 'lienHe',
    GOP_Y: 'gopY',
};

export const TRANG_THAI_PHAN_HOI = {
    CHO_XU_LY: 'choXuLy',
    DANG_XU_LY: 'dangXuLy',
    DA_XU_LY: 'daXuLy',
};

export const TRANG_THAI_PHAN_HOI_OPTIONS = [
    { label: 'Chờ xử lý', value: 'choXuLy', severity: 'warn' },
    { label: 'Đang xử lý', value: 'dangXuLy', severity: 'info' },
    { label: 'Đã xử lý', value: 'daXuLy', severity: 'success' },
];

export const PHUONG_THUC_THANH_TOAN_OPTIONS = [
    { label: 'Tiền mặt tại quầy', value: 'tienMat' },
    { label: 'Chuyển khoản ngân hàng', value: 'chuyenKhoan' },
    { label: 'Ví điện tử', value: 'viDienTu' },
];

export const PHAI_OPTIONS = [
    { label: 'Nam', value: 'nam' },
    { label: 'Nữ', value: 'nu' },
    { label: 'Khác', value: 'khac' },
];

export const THANG_DIEM_MUON_SACH = [
    { min: 0, max: 10, soSachToiDa: 0, label: '0 - 10 điểm: Không được mượn sách' },
    { min: 11, max: 40, soSachToiDa: 1, label: '11 - 40 điểm: Tối đa 1 cuốn' },
    { min: 41, max: 70, soSachToiDa: 2, label: '41 - 70 điểm: Tối đa 2 cuốn' },
    { min: 71, max: 100, soSachToiDa: 3, label: '71 - 100 điểm: Tối đa 3 cuốn' },
];

export const REGEX = {
    SO_DIEN_THOAI: /^0[35789]\d{8}$/,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    MAT_KHAU: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/,
};

export function validatePasswordStrength(password, label = 'Mật khẩu') {
    if (!password) {
        return `${label} không được để trống.`;
    }
    const missing = [];
    if (password.length < 8) missing.push('• Từ 8 ký tự trở lên');
    if (!/[a-z]/.test(password)) missing.push('• Có ít nhất 1 chữ thường (a-z)');
    if (!/[A-Z]/.test(password)) missing.push('• Có ít nhất 1 chữ hoa (A-Z)');
    if (!/\d/.test(password)) missing.push('• Có ít nhất 1 chữ số (0-9)');
    if (!/[^A-Za-z0-9\s]/.test(password)) missing.push('• Có ít nhất 1 ký tự đặc biệt (!@#$...)');
    if (/\s/.test(password)) missing.push("• Không được chứa khoảng trắng (' ')");

    if (missing.length > 0) {
        return `${label} chưa đáp ứng các ràng buộc:\n${missing.join('\n')}`;
    }
    return '';
}
