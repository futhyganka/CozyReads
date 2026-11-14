const {
    Sach,
    DocGia,
    TheoDoiMuonSach,
    NhanVien,
    KyThanhToan,
} = require('../models');
const ApiError = require('../api-error');
const DiemService = require('./diem.service');
const MailService = require('./mail.service');
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
        if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.TAM_KHOA) {
            throw new ApiError(
                403,
                'Thẻ độc giả đang bị tạm khóa. Yêu cầu trả toàn bộ sách và thanh toán hết tiền phạt trước khi sử dụng lại.',
            );
        }
        if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.DA_HUY) {
            throw new ApiError(403, 'Thẻ độc giả đã bị hủy.');
        }

        // 3. Kiểm tra có sách quá hạn chưa trả không
        const coSachQuaHan = await TheoDoiMuonSach.exists({
            maDocGia: docGiaId,
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
            maDocGia: docGiaId,
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
            maDocGia: docGiaId,
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
                `Điểm độc giả hiện tại (${docGia.diemDocGia}đ) từ 10 điểm trở xuống. Không được phép mượn sách.`,
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
            maDocGia: docGiaId,
            maSach: sachId,
            trangThai: {
                $in: [
                    TRANG_THAI_MUON.YEU_CAU_GIU_SACH,
                    TRANG_THAI_MUON.DANG_MUON,
                    TRANG_THAI_MUON.QUA_HAN,
                    TRANG_THAI_MUON.DA_MAT,
                ],
            },
        });
        if (daMuonSachNay) {
            throw new ApiError(
                400,
                'Độc giả đang giữ, đặt trước hoặc chưa hoàn tất đền bù cuốn sách này. Không thể mượn 2 cuốn trùng nhau.',
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
     * Tạo yêu cầu giữ sách trực tuyến (bởi độc giả)
     * - Trạng thái: 'yeuCau_giuSach'
     * - Giữ sách trong 24h, sau 24h không tới quầy sẽ bị hủy và hoàn lại tồn kho
     * - Chống giữ sách vượt tồn kho bằng phép cập nhật nguyên tử ($inc có điều kiện soQuyen > 0)
     */
    static async taoYeuCauGiuSachOnline({
        docGiaId,
        sachId,
        ngayYeuCau = new Date(),
    }) {
        await this.kiemTraDieuKienMuon(docGiaId, sachId);

        // Trừ tồn kho có điều kiện nguyên tử: đảm bảo soQuyen > 0, chống race condition vượt tồn kho
        const sachCapNhat = await Sach.findOneAndUpdate(
            { _id: sachId, soQuyen: { $gt: 0 } },
            { $inc: { soQuyen: -1 } },
            { new: true },
        );

        if (!sachCapNhat) {
            throw new ApiError(
                400,
                'Sách hiện đã hết trong kho (số lượng khả dụng = 0). Không thể giữ sách.',
            );
        }

        const thoiDiemYeuCau = new Date(ngayYeuCau);
        // Hạn giữ sách trực tuyến là 24h kể từ khi đặt
        const hanGiuSach = new Date(thoiDiemYeuCau.getTime() + 24 * 60 * 60 * 1000);

        try {
            const phieuMuon = new TheoDoiMuonSach({
                maDocGia: docGiaId,
                maSach: sachId,
                ngayMuon: thoiDiemYeuCau,
                ngayHenTra: hanGiuSach,
                msnvMuon: null,
                trangThai: TRANG_THAI_MUON.YEU_CAU_GIU_SACH,
                ghiChu: 'Yêu cầu giữ sách trực tuyến (hạn đến quầy nhận: 24h)',
            });

            await phieuMuon.save();
            return phieuMuon;
        } catch (err) {
            // Nếu lưu phiếu thất bại, hoàn lại tồn kho sách ngay lập tức
            await Sach.findByIdAndUpdate(sachId, { $inc: { soQuyen: 1 } });
            throw err;
        }
    }

    /**
     * Quét và hủy các yêu cầu giữ sách trực tuyến quá 24h chưa tới quầy xác nhận
     * - Cập nhật trạng thái có điều kiện: chỉ hủy và hoàn trả tồn kho nếu phiếu đang ở trạng thái 'yeuCau_giuSach'
     * - Đảm bảo dù cron chạy nhiều lần hoặc đồng thời thì mỗi yêu cầu chỉ được hoàn tồn kho đúng 1 lần
     */
    static async quetVaHuyYeuCauGiuSachQuaHan(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachQuaHan = await TheoDoiMuonSach.find({
            trangThai: TRANG_THAI_MUON.YEU_CAU_GIU_SACH,
            ngayHenTra: { $lt: now },
        });

        const ketQua = [];
        for (const item of danhSachQuaHan) {
            // Cập nhật trạng thái có điều kiện nguyên tử: Chỉ cập nhật nếu trạng thái VẪN LÀ yeuCau_giuSach
            const phieuDaHuy = await TheoDoiMuonSach.findOneAndUpdate(
                { _id: item._id, trangThai: TRANG_THAI_MUON.YEU_CAU_GIU_SACH },
                {
                    $set: {
                        trangThai: TRANG_THAI_MUON.DA_HUY,
                        ghiChu: `${item.ghiChu || ''} | Đã tự động hủy do quá 24h không đến quầy đăng ký.`,
                    },
                },
                { new: true },
            );

            // Chỉ hoàn lại tồn kho KHI VÀ CHỈ KHI cập nhật thành công từ yeuCau_giuSach sang daHuy
            if (phieuDaHuy) {
                await Sach.findByIdAndUpdate(phieuDaHuy.maSach, {
                    $inc: { soQuyen: 1 },
                });
                ketQua.push(phieuDaHuy);
            }
        }
        return ketQua;
    }

    /**
     * Xác nhận phiếu mượn tại quầy (dành cho yêu cầu giữ sách trực tuyến)
     */
    static async xacNhanMuonTaiQuay({
        luotMuonId,
        msnvMuonId,
        soNgayMuon = 14,
        ngayMuon = new Date(),
    }) {
        const nhanVien = await NhanVien.findById(msnvMuonId);
        if (!nhanVien || nhanVien.daNghiViec) {
            throw new ApiError(
                404,
                'Nhân viên thực hiện không tồn tại hoặc đã nghỉ việc.',
            );
        }

        const ngayBatDauMuon = new Date(ngayMuon);
        const ngayHenTra = new Date(
            ngayBatDauMuon.getTime() + soNgayMuon * 24 * 60 * 60 * 1000,
        );

        // Cập nhật có điều kiện nguyên tử: Chỉ xác nhận nếu phiếu VẪN CÒN ở trạng thái yeuCau_giuSach
        const phieuMuon = await TheoDoiMuonSach.findOneAndUpdate(
            { _id: luotMuonId, trangThai: TRANG_THAI_MUON.YEU_CAU_GIU_SACH },
            {
                $set: {
                    msnvMuon: msnvMuonId,
                    ngayMuon: ngayBatDauMuon,
                    ngayHenTra: ngayHenTra,
                    trangThai: TRANG_THAI_MUON.DANG_MUON,
                },
                $push: {
                    ghiChu: ` | Đã xác nhận mượn trực tiếp tại quầy bởi NV [${nhanVien.msnv}].`,
                },
            },
            { new: true },
        );

        if (!phieuMuon) {
            const phieuKiemTra = await TheoDoiMuonSach.findById(luotMuonId);
            if (!phieuKiemTra) {
                throw new ApiError(404, 'Không tìm thấy phiếu giữ sách.');
            }
            throw new ApiError(
                400,
                `Không thể xác nhận phiếu mượn vì phiếu đã bị hủy hoặc không còn ở trạng thái giữ sách (trạng thái hiện tại: ${phieuKiemTra.trangThai}).`,
            );
        }

        return phieuMuon;
    }

    /**
     * Tạo phiếu mượn sách trực tiếp tại quầy (bởi Nhân viên / Admin)
     */
    static async taoPhieuMuon({
        docGiaId,
        sachId,
        msnvMuonId = null,
        ngayMuon = new Date(),
        soNgayMuon = 14,
    }) {
        await this.kiemTraDieuKienMuon(docGiaId, sachId);

        if (!msnvMuonId) {
            throw new ApiError(
                400,
                'Tạo phiếu mượn chính thức tại quầy bắt buộc phải có thông tin nhân viên thực hiện (msnvMuon).',
            );
        }

        const nhanVien = await NhanVien.findById(msnvMuonId);
        if (!nhanVien || nhanVien.daNghiViec) {
            throw new ApiError(
                404,
                'Không tìm thấy nhân viên thực hiện mượn sách hoặc nhân viên đã nghỉ việc.',
            );
        }

        // Trừ tồn kho có điều kiện nguyên tử
        const sachCapNhat = await Sach.findOneAndUpdate(
            { _id: sachId, soQuyen: { $gt: 0 } },
            { $inc: { soQuyen: -1 } },
            { new: true },
        );

        if (!sachCapNhat) {
            throw new ApiError(
                400,
                'Sách hiện đã hết trong kho (số lượng khả dụng = 0).',
            );
        }

        const ngayBatDauMuon = new Date(ngayMuon);
        const ngayHenTra = new Date(
            ngayBatDauMuon.getTime() + soNgayMuon * 24 * 60 * 60 * 1000,
        );

        try {
            const phieuMuon = new TheoDoiMuonSach({
                maDocGia: docGiaId,
                maSach: sachId,
                ngayMuon: ngayBatDauMuon,
                ngayHenTra,
                msnvMuon: msnvMuonId,
                trangThai: TRANG_THAI_MUON.DANG_MUON,
            });

            await phieuMuon.save();
            return phieuMuon;
        } catch (err) {
            await Sach.findByIdAndUpdate(sachId, { $inc: { soQuyen: 1 } });
            throw err;
        }
    }

    /**
     * Tiếp nhận trả sách (không phạt tiền quá hạn, chỉ trừ điểm)
     */
    static async traSach({ luotMuonId, msnvTraId, ngayTra = new Date() }) {
        const phieuMuon =
            await TheoDoiMuonSach.findById(luotMuonId).populate('maSach');
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

        if (msnvTraId) {
            const nhanVien = await NhanVien.findById(msnvTraId);
            if (!nhanVien) {
                throw new ApiError(
                    404,
                    'Không tìm thấy nhân viên tiếp nhận trả sách.',
                );
            }
        }

        // Hoàn lại tồn kho
        const sachId = phieuMuon.maSach?._id || phieuMuon.maSach;
        const sach = await Sach.findById(sachId);
        if (sach) {
            sach.soQuyen += 1;
            await sach.save();
        }

        phieuMuon.ngayTra = thoiDiemTra;
        phieuMuon.msnvTra = msnvTraId || null;
        phieuMuon.trangThai = TRANG_THAI_MUON.DA_TRA;
        await phieuMuon.save();

        await DiemService.kiemTraVaXuLyVuotHanMucMuon(phieuMuon.maDocGia);

        return {
            phieuMuon,
            khoanPhat: null,
        };
    }

    /**
     * Báo làm mất sách hoặc hỏng sách (hỏng sách tính là mất sách)
     */
    static async baoMatSach({
        luotMuonId,
        msnvGhiNhanId,
        ngayBaoMat = new Date(),
        ghiChu = '',
    }) {
        const phieuMuon =
            await TheoDoiMuonSach.findById(luotMuonId).populate('maSach');
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
        const noteLydo = ghiChu ? ` (${ghiChu})` : '';
        phieuMuon.ghiChu = `Báo mất/hỏng sách vào ngày ${thoiDiemBaoMat.toISOString().split('T')[0]}${noteLydo}`;

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

        const docGia = await DocGia.findById(phieuMuon.maDocGia);
        if (docGia) {
            // Khi làm mất sách sẽ trừ x2 điểm quá hạn theo ngày.
            // Nếu chưa quá hạn (mất trong hạn): trừ mức phạt mất sách cơ bản (hệ số x2 của 1 chu kỳ vi phạm = 2 * 1 = 2 điểm).
            // Nếu đã quá hạn: số ngày quá hạn * 1đ * hệ số 2.
            const diemTru =
                soNgayQuaHan > 0
                    ? soNgayQuaHan *
                      DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY *
                      DIEM.HE_SO_TRU_MAT_SACH
                    : 1 * DIEM.DIEM_TRU_QUA_HAN_MOI_NGAY * DIEM.HE_SO_TRU_MAT_SACH;
            docGia.diemDocGia = Math.max(
                DIEM.TOI_THIEU,
                Math.min(DIEM.TOI_DA, docGia.diemDocGia - diemTru),
            );
            docGia.ngayCapNhatDiemKhongViPham = thoiDiemBaoMat;
            await docGia.save();
        }

        const sachObj = phieuMuon.maSach;
        const giaSach = sachObj?.donGia || 50000;
        phieuMuon.tienPhat = giaSach;
        await phieuMuon.save();

        const maThanhToanBoiThuong = `BOITHUONG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const thanhToan = new KyThanhToan({
            maThanhToan: maThanhToanBoiThuong,
            loai: LOAI_THANH_TOAN.PHI_PHAT_MAT_SACH,
            soTien: giaSach,
            maDocGia: phieuMuon.maDocGia,
            maTheoDoi: phieuMuon._id,
            msnv: msnvGhiNhanId || null,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu: `Bồi thường mất/hỏng sách "${sachObj?.tenSach || 'Sách'}" (Đơn giá: ${giaSach}đ)`,
        });

        if (docGia && docGia.email) {
            MailService.guiEmailBoiThuongMatSach(docGia.email, {
                hoTen: `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim(),
                maThanhToan: maThanhToanBoiThuong,
                tenSach: sachObj?.tenSach || 'Sách thư viện',
                soTien: giaSach,
                loaiNhac: 'tao_moi',
            }).catch(err => console.error('Lỗi gửi mail báo mất sách:', err.message));

            thanhToan.lanGuiMailCuoi = new Date();
            thanhToan.soLanNhacNho = 1;
        }

        await thanhToan.save();

        await DiemService.kiemTraVaXuLyVuotHanMucMuon(phieuMuon.maDocGia);

        return {
            phieuMuon,
            thanhToan,
            diemTru: docGia ? docGia.diemDocGia : null,
        };
    }

    /**
     * Lấy danh sách phiếu mượn có lọc và phân trang
     */
    static async getDanhSachPhieuMuon({
        docGiaId,
        sachId,
        trangThai,
        page = 1,
        limit = 10,
    }) {
        const filter = {};
        if (docGiaId) filter.maDocGia = docGiaId;
        if (sachId) filter.maSach = sachId;
        if (trangThai) filter.trangThai = trangThai;

        const skip = (Number(page) - 1) * Number(limit);
        const [phieuMuons, total] = await Promise.all([
            TheoDoiMuonSach.find(filter)
                .populate('maDocGia', 'maDocGia hoLot ten email dienThoai')
                .populate('maSach', 'maSach tenSach donGia hinhAnh')
                .populate('msnvMuon', 'msnv hoTenNv')
                .populate('msnvTra', 'msnv hoTenNv')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            TheoDoiMuonSach.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: phieuMuons,
        };
    }

    /**
     * Lấy chi tiết phiếu mượn
     */
    static async getChiTietPhieuMuon(id) {
        const phieuMuon = await TheoDoiMuonSach.findById(id)
            .populate('maDocGia')
            .populate('maSach')
            .populate('msnvMuon', 'msnv hoTenNv')
            .populate('msnvTra', 'msnv hoTenNv');
        if (!phieuMuon) {
            throw new ApiError(404, 'Không tìm thấy phiếu mượn sách.');
        }
        return phieuMuon;
    }

    /**
     * Cập nhật thông tin / trạng thái phiếu mượn
     */
    static async capNhatPhieuMuon(id, data) {
        const phieuMuon = await TheoDoiMuonSach.findById(id);
        if (!phieuMuon) {
            throw new ApiError(404, 'Không tìm thấy phiếu mượn sách.');
        }

        if (data.trangThai) phieuMuon.trangThai = data.trangThai;
        if (data.ghiChu !== undefined) phieuMuon.ghiChu = data.ghiChu;
        if (data.ngayHenTra) phieuMuon.ngayHenTra = new Date(data.ngayHenTra);

        await phieuMuon.save();
        return phieuMuon;
    }

    /**
     * Xóa phiếu mượn an toàn
     */
    static async xoaPhieuMuon(id) {
        const phieuMuon = await TheoDoiMuonSach.findById(id);
        if (!phieuMuon) {
            throw new ApiError(404, 'Không tìm thấy phiếu mượn.');
        }

        if (
            phieuMuon.trangThai === TRANG_THAI_MUON.DANG_MUON ||
            phieuMuon.trangThai === TRANG_THAI_MUON.QUA_HAN
        ) {
            throw new ApiError(
                400,
                'Không thể xóa phiếu mượn sách khi sách chưa được trả hoặc chưa giải quyết đền bù.',
            );
        }

        // Kiểm tra xem có giao dịch bồi thường gắn với phiếu này không
        const coThanhToan = await KyThanhToan.exists({ maTheoDoi: id });
        if (coThanhToan) {
            throw new ApiError(
                400,
                'Không thể xóa phiếu mượn đã gắn liền với chứng từ thanh toán/bồi thường.',
            );
        }

        await TheoDoiMuonSach.findByIdAndDelete(id);
        return { success: true, message: 'Đã xóa phiếu mượn thành công.' };
    }
}

module.exports = MuonTraService;
