const { DocGia, TheoDoiMuonSach, ThanhToan } = require('../models');
const ApiError = require('../api-error');
const {
    GOI_GIA_HAN,
    LOAI_DOC_GIA,
    TRANG_THAI_DOC_GIA,
    TRANG_THAI_GIA_HAN,
    SO_NGAY_AN_HAN_GIA_HAN,
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
} = require('../constants/business-rules');

class DocGiaService {
    /**
     * Tạo yêu cầu gia hạn thẻ độc giả tự do
     */
    static async taoYeuCauGiaHanThe({ docGiaId, goiGiaHan, phuongThuc }) {
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy hồ sơ độc giả.');
        }

        if (docGia.loaiDocGia !== LOAI_DOC_GIA.DOCGIA_TUDO) {
            throw new ApiError(
                400,
                'Chỉ áp dụng gia hạn chu kỳ đóng phí cho độc giả tự do.',
            );
        }

        if (docGia.trangThai === TRANG_THAI_DOC_GIA.DA_HUY) {
            throw new ApiError(
                403,
                'Thẻ đã bị hủy, không thể gia hạn. Vui lòng đăng ký thẻ mới.',
            );
        }

        const thongTinGoi = GOI_GIA_HAN[goiGiaHan];
        if (!thongTinGoi) {
            throw new ApiError(
                400,
                'Gói gia hạn không hợp lệ. Chọn 1_thang, 3_thang hoặc 6_thang.',
            );
        }

        const maThanhToan = `GIAHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const thanhToan = new ThanhToan({
            maThanhToan,
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            soTien: thongTinGoi.gia,
            docGia: docGiaId,
            theoDoiMuonSach: null,
            goiGiaHan,
            phuongThuc: phuongThuc || 'tienMat',
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu: `Gia hạn thẻ: ${thongTinGoi.tenGoi}`,
        });

        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Tự động quét và xử lý khóa thẻ độc giả tự do nợ phí quá hạn
     */
    static async quetVaKhoaTheDocGiaTuDo(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachDocGia = await DocGia.find({
            loaiDocGia: LOAI_DOC_GIA.DOCGIA_TUDO,
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
            ngayHetHanThe: { $exists: true, $ne: null },
        });

        const ketQua = [];

        for (const docGia of danhSachDocGia) {
            const ngayHetHan = new Date(docGia.ngayHetHanThe);
            const mocKhoaThe = new Date(
                ngayHetHan.getTime() +
                    SO_NGAY_AN_HAN_GIA_HAN * 24 * 60 * 60 * 1000,
            );

            if (now > mocKhoaThe) {
                docGia.trangThai = TRANG_THAI_DOC_GIA.TAM_KHOA;
                await docGia.save();

                ketQua.push({
                    docGiaId: docGia._id,
                    maDocGia: docGia.maDocGia,
                    ngayHetHanThe: docGia.ngayHetHanThe,
                    lyDo: 'Quá hạn thanh toán chu kỳ phí thẻ hơn 7 ngày.',
                });
            }
        }

        return ketQua;
    }

    /**
     * Tự động quét và hủy thẻ sinh viên tốt nghiệp
     */
    static async quetVaHuyTheSinhVienTotNghiep(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const sinhVienHetHan = await DocGia.find({
            loaiDocGia: LOAI_DOC_GIA.SINHVIEN,
            daTotNghiep: true,
            trangThai: { $ne: TRANG_THAI_DOC_GIA.DA_HUY },
            ngayHetHanThe: { $lt: now },
        });

        const ketQua = [];

        for (const sv of sinhVienHetHan) {
            sv.trangThai = TRANG_THAI_DOC_GIA.DA_HUY;
            sv.trangThaiGiaHan = TRANG_THAI_GIA_HAN.DA_HUY;
            await sv.save();

            ketQua.push({
                docGiaId: sv._id,
                maDocGia: sv.maDocGia,
                lyDo: 'Sinh viên đã tốt nghiệp và hết hạn thẻ.',
            });
        }

        return ketQua;
    }
}

module.exports = DocGiaService;
