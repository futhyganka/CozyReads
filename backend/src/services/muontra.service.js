const {
    Sach,
    DocGia,
    TheoDoiMuonSach,
    NhanVien,
    ThanhToan,
} = require('../models');
const ApiError = require('../api-error');
const DiemService = require('./diem.service');
const {
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
    DIEM,
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
} = require('../constants/business-rules');

class MuonTraService {
    /**
     * Kiểm tra toàn bộ điều kiện mượn sách của độc giả
     */
    static async kiemTraDieuKienMuon(docGiaId, sachId) {
        // 1. Kiểm tra độc giả có tồn tại không
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy hồ sơ độc giả.');
        }

        // 2. Thẻ độc giả đang bị khóa hoặc hủy
        if (docGia.trangThai === TRANG_THAI_DOC_GIA.TAM_KHOA) {
            throw new ApiError(
                403,
                'Thẻ độc giả đang bị tạm khóa. Yêu cầu trả toàn bộ sách và thanh toán hết tiền phạt trước khi sử dụng lại.',
            );
        }
        if (docGia.trangThai === TRANG_THAI_DOC_GIA.DA_HUY) {
            throw new ApiError(403, 'Thẻ độc giả đã bị hủy.');
        }

        // 3. Kiểm tra có sách quá hạn chưa trả không
        const coSachQuaHan = await TheoDoiMuonSach.exists({
            docGia: docGiaId,
            trangThai: TRANG_THAI_MUON.QUA_HAN,
        });
        if (coSachQuaHan) {
            throw new ApiError(
                400,
                'Độc giả có sách quá hạn chưa trả. Không được phép mượn thêm.',
            );
        }

        // 4. Kiểm tra có sách làm mất chưa hoàn thành nghĩa vụ bồi thường không
        const coSachMatChuaDen = await TheoDoiMuonSach.exists({
            docGia: docGiaId,
            trangThai: TRANG_THAI_MUON.DA_MAT,
        });
        if (coSachMatChuaDen) {
            throw new ApiError(
                400,
                'Độc giả có sách bị mất chưa hoàn thành bồi thường. Phải bồi thường trước khi được mượn tiếp.',
            );
        }

        // 5. Kiểm tra số lượng sách đang mượn và hạn mức theo điểm độc giả
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

        const soSachToiDa = DiemService.tinhSoSachToiDa(docGia.diemDocGia);

        if (soSachToiDa === 0) {
            throw new ApiError(
                400,
                `Điểm độc giả hiện tại (${docGia.diemDocGia}đ) dưới 10 điểm. Không được phép mượn sách.`,
            );
        }

        if (soSachDangGiu >= soSachToiDa) {
            throw new ApiError(
                400,
                `Độc giả đã mượn tối đa ${soSachToiDa} cuốn theo hạn mức điểm (${docGia.diemDocGia}đ). Không thể mượn thêm.`,
            );
        }

        // 6. Kiểm tra không được mượn trùng đầu sách khi đang giữ
        const daMuonSachNay = await TheoDoiMuonSach.exists({
            docGia: docGiaId,
            sach: sachId,
            trangThai: {
                $in: [
                    TRANG_THAI_MUON.DANG_MUON,
                    TRANG_THAI_MUON.QUA_HAN,
                    TRANG_THAI_MUON.DA_MAT,
                ],
            },
        });
        if (daMuonSachNay) {
            throw new ApiError(
                400,
                'Độc giả đang giữ hoặc chưa hoàn tất đền bù cuốn sách này. Không thể mượn 2 cuốn trùng nhau.',
            );
        }

        // 7. Kiểm tra sách còn khả dụng trong kho không
        const sach = await Sach.findById(sachId);
        if (!sach) {
            throw new ApiError(404, 'Không tìm thấy sách yêu cầu.');
        }

        if (sach.soQuyen <= 0) {
            throw new ApiError(
                400,
                'Sách hiện đã hết trong kho (số lượng khả dụng = 0).',
            );
        }

