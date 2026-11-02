const { DocGia, TheoDoiMuonSach } = require('../models');
const {
    DIEM,
    THANG_DIEM_MUON_SACH,
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
} = require('../constants/business-rules');

class DiemService {
    /**
     * Xác định số sách tối đa được mượn dựa vào điểm độc giả
     * < 10: 0 cuốn
     * 10 - 39: 1 cuốn
     * 40 - 69: 2 cuốn
     * 70 - 100: 3 cuốn
     */
    static tinhSoSachToiDa(diemDocGia) {
        const diem = Math.max(
            0,
            Math.min(DIEM.TOI_DA, Number(diemDocGia) || 0),
        );
        for (const tier of THANG_DIEM_MUON_SACH) {
            if (diem >= tier.min && diem <= tier.max) {
                return tier.soSachToiDa;
            }
        }
        return 0;
    }

    /**
     * Hàm quét và cập nhật trạng thái mượn sách quá hạn:
     * Chuyển các lượt mượn có ngayHenTra < thoiDiemHienTai và đang ở trạng thái 'dangMuon' sang 'quaHan'.
     */
    static async kiemTraVaCapNhatTrangThaiMuonSach(
        thoiDiemHienTai = new Date(),
    ) {
        const now = new Date(thoiDiemHienTai);
        const danhSachCanCapNhat = await TheoDoiMuonSach.find({
            trangThai: TRANG_THAI_MUON.DANG_MUON,
            ngayHenTra: { $lt: now },
        });

        for (const item of danhSachCanCapNhat) {
            item.trangThai = TRANG_THAI_MUON.QUA_HAN;
            await item.save();
        }

        return danhSachCanCapNhat.length;
    }

    /**
     * Tự động quét và trừ điểm đối với các độc giả đang có sách quá hạn.
     * Quy tắc cập nhật theo ngày:
     * - Không cần lưu soNgayQuaHan trong DB.
     * - Hàm đếm số lượng sách có trangThai = 'quaHan' của độc giả đó.
     * - Cứ mỗi cuốn sách quá hạn thì độc giả bị trừ 1 điểm trong ngày đó (hoặc trừ theo số lượng sách quá hạn).
     */
    static async quetVaTruDiemQuaHan(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        // Lấy danh sách độc giả đang có sách quá hạn
        const dsDocGiaCoSachQuaHan = await TheoDoiMuonSach.distinct('docGia', {
            trangThai: TRANG_THAI_MUON.QUA_HAN,
        });

        const ketQua = [];

        for (const docGiaId of dsDocGiaCoSachQuaHan) {
            const docGia = await DocGia.findById(docGiaId);
            if (!docGia) continue;

            // Đếm số lượng sách đang bị quá hạn của độc giả này
            const soLuongSachQuaHan = await TheoDoiMuonSach.countDocuments({
                docGia: docGiaId,
                trangThai: TRANG_THAI_MUON.QUA_HAN,
            });

            if (soLuongSachQuaHan > 0) {
                const diemTru =
                    soLuongSachQuaHan * DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY;
                docGia.diemDocGia = Math.max(
                    DIEM.TOI_THIEU,
                    docGia.diemDocGia - diemTru,
                );
                // Reset mốc tính điểm thưởng vì đang vi phạm
                docGia.ngayCapNhatDiemKhongViPham = now;
                await docGia.save();

                // Kiểm tra nếu điểm giảm làm số sách đang mượn vượt giới hạn mới
                await this.kiemTraVaXuLyVuotHanMucMuon(docGia._id);

                ketQua.push({
                    docGiaId: docGia._id,
                    maDocGia: docGia.maDocGia,
                    soLuongSachQuaHan,
                    diemTru,
                    diemConLai: docGia.diemDocGia,
                });
            }
        }

        return ketQua;
    }

