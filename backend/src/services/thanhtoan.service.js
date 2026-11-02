const { ThanhToan, TheoDoiMuonSach, DocGia, NhanVien } = require('../models');
const ApiError = require('../api-error');
const {
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
    GOI_GIA_HAN,
} = require('../constants/business-rules');

class ThanhToanService {
    /**
     * Xác nhận thanh toán hợp lệ bởi nhân viên
     */
    static async xacNhanThanhToan({
        maThanhToan,
        msnvId,
        ngayThanhToan = new Date(),
    }) {
        const nhanVien = await NhanVien.findById(msnvId);
        if (!nhanVien) {
            throw new ApiError(
                404,
                'Không tìm thấy nhân viên xác nhận giao dịch.',
            );
        }

        const thanhToan = await ThanhToan.findOne({ maThanhToan });
        if (!thanhToan) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_THANH_TOAN) {
            throw new ApiError(
                400,
                'Giao dịch thanh toán này đã được xác nhận trước đó.',
            );
        }

        const thoiDiemXacNhan = new Date(ngayThanhToan);
        thanhToan.msnv = msnvId;
        thanhToan.ngayThanhToan = thoiDiemXacNhan;
        thanhToan.trangThai = TRANG_THAI_THANH_TOAN.DA_THANH_TOAN;
        await thanhToan.save();

        // 1. Phí phạt mất sách -> Hoàn tất nghĩa vụ bồi thường
        if (
            thanhToan.loai === LOAI_THANH_TOAN.PHI_PHAT_MAT_SACH &&
            thanhToan.theoDoiMuonSach
        ) {
            const phieuMuon = await TheoDoiMuonSach.findById(
                thanhToan.theoDoiMuonSach,
            );
            if (phieuMuon) {
                phieuMuon.trangThai = TRANG_THAI_MUON.DA_BOI_THUONG;
                phieuMuon.ghiChu += ` | Đã hoàn tất bồi thường qua mã GD ${thanhToan.maThanhToan}`;
                await phieuMuon.save();
            }
        }

        // 2. Phí gia hạn thẻ cho độc giả tự do
        if (thanhToan.loai === LOAI_THANH_TOAN.PHI_GIA_HAN) {
            const docGia = await DocGia.findById(thanhToan.docGia);
            if (
                docGia &&
                thanhToan.goiGiaHan &&
                GOI_GIA_HAN[thanhToan.goiGiaHan]
            ) {
                const soNgayThem = GOI_GIA_HAN[thanhToan.goiGiaHan].soNgay; // 30, 90, hoặc 180 ngày
                const mocBatDau =
                    docGia.ngayHetHanThe &&
                    new Date(docGia.ngayHetHanThe) > thoiDiemXacNhan
                        ? new Date(docGia.ngayHetHanThe)
                        : thoiDiemXacNhan;

                docGia.ngayHetHanThe = new Date(
                    mocBatDau.getTime() + soNgayThem * 24 * 60 * 60 * 1000,
                );
                docGia.chuKyThanhToan = thanhToan.goiGiaHan;
                docGia.ngayBatDauKyThanhToan = thoiDiemXacNhan;

                if (docGia.trangThai === TRANG_THAI_DOC_GIA.TAM_KHOA) {
                    docGia.trangThai = TRANG_THAI_DOC_GIA.HOAT_DONG;
                }

                await docGia.save();
            }
        }

        return thanhToan;
    }
}

module.exports = ThanhToanService;
