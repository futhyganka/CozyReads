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
     * Tạo khoản thanh toán gia hạn thẻ cho độc giả tự do
     */
    static async taoKhoanThanhToanGiaHan({ docGiaId, goiGiaHan, phuongThuc }) {
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

        if (goiGiaHan) {
            docGia.chuKyThanhToan = goiGiaHan;
        }
        const selectedGoi = docGia.chuKyThanhToan || '1_thang';
        const thongTinGoi = GOI_GIA_HAN[selectedGoi];
        if (!thongTinGoi) {
            throw new ApiError(
                400,
                'Gói gia hạn không hợp lệ. Chọn 1_thang, 3_thang hoặc 6_thang.',
            );
        }

        // Kiểm tra nếu đã có khoản thanh toán gia hạn đang chờ xác nhận thì trả về khoản đó, tránh tạo trùng lặp
        const thanhToanDangCho = await ThanhToan.findOne({
            docGia: docGiaId,
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
        });
        if (thanhToanDangCho) {
            return thanhToanDangCho;
        }

        const maThanhToan = `GIAHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const thanhToan = new ThanhToan({
            maThanhToan,
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            soTien: thongTinGoi.gia,
            docGia: docGiaId,
            theoDoiMuonSach: null,
            goiGiaHan: selectedGoi,
            phuongThuc: phuongThuc || 'tienMat',
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu: `Gia hạn thẻ: ${thongTinGoi.tenGoi}`,
        });

        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Tự động quét và xử lý gia hạn thẻ định kỳ:
     * 1. Độc giả tự do: Nếu quá hạn (ngayHetHanThe <= now), trangThaiGiaHan = 'giaHan',
     *    và chưa có thanh toán gia hạn nào đang chờ thì tự động tạo ThanhToan yêu cầu thanh toán.
     * 2. Độc giả khác (Sinh viên, Giảng viên, Nhân viên): Nếu đến/quá hạn (ngayHetHanThe <= now)
     *    và trangThaiGiaHan = 'giaHan', tự động cộng thêm chu kỳ 6 tháng miễn phí mà không tạo thanh toán.
     */
    static async quetVaXuLyGiaHanThe(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachDenHan = await DocGia.find({
            trangThai: { $ne: TRANG_THAI_DOC_GIA.DA_HUY },
            trangThaiGiaHan: TRANG_THAI_GIA_HAN.GIA_HAN,
            ngayHetHanThe: { $lte: now },
        });

        const ketQua = [];

        for (const docGia of danhSachDenHan) {
            // Nhóm 1: Độc giả tự do -> Yêu cầu thanh toán
            if (docGia.loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO) {
                const daCoThanhToanCho = await ThanhToan.exists({
                    docGia: docGia._id,
                    loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
                    trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
                });

                if (!daCoThanhToanCho) {
                    const goiMacDinh = docGia.chuKyThanhToan || '1_thang';
                    const thongTinGoi =
                        GOI_GIA_HAN[goiMacDinh] || GOI_GIA_HAN['1_thang'];

                    const maThanhToan = `AUTOGIAHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const thanhToanMoi = new ThanhToan({
                        maThanhToan,
                        loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
                        soTien: thongTinGoi.gia,
                        docGia: docGia._id,
                        theoDoiMuonSach: null,
                        goiGiaHan: goiMacDinh,
                        phuongThuc: 'tienMat',
                        trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
                        ghiChu: `Hệ thống tự động tạo khoản gia hạn: ${thongTinGoi.tenGoi}`,
                    });
                    await thanhToanMoi.save();

                    ketQua.push({
                        docGiaId: docGia._id,
                        maDocGia: docGia.maDocGia,
                        loaiDocGia: docGia.loaiDocGia,
                        maThanhToan,
                        soTien: thongTinGoi.gia,
                        loaiXuLy: 'tao_yeu_cau_thanh_toan',
                    });
                }
            } else {
                // Nhóm 2: Độc giả khác (Sinh viên, Giảng viên, Nhân viên) -> Tự động gia hạn 6 tháng miễn phí
                // Riêng sinh viên nếu đã tốt nghiệp thì không gia hạn
                if (docGia.loaiDocGia === LOAI_DOC_GIA.SINHVIEN && docGia.daTotNghiep) {
                    continue;
                }

                const goiMienPhi = GOI_GIA_HAN['6_thang_mien_phi'] || GOI_GIA_HAN['6_thang'];
                const soNgay = goiMienPhi ? goiMienPhi.soNgay : 180;

                // Mốc tính gia hạn: từ ngày hết hạn cũ hoặc thời điểm hiện tại
                const mocCu = docGia.ngayHetHanThe ? new Date(docGia.ngayHetHanThe) : now;
                const mocBatDau = mocCu > now ? mocCu : now;
                docGia.ngayHetHanThe = new Date(
                    mocBatDau.getTime() + soNgay * 24 * 60 * 60 * 1000,
                );
                docGia.chuKyThanhToan = '6_thang_mien_phi';
                docGia.ngayBatDauKyThanhToan = mocBatDau;

                if (docGia.trangThai === TRANG_THAI_DOC_GIA.TAM_KHOA) {
                    docGia.trangThai = TRANG_THAI_DOC_GIA.HOAT_DONG;
                }

                await docGia.save();

                ketQua.push({
                    docGiaId: docGia._id,
                    maDocGia: docGia.maDocGia,
                    loaiDocGia: docGia.loaiDocGia,
                    ngayHetHanTheMoi: docGia.ngayHetHanThe,
                    loaiXuLy: 'tu_dong_gia_han_mien_phi_6_thang',
                });
            }
        }

        return ketQua;
    }

    /**
     * Tự động quét và khóa thẻ độc giả tự do nợ phí quá hạn:
     * Quy tắc chuẩn:
     * 1. Tìm các khoản thanh toán có loai = 'phi_giaHan' và trangThai = 'choXacNhan'.
     * 2. Kiểm tra độc giả tự do tương ứng, nếu ngayHetHanThe quá hạn hơn 7 ngày so với thời điểm hiện tại.
     * 3. Nếu thẻ đang 'hoatDong' -> chuyển sang 'tamKhoa'.
     */
    static async quetVaKhoaTheDocGiaTuDo(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        const danhSachThanhToanNo = await ThanhToan.find({
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
        }).populate('docGia');

        const ketQua = [];
        const daXuLyDocGiaIds = new Set();

        for (const tt of danhSachThanhToanNo) {
            const docGia = tt.docGia;
            if (!docGia || daXuLyDocGiaIds.has(docGia._id.toString())) {
                continue;
            }

            if (
                docGia.loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO &&
                docGia.trangThai === TRANG_THAI_DOC_GIA.HOAT_DONG &&
                docGia.ngayHetHanThe
            ) {
                const ngayHetHan = new Date(docGia.ngayHetHanThe);
                const mocKhoaThe = new Date(
                    ngayHetHan.getTime() +
                        SO_NGAY_AN_HAN_GIA_HAN * 24 * 60 * 60 * 1000,
                );

                if (now > mocKhoaThe) {
                    docGia.trangThai = TRANG_THAI_DOC_GIA.TAM_KHOA;
                    await docGia.save();

                    daXuLyDocGiaIds.add(docGia._id.toString());
                    ketQua.push({
                        docGiaId: docGia._id,
                        maDocGia: docGia.maDocGia,
                        ngayHetHanThe: docGia.ngayHetHanThe,
                        maThanhToanNo: tt.maThanhToan,
                        lyDo: 'Chưa thanh toán khoản gia hạn và đã quá hạn thẻ hơn 7 ngày.',
                    });
                }
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
