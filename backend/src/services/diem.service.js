const { DocGia, TheoDoiMuonSach, ThanhToan } = require('../models');
const {
    DIEM,
    THANG_DIEM_MUON_SACH,
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
    LOAI_THANH_TOAN,
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
     * Tự động quét và trừ điểm đối với các lượt mượn đã quá hạn.
     * Quy tắc:
     * - Mỗi ngày quá hạn trừ 1 điểm.
     * - Cập nhật trạng thái lượt mượn sang 'quaHan' nếu đã quá ngayHenTra.
     * - Tự động cập nhật số ngày quá hạn và đồng bộ trừ điểm độc giả tương ứng theo ngày.
     */
    static async quetVaTruDiemQuaHan(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        // Tìm các lượt mượn chưa trả và đã quá hạn
        const luotMuonQuaHan = await TheoDoiMuonSach.find({
            trangThai: {
                $in: [TRANG_THAI_MUON.DANG_MUON, TRANG_THAI_MUON.QUA_HAN],
            },
            ngayHenTra: { $lt: now },
        });

        const ketQua = [];

        for (const item of luotMuonQuaHan) {
            // Tính số ngày quá hạn (làm tròn lên)
            const diffTime =
                now.getTime() - new Date(item.ngayHenTra).getTime();
            const soNgayQuaHanMoi = Math.max(
                1,
                Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
            );

            const soNgayChenhLech = soNgayQuaHanMoi - (item.soNgayQuaHan || 0);

            if (soNgayChenhLech > 0) {
                item.soNgayQuaHan = soNgayQuaHanMoi;
                item.trangThai = TRANG_THAI_MUON.QUA_HAN;
                item.tienPhat = soNgayQuaHanMoi * 5000; // Phí phạt quá hạn 5.000đ/ngày
                await item.save();

                // Trừ điểm độc giả tương ứng với số ngày quá hạn mới phát sinh
                const docGia = await DocGia.findById(item.docGia);
                if (docGia) {
                    const diemTru =
                        soNgayChenhLech * DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY;
                    docGia.diemDocGia = Math.max(
                        DIEM.TOI_THIEU,
                        docGia.diemDocGia - diemTru,
                    );
                    // Reset mốc tính điểm thưởng vì đã vi phạm
                    docGia.ngayCapNhatDiemKhongViPham = now;
                    await docGia.save();

                    // Kiểm tra nếu điểm giảm làm số sách đang mượn vượt giới hạn mới
                    await this.kiemTraVaXuLyVuotHanMucMuon(docGia._id);

                    ketQua.push({
                        docGiaId: docGia._id,
                        maDocGia: docGia.maDocGia,
                        luotMuonId: item._id,
                        soNgayQuaHan: soNgayQuaHanMoi,
                        diemTru,
                        diemConLai: docGia.diemDocGia,
                    });
                }
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
                // Đang có vi phạm, dời mốc tính điểm thưởng sang hiện tại
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

                // Cập nhật lại mốc thời gian tịnh tiến theo số chu kỳ đã cộng
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
     * Quy tắc:
     * - Sách đang giữ bao gồm: dangMuon, quaHan, daMat (mất chưa đền).
     * - Nếu số lượng sách đang giữ > số sách tối đa theo điểm mới:
     *   Độc giả cần trả bớt sách để về đúng hạn mức.
     *   Nếu không trả / đã vi phạm nghiêm trọng thì tài khoản chuyển sang tạm khóa (tamKhoa).
     */
    static async kiemTraVaXuLyVuotHanMucMuon(
        docGiaId,
        buocKhoaTheNgay = false,
    ) {
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) return null;

        const soSachToiDa = this.tinhSoSachToiDa(docGia.diemDocGia);

        // Đếm số sách đang giữ (kể cả sách mất chưa đền)
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
