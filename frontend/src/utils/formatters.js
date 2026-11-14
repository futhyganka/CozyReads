import {
    LOAI_DOC_GIA_OPTIONS,
    TRANG_THAI_DOC_GIA_OPTIONS,
    CHUC_VU_OPTIONS,
    TRANG_THAI_MUON_OPTIONS,
    LOAI_THANH_TOAN_OPTIONS,
    TRANG_THAI_THANH_TOAN_OPTIONS,
    PHUONG_THUC_THANH_TOAN_OPTIONS,
    ALL_GOI_GIA_HAN_MAP,
    THANG_DIEM_MUON_SACH,
} from './constants';

export function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '0 ₫';
    return `${Number(value).toLocaleString('vi-VN')} ₫`;
}

export function formatDate(value, includeTime = false) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    if (includeTime) {
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function getLoaiDocGiaLabel(val) {
    return LOAI_DOC_GIA_OPTIONS.find((o) => o.value === val)?.label || val || '—';
}

export function getTrangThaiDocGiaMeta(val) {
    return (
        TRANG_THAI_DOC_GIA_OPTIONS.find((o) => o.value === val) || {
            label: val || 'Không rõ',
            severity: 'secondary',
        }
    );
}

export function getChucVuMeta(val) {
    return (
        CHUC_VU_OPTIONS.find((o) => o.value === val) || {
            label: val || 'Khác',
            severity: 'secondary',
        }
    );
}

export function getTrangThaiMuonMeta(val) {
    return (
        TRANG_THAI_MUON_OPTIONS.find((o) => o.value === val) || {
            label: val || 'Không rõ',
            severity: 'secondary',
        }
    );
}

export function getLoaiThanhToanMeta(val) {
    return (
        LOAI_THANH_TOAN_OPTIONS.find((o) => o.value === val) || {
            label: val || 'Khác',
            severity: 'secondary',
        }
    );
}

export function getTrangThaiThanhToanMeta(val) {
    return (
        TRANG_THAI_THANH_TOAN_OPTIONS.find((o) => o.value === val) || {
            label: val || 'Không rõ',
            severity: 'secondary',
        }
    );
}

export function getPhuongThucLabel(val) {
    return PHUONG_THUC_THANH_TOAN_OPTIONS.find((o) => o.value === val)?.label || val || '—';
}

export function getGoiGiaHanLabel(val) {
    return ALL_GOI_GIA_HAN_MAP[val]?.tenGoi || val || '—';
}

/**
 * Hiển thị hạn mức mượn sách theo điểm độc giả (chỉ hiển thị thông tin dựa trên quy tắc của Backend)
 */
export function getHanMucMuonTheoDiem(diemDocGia) {
    const diem = Math.max(0, Math.min(100, Number(diemDocGia) || 0));
    for (const tier of THANG_DIEM_MUON_SACH) {
        if (diem >= tier.min && diem <= tier.max) {
            return tier.soSachToiDa;
        }
    }
    return 0;
}
