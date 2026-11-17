const { KyThanhToan, TheoDoiMuonSach, DocGia, NhanVien } = require('../models');
const ApiError = require('../api-error');
const MailService = require('./mail.service');
const {
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    TRANG_THAI_MUON,
    TRANG_THAI_DOC_GIA,
    GOI_GIA_HAN,
} = require('../constants/business-rules');

class KyThanhToanService {
    /**
     * Tạo khoản thanh toán mới
     */
    static async taoThanhToan(data) {
        let {
            maThanhToan,
            loai,
            soTien,
            maDocGia,
            docGia,
            maTheoDoi,
            theoDoiMuonSach,
            msnv,
            phuongThuc = 'tienMat',
            goiGiaHan,
            ghiChu = '',
        } = data;

        const dgId = maDocGia || docGia;
        const tdId = maTheoDoi || theoDoiMuonSach;

        if (!dgId) {
            throw new ApiError(400, 'Độc giả là bắt buộc.');
        }
        if (!loai) {
            throw new ApiError(400, 'Loại thanh toán là bắt buộc.');
        }
        if (soTien === undefined || soTien === null || Number(soTien) < 0) {
            throw new ApiError(400, 'Số tiền thanh toán phải >= 0.');
        }

        const docGiaTonTai = await DocGia.findById(dgId);
        if (!docGiaTonTai) {
            throw new ApiError(404, 'Không tìm thấy hồ sơ độc giả.');
        }

        if (msnv) {
            const nv = await NhanVien.findById(msnv);
            if (!nv) throw new ApiError(404, 'Không tìm thấy nhân viên.');
        }

        if (tdId) {
            const td = await TheoDoiMuonSach.findById(tdId);
            if (!td) throw new ApiError(404, 'Không tìm thấy lượt mượn sách.');
        }

        if (!maThanhToan) {
            maThanhToan = `TT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        } else {
            const tonTai = await KyThanhToan.findOne({ maThanhToan });
            if (tonTai) {
                throw new ApiError(400, `Mã thanh toán [${maThanhToan}] đã tồn tại.`);
            }
        }

        const thanhToan = new KyThanhToan({
            maThanhToan,
            loai,
            soTien: Number(soTien),
            maDocGia: dgId,
            maTheoDoi: tdId || null,
            msnv: msnv || null,
            phuongThuc,
            goiGiaHan: goiGiaHan || null,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu,
        });

        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Lấy danh sách thanh toán có lọc và phân trang
     */
    static async getDanhSachThanhToan({
        docGiaId,
        trangThai,
        loai,
        phuongThuc,
        search,
        page = 1,
        limit = 10,
    }) {
        const filter = {};
        if (docGiaId) filter.maDocGia = docGiaId;
        if (trangThai) filter.trangThai = trangThai;
        if (loai) filter.loai = loai;
        if (phuongThuc) filter.phuongThuc = phuongThuc;
        if (search) {
            filter.maThanhToan = new RegExp(search, 'i');
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [thanhToans, total] = await Promise.all([
            KyThanhToan.find(filter)
                .populate('maDocGia', 'maDocGia hoLot ten email dienThoai')
                .populate('msnv', 'msnv hoTenNv')
                .populate('maTheoDoi')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            KyThanhToan.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: thanhToans,
        };
    }

    /**
     * Lấy chi tiết thanh toán theo ID hoặc mã thanh toán
     */
    static async getChiTietThanhToan(idOrMa) {
        let tt = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            tt = await KyThanhToan.findById(idOrMa)
                .populate('maDocGia')
                .populate('msnv', 'msnv hoTenNv')
                .populate('maTheoDoi');
        }
        if (!tt) {
            tt = await KyThanhToan.findOne({ maThanhToan: idOrMa.toUpperCase() })
                .populate('maDocGia')
                .populate('msnv', 'msnv hoTenNv')
                .populate('maTheoDoi');
        }
        if (!tt) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }
        return tt;
    }

    /**
     * Cập nhật phương thức thanh toán hoặc ghi chú
     */
    static async capNhatThanhToan(id, data) {
        const thanhToan = await KyThanhToan.findById(id);
        if (!thanhToan) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_THANH_TOAN) {
            throw new ApiError(400, 'Giao dịch đã thanh toán thành công, không được sửa đổi.');
        }

        if (data.phuongThuc) thanhToan.phuongThuc = data.phuongThuc;
        if (data.ghiChu !== undefined) thanhToan.ghiChu = data.ghiChu;

        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Xác nhận thanh toán hợp lệ bởi nhân viên
     */
    static async xacNhanThanhToan({
        maThanhToan,
        thanhToanId,
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

        let thanhToan = null;
        if (thanhToanId) {
            thanhToan = await KyThanhToan.findById(thanhToanId);
        } else if (maThanhToan) {
            thanhToan = await KyThanhToan.findOne({ maThanhToan });
        }

        if (!thanhToan) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_THANH_TOAN) {
            throw new ApiError(
                400,
                'Giao dịch thanh toán này đã được xác nhận trước đó.',
            );
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_HUY) {
            throw new ApiError(400, 'Giao dịch thanh toán này đã bị hủy.');
        }

        const thoiDiemXacNhan = new Date(ngayThanhToan);
        thanhToan.msnv = msnvId;
        thanhToan.ngayThanhToan = thoiDiemXacNhan;
        thanhToan.trangThai = TRANG_THAI_THANH_TOAN.DA_THANH_TOAN;
        await thanhToan.save();

        // 1. Phí phạt mất sách -> Hoàn tất nghĩa vụ bồi thường
        if (
            thanhToan.loai === LOAI_THANH_TOAN.PHI_PHAT_MAT_SACH &&
            thanhToan.maTheoDoi
        ) {
            const phieuMuon = await TheoDoiMuonSach.findById(
                thanhToan.maTheoDoi,
            );
            if (phieuMuon) {
                phieuMuon.trangThai = TRANG_THAI_MUON.DA_BOI_THUONG;
                await phieuMuon.save();
            }
        }

        // 2. Phí gia hạn thẻ cho độc giả tự do
        if (thanhToan.loai === LOAI_THANH_TOAN.PHI_GIA_HAN) {
            const docGia = await DocGia.findById(thanhToan.maDocGia);
            if (
                docGia &&
                thanhToan.goiGiaHan &&
                GOI_GIA_HAN[thanhToan.goiGiaHan]
            ) {
                const isFirstActivation = !docGia.ngayHetHanThe;
                const soNgayThem = GOI_GIA_HAN[thanhToan.goiGiaHan].soNgay;
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
                if (isFirstActivation) {
                    docGia.ngayCapNhatDiemKhongViPham = thoiDiemXacNhan;
                }

                if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.TAM_KHOA) {
                    docGia.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.HOAT_DONG;
                }

                await docGia.save();
            }
        }

        return thanhToan;
    }

    /**
     * Hủy giao dịch thanh toán
     */
    static async huyThanhToan(id, lyDo = '') {
        const thanhToan = await KyThanhToan.findById(id);
        if (!thanhToan) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_THANH_TOAN) {
            throw new ApiError(400, 'Không thể hủy giao dịch đã thanh toán.');
        }

        thanhToan.trangThai = TRANG_THAI_THANH_TOAN.DA_HUY;
        if (lyDo) thanhToan.ghiChu += ` [Hủy: ${lyDo}]`;
        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Xóa giao dịch thanh toán (chỉ cho phép xóa bản ghi nháp hoặc đã hủy)
     */
    static async xoaThanhToan(id) {
        const thanhToan = await KyThanhToan.findById(id);
        if (!thanhToan) {
            throw new ApiError(404, 'Không tìm thấy giao dịch thanh toán.');
        }

        if (thanhToan.trangThai === TRANG_THAI_THANH_TOAN.DA_THANH_TOAN) {
            throw new ApiError(
                400,
                'Không được phép xóa chứng từ thanh toán đã hoàn thành.',
            );
        }

        await KyThanhToan.findByIdAndDelete(id);
        return { success: true, message: 'Đã xóa giao dịch thanh toán thành công.' };
    }

    /**
     * Quét và nhắc nhở các khoản bồi thường mất/hỏng sách chưa thanh toán (sau 3 ngày và sau 7 ngày)
     */
    static async quetVaNhacNhoBoiThuongMatSach(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachCho = await KyThanhToan.find({
            loai: LOAI_THANH_TOAN.PHI_PHAT_MAT_SACH,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
        }).populate('maDocGia');

        const ketQua = [];

        for (const tt of danhSachCho) {
            const docGia = tt.maDocGia;
            if (!docGia || !docGia.email) continue;

            const ngayTao = tt.ngayTao ? new Date(tt.ngayTao) : new Date(tt.createdAt || now);
            const soNgayTroiQua = Math.floor(
                (now.getTime() - ngayTao.getTime()) / (1000 * 60 * 60 * 24),
            );

            // Mốc 3 ngày (nhắc lần 1) và mốc 7 ngày (nhắc lần 2)
            const daNhacLan1 = (tt.soLanNhacNho || 0) >= 2;
            const daNhacLan2 = (tt.soLanNhacNho || 0) >= 3;

            let canNhac = false;
            if (soNgayTroiQua >= 3 && !daNhacLan1) {
                canNhac = true;
                tt.soLanNhacNho = 2;
            } else if (soNgayTroiQua >= 7 && !daNhacLan2) {
                canNhac = true;
                tt.soLanNhacNho = 3;
            }

            if (canNhac) {
                const tenSach = tt.ghiChu || 'Sách mượn thư viện';
                MailService.guiEmailBoiThuongMatSach(docGia.email, {
                    hoTen: `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim(),
                    maThanhToan: tt.maThanhToan,
                    tenSach,
                    soTien: tt.soTien,
                    loaiNhac: 'nhac_nho',
                }).catch(err => console.error('Lỗi gửi mail nhắc bồi thường:', err.message));

                tt.lanGuiMailCuoi = now;
                await tt.save();

                ketQua.push({
                    maThanhToan: tt.maThanhToan,
                    docGiaId: docGia._id,
                    email: docGia.email,
                    soLanNhacNho: tt.soLanNhacNho,
                });
            }
        }

        return ketQua;
    }
}

module.exports = KyThanhToanService;