        return {
            docGia,
            sach,
            soSachDangGiu,
            soSachToiDa,
        };
    }

    /**
     * Tạo phiếu mượn sách
     */
    static async taoPhieuMuon({
        docGiaId,
        sachId,
        msnvMuonId,
        ngayMuon = new Date(),
        soNgayMuon = 14,
    }) {
        const { docGia, sach } = await this.kiemTraDieuKienMuon(
            docGiaId,
            sachId,
        );

        const nhanVien = await NhanVien.findById(msnvMuonId);
        if (!nhanVien) {
            throw new ApiError(
                404,
                'Không tìm thấy nhân viên thực hiện mượn sách.',
            );
        }

        const ngayBatDauMuon = new Date(ngayMuon);
        const ngayHenTra = new Date(
            ngayBatDauMuon.getTime() + soNgayMuon * 24 * 60 * 60 * 1000,
        );

        sach.soQuyen -= 1;
        await sach.save();

        const phieuMuon = new TheoDoiMuonSach({
            docGia: docGiaId,
            sach: sachId,
            ngayMuon: ngayBatDauMuon,
            ngayHenTra,
            msnvMuon: msnvMuonId,
            trangThai: TRANG_THAI_MUON.DANG_MUON,
        });

        await phieuMuon.save();
        return phieuMuon;
    }

    /**
     * Tiếp nhận trả sách
     * Nghiệp vụ: Quá hạn không phạt tiền, chỉ trừ điểm tự động theo ngày!
     */
    static async traSach({ luotMuonId, msnvTraId, ngayTra = new Date() }) {
        const phieuMuon =
            await TheoDoiMuonSach.findById(luotMuonId).populate('sach');
        if (!phieuMuon) {
            throw new ApiError(404, 'Không tìm thấy lượt mượn sách.');
        }

        if (phieuMuon.trangThai === TRANG_THAI_MUON.DA_TRA) {
            throw new ApiError(400, 'Lượt mượn này đã được trả trước đó.');
        }

        if (phieuMuon.trangThai === TRANG_THAI_MUON.DA_BOI_THUONG) {
            throw new ApiError(
                400,
                'Lượt mượn này đã được bồi thường mất sách.',
            );
        }

        // Ràng buộc: Ngày trả thực tế phải sau ngày mượn
        const thoiDiemTra = new Date(ngayTra);
        if (thoiDiemTra <= new Date(phieuMuon.ngayMuon)) {
            throw new ApiError(400, 'Ngày trả thực tế phải sau ngày mượn.');
        }

        const nhanVien = await NhanVien.findById(msnvTraId);
        if (!nhanVien) {
            throw new ApiError(
                404,
                'Không tìm thấy nhân viên tiếp nhận trả sách.',
            );
        }

        // Hoàn lại tồn kho
        const sach = await Sach.findById(phieuMuon.sach._id || phieuMuon.sach);
        if (sach) {
            sach.soQuyen += 1;
            await sach.save();
        }

        phieuMuon.ngayTra = thoiDiemTra;
        phieuMuon.msnvTra = msnvTraId;
        phieuMuon.trangThai = TRANG_THAI_MUON.DA_TRA;
        await phieuMuon.save();

        // Kiểm tra lại hạn mức của độc giả
        await DiemService.kiemTraVaXuLyVuotHanMucMuon(phieuMuon.docGia);

        return {
            phieuMuon,
            khoanPhat: null, // Không phạt tiền quá hạn
        };
    }

    /**
     * Báo làm mất sách
     * Nghiệp vụ:
     * - Chuyển sang 'daMat', tính vào số sách giữ.
     * - Trừ x2 điểm quá hạn theo ngày tính đến thời điểm báo mất (nếu quá hạn).
     * - Tạo khoản thanh toán bồi thường (giá sách).
     */
    static async baoMatSach({
        luotMuonId,
        msnvGhiNhanId,
        ngayBaoMat = new Date(),
    }) {
        const phieuMuon =
            await TheoDoiMuonSach.findById(luotMuonId).populate('sach');
        if (!phieuMuon) {
            throw new ApiError(404, 'Không tìm thấy lượt mượn sách.');
        }

        if (phieuMuon.trangThai === TRANG_THAI_MUON.DA_TRA) {
            throw new ApiError(
                400,
                'Sách đã được trả thành công, không thể báo mất.',
            );
        }

        if (phieuMuon.trangThai === TRANG_THAI_MUON.DA_MAT) {
            throw new ApiError(
                400,
                'Lượt mượn này đã được ghi nhận mất sách trước đó.',
            );
        }

        const thoiDiemBaoMat = new Date(ngayBaoMat);
        phieuMuon.trangThai = TRANG_THAI_MUON.DA_MAT;
        phieuMuon.ghiChu = `Báo mất sách vào ngày ${thoiDiemBaoMat.toISOString().split('T')[0]}`;

        // Kiểm tra số ngày quá hạn tại thời điểm báo mất để trừ x2 điểm
        let soNgayQuaHan = 0;
        if (thoiDiemBaoMat > new Date(phieuMuon.ngayHenTra)) {
            const diffTime =
                thoiDiemBaoMat.getTime() -
                new Date(phieuMuon.ngayHenTra).getTime();
            soNgayQuaHan = Math.max(
                1,
                Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
            );
        }

        const docGia = await DocGia.findById(phieuMuon.docGia);
        if (docGia) {
            const diemTru =
                soNgayQuaHan > 0
                    ? soNgayQuaHan *
                      DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY *
                      DIEM.HE_SO_TRU_MAT_SACH
                    : 5;
            docGia.diemDocGia = Math.max(
                DIEM.TOI_THIEU,
                docGia.diemDocGia - diemTru,
            );
            docGia.ngayCapNhatDiemKhongViPham = thoiDiemBaoMat;
            await docGia.save();
        }

        // Tiền bồi thường sách: Đơn giá sách
        const giaSach = phieuMuon.sach.donGia || 50000;
        phieuMuon.tienPhat = giaSach;
        await phieuMuon.save();

        const maThanhToanBoiThuong = `BOITHUONG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const thanhToan = new ThanhToan({
            maThanhToan: maThanhToanBoiThuong,
            loai: LOAI_THANH_TOAN.PHI_PHAT_MAT_SACH,
            soTien: giaSach,
            docGia: phieuMuon.docGia,
            theoDoiMuonSach: phieuMuon._id,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu: `Bồi thường mất sách "${phieuMuon.sach.tenSach}" (Đơn giá: ${giaSach}đ)`,
        });
        await thanhToan.save();

        await DiemService.kiemTraVaXuLyVuotHanMucMuon(phieuMuon.docGia);

        return {
            phieuMuon,
            thanhToan,
            diemTru: docGia ? docGia.diemDocGia : null,
        };
    }
}

module.exports = MuonTraService;
