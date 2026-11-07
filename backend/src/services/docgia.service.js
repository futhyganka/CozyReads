const { DocGia, TheoDoiMuonSach, KyThanhToan } = require('../models');
const ApiError = require('../api-error');
const AuthService = require('./auth.service');
const {
    GOI_GIA_HAN,
    LOAI_DOC_GIA,
    TRANG_THAI_DOC_GIA,
    TRANG_THAI_GIA_HAN,
    SO_NGAY_AN_HAN_GIA_HAN,
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    DIEM,
} = require('../constants/business-rules');

class DocGiaService {
    /**
     * Tạo độc giả tại quầy (bởi nhân viên / admin)
     */
    static async taoDocGiaTaiQuay(data) {
        const {
            hoLot,
            ten,
            dienThoai,
            diaChi = '',
            ngaySinh = null,
            phai = 'khac',
            loaiDocGia = LOAI_DOC_GIA.DOCGIA_TUDO,
            chuKyThanhToan = '1_thang',
            email = null,
            password = null,
        } = data;

        if (!hoLot || !ten) {
            throw new ApiError(400, 'Họ lót và tên là bắt buộc.');
        }
        if (!dienThoai || !dienThoai.trim()) {
            throw new ApiError(400, 'Số điện thoại độc giả là bắt buộc.');
        }

        if (email) {
            const emailTonTai = await DocGia.findOne({ email: email.toLowerCase() });
            if (emailTonTai) {
                throw new ApiError(400, 'Email này đã tồn tại trong hệ thống.');
            }
        }

        const maDocGia = await AuthService.taoMaDocGia();
        let hashedPassword = undefined;
        if (password) {
            hashedPassword = await AuthService.bamMatKhau(password);
        }

        const docGia = new DocGia({
            maDocGia,
            hoLot,
            ten,
            ngaySinh,
            phai,
            diaChi,
            dienThoai,
            email: email ? email.toLowerCase() : undefined,
            password: hashedPassword,
            chuKyThanhToan,
            loaiDocGia,
            diemDocGia: DIEM.MAC_DINH,
            trangThaiTaiKhoan: TRANG_THAI_DOC_GIA.HOAT_DONG,
            ngayCapNhatDiemKhongViPham: new Date(),
        });

        await docGia.save();
        const docGiaRes = docGia.toObject();
        delete docGiaRes.password;
        return docGiaRes;
    }

    /**
     * Lấy danh sách độc giả có phân trang, tìm kiếm, lọc
     */
    static async getDanhSachDocGia({ search, loaiDocGia, trangThai, page = 1, limit = 10 }) {
        const filter = {};
        if (search) {
            filter.$or = [
                { maDocGia: new RegExp(search, 'i') },
                { ten: new RegExp(search, 'i') },
                { hoLot: new RegExp(search, 'i') },
                { dienThoai: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
            ];
        }
        if (loaiDocGia) filter.loaiDocGia = loaiDocGia;
        if (trangThai) filter.trangThaiTaiKhoan = trangThai;

        const skip = (Number(page) - 1) * Number(limit);
        const [docGias, total] = await Promise.all([
            DocGia.find(filter)
                .select('-password')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            DocGia.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: docGias,
        };
    }

    /**
     * Lấy chi tiết độc giả theo ID hoặc MADOCGIA
     */
    static async getChiTietDocGia(idOrMa) {
        let docGia = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            docGia = await DocGia.findById(idOrMa).select('-password');
        }
        if (!docGia) {
            docGia = await DocGia.findOne({ maDocGia: idOrMa.toUpperCase() }).select('-password');
        }
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }
        return docGia;
    }

