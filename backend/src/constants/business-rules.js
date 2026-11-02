/**
 * Quy định và hằng số nghiệp vụ thư viện CozyReads
 */

const BUSINESS_RULES = {
    // Điểm độc giả
    DIEM: {
        MAC_DINH: 100,
        TOI_DA: 100,
        TOI_THIEU: 0,
        SO_NGAY_TICH_DIEM: 3, // Mỗi 3 ngày không vi phạm được cộng 1 điểm
        DIEM_CONG_MOI_CHU_KY: 1,
        DIEM_TRU_QUA_HAN_MOI_NGAY: 1, // Quá hạn mỗi ngày trừ 1 điểm cho mỗi cuốn sách quá hạn
        HE_SO_TRU_MAT_SACH: 2, // Làm mất sách trừ gấp 2 lần điểm quá hạn theo ngày
    },

    // Giới hạn số lượng sách mượn theo thang điểm
    THANG_DIEM_MUON_SACH: [
        { min: 0, max: 9, soSachToiDa: 0 },
        { min: 10, max: 39, soSachToiDa: 1 },
        { min: 40, max: 69, soSachToiDa: 2 },
        { min: 70, max: 100, soSachToiDa: 3 },
    ],

    // Mượn sách
    MUON_SACH: {
        SO_SACH_TOI_DA_HE_THONG: 3,
        THOI_HAN_MUON_MAC_DINH_NGAY: 14, // 14 ngày
    },

    // Gói chu kỳ thanh toán & giá gia hạn cho độc giả tự do
    // 1 tháng = 30 ngày, 3 tháng = 90 ngày, 6 tháng = 180 ngày
    GOI_GIA_HAN: {
        '1_thang': {
            soNgay: 30,
            gia: 20000,
            tenGoi: 'Gói 1 tháng (30 ngày)',
        },
        '3_thang': {
            soNgay: 90,
            gia: 55000,
            tenGoi: 'Gói 3 tháng (90 ngày)',
        },
        '6_thang': {
            soNgay: 180,
            gia: 100000,
            tenGoi: 'Gói 6 tháng (180 ngày)',
        },
    },

    // Thời gian ân hạn nợ phí gia hạn độc giả tự do
    SO_NGAY_AN_HAN_GIA_HAN: 7, // Quá 7 ngày chưa thanh toán thì khóa thẻ

    // Enums
    LOAI_DOC_GIA: {
        DOCGIA_TUDO: 'docGia_tuDo',
        SINHVIEN: 'sinhVien',
        GIANGVIEN: 'giangVien',
        NHANVIEN: 'nhanVien',
    },

    TRANG_THAI_DOC_GIA: {
        HOAT_DONG: 'hoatDong',
        TAM_KHOA: 'tamKhoa',
        DA_HUY: 'daHuy',
    },

    TRANG_THAI_GIA_HAN: {
        GIA_HAN: 'giaHan',
        DA_HUY: 'daHuy',
    },

    CHUC_VU_NHAN_VIEN: {
        NHAN_VIEN: 'nhanVien',
        QUAN_LY: 'quanLy',
        ADMIN: 'admin',
        KHAC: 'khac',
    },

    TRANG_THAI_MUON: {
        DANG_MUON: 'dangMuon',
        DA_TRA: 'daTra',
        QUA_HAN: 'quaHan',
        DA_MAT: 'daMat',
        DA_BOI_THUONG: 'daBoiThuong',
    },

    // Quá hạn không phạt tiền, chỉ trừ điểm!
    LOAI_THANH_TOAN: {
        PHI_PHAT_MAT_SACH: 'phiPhat_matSach',
        PHI_GIA_HAN: 'phi_giaHan',
    },

    TRANG_THAI_THANH_TOAN: {
        CHO_XAC_NHAN: 'choXacNhan',
        DA_THANH_TOAN: 'daThanhToan',
        DA_HUY: 'daHuy',
    },

    PHUONG_THUC_THANH_TOAN: {
        TIEN_MAT: 'tienMat',
        CHUYEN_KHOAN: 'chuyenKhoan',
        VI_DIEN_TU: 'viDienTu',
    },
};

module.exports = BUSINESS_RULES;
