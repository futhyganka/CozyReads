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
     * Quét và cập nhật trạng thái mượn sách quá hạn ('dangMuon' -> 'quaHan')
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
     * Quét và trừ điểm đối với các độc giả đang có sách quá hạn (1 điểm / ngày / cuốn)
     * - Chỉ trừ điểm cho mỗi ngày quá hạn trôi qua kể từ mốc đã trừ trước đó, tránh trừ trùng lặp
     * - Cập nhật ngayCapNhatDiemKhongViPham = now
     */
    static async quetVaTruDiemQuaHan(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        const dsDocGiaCoSachQuaHan = await TheoDoiMuonSach.distinct('maDocGia', {
            trangThai: TRANG_THAI_MUON.QUA_HAN,
        });

        const ketQua = [];

        for (const docGiaId of dsDocGiaCoSachQuaHan) {
            const docGia = await DocGia.findById(docGiaId);
            if (!docGia) continue;

            const soLuongSachQuaHan = await TheoDoiMuonSach.countDocuments({
                maDocGia: docGiaId,
                trangThai: TRANG_THAI_MUON.QUA_HAN,
            });

            if (soLuongSachQuaHan > 0) {
                const diemTru =
                    soLuongSachQuaHan * DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY;
                docGia.diemDocGia = Math.max(
                    DIEM.TOI_THIEU,
                    Math.min(DIEM.TOI_DA, docGia.diemDocGia - diemTru),
                );
                docGia.ngayCapNhatDiemKhongViPham = now;
                await docGia.save();

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
     * Tự động quét và cộng điểm cho độc giả không vi phạm (+1 điểm sau mỗi 3 ngày)
     */
    static async quetVaCongDiemKhongViPham(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        const danhSachDocGia = await DocGia.find({
            trangThaiTaiKhoan: TRANG_THAI_DOC_GIA.HOAT_DONG,
            diemDocGia: { $lt: DIEM.TOI_DA },
        });

        const ketQua = [];

        for (const docGia of danhSachDocGia) {
            const coSachQuaHanHoacMat = await TheoDoiMuonSach.exists({
                maDocGia: docGia._id,
                trangThai: {
                    $in: [TRANG_THAI_MUON.QUA_HAN, TRANG_THAI_MUON.DA_MAT],
                },
            });

            if (coSachQuaHanHoacMat) {
                continue;
            }

            const mocTinhDiem = docGia.ngayCapNhatDiemKhongViPham
                ? new Date(docGia.ngayCapNhatDiemKhongViPham)
                : new Date(docGia.createdAt || now);

            const soNgayTroiQua = Math.floor(
                (now.getTime() - mocTinhDiem.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (soNgayTroiQua >= DIEM.SO_NGAY_TICH_DIEM) {
                const chuKy = Math.floor(
                    soNgayTroiQua / DIEM.SO_NGAY_TICH_DIEM,
                );
                const diemCong = chuKy * DIEM.DIEM_CONG_MOI_CHU_KY;
                const diemMoi = Math.min(
                    DIEM.TOI_DA,
                    docGia.diemDocGia + diemCong,
                );

                const ngayCapNhatMoi = new Date(
                    mocTinhDiem.getTime() +
                        chuKy *
                            DIEM.SO_NGAY_TICH_DIEM *
                            24 *
                            60 *
                            60 *
                            1000,
                );

                docGia.diemDocGia = diemMoi;
                docGia.ngayCapNhatDiemKhongViPham = ngayCapNhatMoi;
                await docGia.save();

                ketQua.push({
                    docGiaId: docGia._id,
                    maDocGia: docGia.maDocGia,
                    diemCong,
                    diemMoi: docGia.diemDocGia,
                });
            }
        }

        return ketQua;
    }

    /**
     * Kiểm tra khi điểm độc giả giảm xuống dưới số lượng sách đang mượn
     */
    static async kiemTraVaXuLyVuotHanMucMuon(docGiaId) {
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) return null;

        const soSachDangGiu = await TheoDoiMuonSach.countDocuments({
            maDocGia: docGiaId,
            trangThai: {
                $in: [
                    TRANG_THAI_MUON.DANG_MUON,
                    TRANG_THAI_MUON.QUA_HAN,
                    TRANG_THAI_MUON.DA_MAT,
                ],
            },
        });

        const hanMucHienTai = this.tinhSoSachToiDa(docGia.diemDocGia);

        if (soSachDangGiu > hanMucHienTai) {
            return {
                canhBao: true,
                docGiaId: docGia._id,
                soSachDangGiu,
                hanMucHienTai,
                thongBao: `Độc giả đang giữ ${soSachDangGiu} cuốn nhưng hạn mức hiện tại chỉ được ${hanMucHienTai} cuốn. Cần trả bớt sách hoặc thẻ sẽ bị tạm khóa.`,
            };
        }

        return {
            canhBao: false,
            soSachDangGiu,
            hanMucHienTai,
        };
    }
}

module.exports = DiemService;