    /**
     * Cập nhật thông tin độc giả
     */
    static async capNhatDocGia(id, updateData) {
        const docGia = await DocGia.findById(id);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        // Không cho phép đổi maDocGia
        delete updateData.maDocGia;
        delete updateData.password; // Đổi mật khẩu qua hàm riêng

        if (updateData.email && updateData.email !== docGia.email) {
            const emailExists = await DocGia.findOne({
                email: updateData.email.toLowerCase(),
                _id: { $ne: id },
            });
            if (emailExists) {
                throw new ApiError(400, 'Email này đã được sử dụng.');
            }
            updateData.email = updateData.email.toLowerCase();
        }

        if (updateData.trangThai) {
            updateData.trangThaiTaiKhoan = updateData.trangThai;
        }

        Object.assign(docGia, updateData);
        await docGia.save();

        const docGiaRes = docGia.toObject();
        delete docGiaRes.password;
        return docGiaRes;
    }

    /**
     * Đổi mật khẩu độc giả
     */
    static async doiMatKhau(docGiaId, { matKhauCu, matKhauMoi }) {
        if (!matKhauMoi || matKhauMoi.length < 6) {
            throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        const docGia = await DocGia.findById(docGiaId).select('+password');
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        if (docGia.password && matKhauCu) {
            const isMatch = await AuthService.kiemTraMatKhau(matKhauCu, docGia.password);
            if (!isMatch) {
                throw new ApiError(400, 'Mật khẩu cũ không chính xác.');
            }
        }

        docGia.password = await AuthService.bamMatKhau(matKhauMoi);
        await docGia.save();
        return { success: true, message: 'Đổi mật khẩu thành công.' };
    }

    /**
     * Khóa / Mở khóa thẻ độc giả
     */
    static async capNhatTrangThaiThe(docGiaId, trangThai) {
        if (!Object.values(TRANG_THAI_DOC_GIA).includes(trangThai)) {
            throw new ApiError(400, 'Trạng thái thẻ không hợp lệ.');
        }
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        docGia.trangThaiTaiKhoan = trangThai;
        await docGia.save();

        const resObj = docGia.toObject();
        delete resObj.password;
        return resObj;
    }

    /**
     * Cập nhật điểm độc giả
     */
    static async capNhatDiem(docGiaId, diemMoi) {
        const diem = Number(diemMoi);
        if (isNaN(diem) || diem < DIEM.TOI_THIEU || diem > DIEM.TOI_DA) {
            throw new ApiError(400, `Điểm độc giả phải từ ${DIEM.TOI_THIEU} đến ${DIEM.TOI_DA}.`);
        }

        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        docGia.diemDocGia = diem;
        await docGia.save();

        const resObj = docGia.toObject();
        delete resObj.password;
        return resObj;
    }

    /**
     * Xóa hoặc vô hiệu hóa độc giả theo quy định an toàn
     */
    static async xoaDocGia(docGiaId) {
        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        // Kiểm tra lịch sử mượn sách hoặc thanh toán
        const coLichSuMuon = await TheoDoiMuonSach.exists({ maDocGia: docGiaId });
        const coLichSuThanhToan = await KyThanhToan.exists({ maDocGia: docGiaId });

        if (coLichSuMuon || coLichSuThanhToan) {
            // Không xóa cứng để bảo toàn lịch sử giao dịch -> chuyển trạng thái thành DA_HUY
            docGia.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.DA_HUY;
            docGia.trangThaiGiaHan = TRANG_THAI_GIA_HAN.DA_HUY;
            await docGia.save();
            return {
                type: 'soft_delete',
                message: 'Độc giả có lịch sử giao dịch nên đã được chuyển sang trạng thái đã hủy.',
                docGia,
            };
        }

        await DocGia.findByIdAndDelete(docGiaId);
        return {
            type: 'hard_delete',
            message: 'Đã xóa hoàn toàn hồ sơ độc giả chưa phát sinh giao dịch.',
        };
    }

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

        if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.DA_HUY) {
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

        const thanhToanDangCho = await KyThanhToan.findOne({
            maDocGia: docGiaId,
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
        });
        if (thanhToanDangCho) {
            return thanhToanDangCho;
        }

        const maThanhToan = `GIAHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const thanhToan = new KyThanhToan({
            maThanhToan,
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            soTien: thongTinGoi.gia,
            maDocGia: docGiaId,
            maTheoDoi: null,
            goiGiaHan: selectedGoi,
            phuongThuc: phuongThuc || 'tienMat',
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
            ghiChu: `Gia hạn thẻ: ${thongTinGoi.tenGoi}`,
        });

        await thanhToan.save();
        return thanhToan;
    }

    /**
     * Quét và xử lý gia hạn thẻ định kỳ
     */
    static async quetVaXuLyGiaHanThe(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const danhSachDenHan = await DocGia.find({
            trangThaiTaiKhoan: { $ne: TRANG_THAI_DOC_GIA.DA_HUY },
            trangThaiGiaHan: TRANG_THAI_GIA_HAN.GIA_HAN,
            ngayHetHanThe: { $lte: now },
        });

        const ketQua = [];

        for (const docGia of danhSachDenHan) {
            if (docGia.loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO) {
                const daCoThanhToanCho = await KyThanhToan.exists({
                    maDocGia: docGia._id,
                    loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
                    trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
                });

                if (!daCoThanhToanCho) {
                    const goiMacDinh = docGia.chuKyThanhToan || '1_thang';
                    const thongTinGoi =
                        GOI_GIA_HAN[goiMacDinh] || GOI_GIA_HAN['1_thang'];

                    const maThanhToan = `AUTOGIAHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const thanhToanMoi = new KyThanhToan({
                        maThanhToan,
                        loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
                        soTien: thongTinGoi.gia,
                        maDocGia: docGia._id,
                        maTheoDoi: null,
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
                if (docGia.loaiDocGia === LOAI_DOC_GIA.SINHVIEN && docGia.daTotNghiep) {
                    continue;
                }

                const goiMienPhi = GOI_GIA_HAN['6_thang_mien_phi'] || GOI_GIA_HAN['6_thang'];
                const soNgay = goiMienPhi ? goiMienPhi.soNgay : 180;

                const mocCu = docGia.ngayHetHanThe ? new Date(docGia.ngayHetHanThe) : now;
                const mocBatDau = mocCu > now ? mocCu : now;
                docGia.ngayHetHanThe = new Date(
                    mocBatDau.getTime() + soNgay * 24 * 60 * 60 * 1000,
                );
                docGia.chuKyThanhToan = '6_thang_mien_phi';
                docGia.ngayBatDauKyThanhToan = mocBatDau;

                if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.TAM_KHOA) {
                    docGia.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.HOAT_DONG;
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
     * Quét và khóa thẻ độc giả tự do nợ phí quá hạn quá 7 ngày
     */
    static async quetVaKhoaTheDocGiaTuDo(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);

        const danhSachThanhToanNo = await KyThanhToan.find({
            loai: LOAI_THANH_TOAN.PHI_GIA_HAN,
            trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
        }).populate('maDocGia');

        const ketQua = [];
        const daXuLyDocGiaIds = new Set();

        for (const tt of danhSachThanhToanNo) {
            const docGia = tt.maDocGia;
            if (!docGia || daXuLyDocGiaIds.has(docGia._id.toString())) {
                continue;
            }

            if (
                docGia.loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO &&
                docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.HOAT_DONG &&
                docGia.ngayHetHanThe
            ) {
                const ngayHetHan = new Date(docGia.ngayHetHanThe);
                const mocKhoaThe = new Date(
                    ngayHetHan.getTime() +
                        SO_NGAY_AN_HAN_GIA_HAN * 24 * 60 * 60 * 1000,
                );

                if (now > mocKhoaThe) {
                    docGia.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.TAM_KHOA;
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
     * Quét và hủy thẻ sinh viên tốt nghiệp
     */
    static async quetVaHuyTheSinhVienTotNghiep(thoiDiemHienTai = new Date()) {
        const now = new Date(thoiDiemHienTai);
        const sinhVienHetHan = await DocGia.find({
            loaiDocGia: LOAI_DOC_GIA.SINHVIEN,
            daTotNghiep: true,
            trangThaiTaiKhoan: { $ne: TRANG_THAI_DOC_GIA.DA_HUY },
            ngayHetHanThe: { $lt: now },
        });

        const ketQua = [];

        for (const sv of sinhVienHetHan) {
            sv.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.DA_HUY;
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