    /**
     * Tự động quét và cộng điểm sau mỗi 3 ngày không vi phạm
     * Quy tắc:
     * - Độc giả không có sách quá hạn (quaHan)
     * - Độc giả không có sách mất chưa đền (daMat)
     * - Trạng thái độc giả là hoạt động (hoatDong)
     * - Cứ mỗi 3 ngày không vi phạm kể từ ngayCapNhatDiemKhongViPham, cộng 1 điểm (tối đa 100).
     */
    static async quetVaCongDiemKhongViPham(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachDocGia = await DocGia.find({
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
            diemDocGia: { $lt: DIEM.TOI_DA },
        });

        const ketQua = [];

        for (const docGia of danhSachDocGia) {
            // Kiểm tra xem độc giả có vi phạm hay không
            const coViPham = await TheoDoiMuonSach.exists({
                docGia: docGia._id,
                trangThai: {
                    $in: [TRANG_THAI_MUON.QUA_HAN, TRANG_THAI_MUON.DA_MAT],
                },
            });

            if (coViPham) {
                docGia.ngayCapNhatDiemKhongViPham = now;
                await docGia.save();
                continue;
            }

            // Tính số ngày trôi qua kể từ lần cập nhật gần nhất
            const mocCu = docGia.ngayCapNhatDiemKhongViPham
                ? new Date(docGia.ngayCapNhatDiemKhongViPham)
                : new Date(docGia.createdAt || now);
            const diffTime = now.getTime() - mocCu.getTime();
            const soNgay = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (soNgay >= DIEM.SO_NGAY_TICH_DIEM) {
                const soChuKy = Math.floor(soNgay / DIEM.SO_NGAY_TICH_DIEM);
                const diemCong = soChuKy * DIEM.DIEM_CONG_MOI_CHU_KY;
                const diemMoi = Math.min(
                    DIEM.TOI_DA,
                    docGia.diemDocGia + diemCong,
                );

                const soMiligiayTien =
                    soChuKy * DIEM.SO_NGAY_TICH_DIEM * 24 * 60 * 60 * 1000;
                docGia.ngayCapNhatDiemKhongViPham = new Date(
                    mocCu.getTime() + soMiligiayTien,
                );
                docGia.diemDocGia = diemMoi;
                await docGia.save();

                ketQua.push({
                    docGiaId: docGia._id,
                    maDocGia: docGia.maDocGia,
                    diemCong,
                    diemMoi,
                });
            }
        }

        return ketQua;
    }

    /**
     * Kiểm tra khi điểm độc giả giảm xuống dưới số lượng sách đang mượn.
     */
    static async kiemTraVaXuLyVuotHanMucMuon(
        docGiaId,
        buocKhoaTheNgay = false,
    ) {
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) return null;

        const soSachToiDa = this.tinhSoSachToiDa(docGia.diemDocGia);

        const soSachDangGiu = await TheoDoiMuonSach.countDocuments({
            docGia: docGiaId,
            trangThai: {
                $in: [
                    TRANG_THAI_MUON.DANG_MUON,
                    TRANG_THAI_MUON.QUA_HAN,
                    TRANG_THAI_MUON.DA_MAT,
                ],
            },
        });

        if (soSachDangGiu > soSachToiDa) {
            if (buocKhoaTheNgay || docGia.diemDocGia < 10) {
                docGia.trangThai = TRANG_THAI_DOC_GIA.TAM_KHOA;
                await docGia.save();
            }
            return {
                vuotHanMuc: true,
                soSachDangGiu,
                soSachToiDa,
                trangThaiThe: docGia.trangThai,
                thongBao:
                    'Số sách đang mượn vượt quá hạn mức điểm. Cần trả bớt sách hoặc thẻ sẽ bị tạm khóa.',
            };
        }

        return {
            vuotHanMuc: false,
            soSachDangGiu,
            soSachToiDa,
            trangThaiThe: docGia.trangThai,
        };
    }
}

module.exports = DiemService;
