const { DocGia, TheoDoiMuonSach, KyThanhToan } = require('../models');
const ApiError = require('../api-error');
const AuthService = require('./auth.service');
const OtpService = require('./otp.service');
const MailService = require('./mail.service');
const {
    GOI_GIA_HAN,
    LOAI_DOC_GIA,
    TRANG_THAI_DOC_GIA,
    TRANG_THAI_GIA_HAN,
    SO_NGAY_AN_HAN_GIA_HAN,
    LOAI_THANH_TOAN,
    TRANG_THAI_THANH_TOAN,
    TRANG_THAI_MUON,
    DIEM,
    REGEX,
} = require('../constants/business-rules');

class DocGiaService {
    /**
     * Tạo độc giả tại quầy (bởi nhân viên / admin)
     * Độc giả đăng ký trực tiếp tại quầy cũng bắt buộc phải xác thực email qua OTP (nếu có email) hoặc
     * có thể hoàn tất bằng registrationToken đã xác thực.
     */
    static async taoDocGiaTaiQuay(data) {
        const {
            registrationToken,
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
        if (!REGEX.SO_DIEN_THOAI.test(dienThoai.trim())) {
            throw new ApiError(
                400,
                'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).',
            );
        }

        let verifiedEmail = undefined;

        // Nếu cung cấp email hoặc registrationToken, bắt buộc phải xác thực email
        if (registrationToken) {
            verifiedEmail = await OtpService.tieuThuRegistrationToken(registrationToken, email);
        } else if (email) {
            throw new ApiError(
                400,
                'Độc giả đăng ký tại quầy có email bắt buộc phải xác thực email trước và cung cấp registrationToken.',
            );
        }

        if (verifiedEmail) {
            const emailTonTai = await DocGia.findOne({ email: verifiedEmail });
            if (emailTonTai) {
                throw new ApiError(400, 'Email này đã tồn tại trong hệ thống.');
            }
        }

        const maDocGia = await AuthService.taoMaDocGia();
        let hashedPassword = undefined;
        if (password) {
            hashedPassword = await AuthService.bamMatKhau(password);
        }

        let ngayHetHanThe = undefined;
        if (loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO) {
            const thongTinGoi = GOI_GIA_HAN[chuKyThanhToan] || GOI_GIA_HAN['1_thang'];
            const soNgay = thongTinGoi ? thongTinGoi.soNgay : 30;
            ngayHetHanThe = new Date(Date.now() + soNgay * 24 * 60 * 60 * 1000);
        } else {
            // Sinh viên, giảng viên, nhân viên: 180 ngày (6 tháng) mặc định
            const goiMienPhi = GOI_GIA_HAN['6_thang_mien_phi'] || GOI_GIA_HAN['6_thang'];
            const soNgay = goiMienPhi ? goiMienPhi.soNgay : 180;
            ngayHetHanThe = new Date(Date.now() + soNgay * 24 * 60 * 60 * 1000);
        }

        const docGia = new DocGia({
            maDocGia,
            hoLot: hoLot.trim(),
            ten: ten.trim(),
            ngaySinh,
            phai,
            diaChi: diaChi.trim(),
            dienThoai: dienThoai.trim(),
            email: verifiedEmail,
            password: hashedPassword,
            chuKyThanhToan: loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO ? chuKyThanhToan : '6_thang_mien_phi',
            ngayHetHanThe,
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
     * Cập nhật thông tin độc giả (Chỉ cho phép cập nhật thông tin cá nhân hợp lệ)
     * Các trường nhạy cảm: maDocGia, password, diemDocGia, trangThaiTaiKhoan, ngayHetHanThe...
     * TUYỆT ĐỐI không cho phép sửa qua hàm này để đảm bảo an toàn phân quyền.
     */
    static async capNhatDocGia(id, updateData) {
        const docGia = await DocGia.findById(id);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy độc giả.');
        }

        // 1. Xử lý cập nhật Email (nếu có yêu cầu đổi email)
        if (updateData.email && updateData.email.trim().toLowerCase() !== docGia.email) {
            if (!OtpService.kiemTraDinhDangEmail(updateData.email)) {
                throw new ApiError(400, 'Địa chỉ email mới không hợp lệ.');
            }
            // Khi đổi email mới: bắt buộc phải có verificationToken đã được xác thực OTP
            const tokenSuDung = updateData.verificationToken || updateData.registrationToken;
            if (!tokenSuDung) {
                throw new ApiError(
                    400,
                    'Thay đổi email yêu cầu phải xác thực OTP trên email mới trước. Vui lòng cung cấp verificationToken.',
                );
            }

            const verifiedEmail = await OtpService.tieuThuRegistrationToken(
                tokenSuDung,
                updateData.email,
            );

            const emailExists = await DocGia.findOne({
                email: verifiedEmail.toLowerCase(),
                _id: { $ne: id },
            });
            if (emailExists) {
                throw new ApiError(400, 'Email này đã được sử dụng bởi tài khoản khác.');
            }
            docGia.email = verifiedEmail.toLowerCase();
        }

        // 2. Lọc danh sách các trường thông tin cá nhân được phép cập nhật (Whitelist)
        if (updateData.hoLot !== undefined) {
            if (!updateData.hoLot.trim()) throw new ApiError(400, 'Họ lót không được để trống.');
            docGia.hoLot = updateData.hoLot.trim();
        }

        if (updateData.ten !== undefined) {
            if (!updateData.ten.trim()) throw new ApiError(400, 'Tên không được để trống.');
            docGia.ten = updateData.ten.trim();
        }

        if (updateData.dienThoai !== undefined) {
            if (!updateData.dienThoai.trim()) throw new ApiError(400, 'Số điện thoại không được để trống.');
            if (!REGEX.SO_DIEN_THOAI.test(updateData.dienThoai.trim())) {
                throw new ApiError(
                    400,
                    'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).',
                );
            }
            docGia.dienThoai = updateData.dienThoai.trim();
        }

        if (updateData.diaChi !== undefined) {
            docGia.diaChi = updateData.diaChi.trim();
        }

        if (updateData.ngaySinh !== undefined) {
            docGia.ngaySinh = updateData.ngaySinh ? new Date(updateData.ngaySinh) : null;
        }

        if (updateData.phai !== undefined) {
            if (!['nam', 'nu', 'khac'].includes(updateData.phai)) {
                throw new ApiError(400, 'Giới tính không hợp lệ (chọn nam, nu, khac).');
            }
            docGia.phai = updateData.phai;
        }

        if (updateData.avatar !== undefined) {
            docGia.avatar = updateData.avatar;
        }

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

                    if (docGia.email) {
                        const hanChot = new Date(
                            now.getTime() + SO_NGAY_AN_HAN_GIA_HAN * 24 * 60 * 60 * 1000,
                        ).toLocaleDateString('vi-VN');
                        MailService.guiEmailGiaHanThe(docGia.email, {
                            hoTen: `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim(),
                            maThanhToan,
                            tenGoi: thongTinGoi.tenGoi,
                            soTien: thongTinGoi.gia,
                            hanChot,
                            loaiNhac: 'tao_moi',
                        }).catch(err => console.error('Lỗi gửi mail gia hạn:', err.message));

                        thanhToanMoi.lanGuiMailCuoi = now;
                        thanhToanMoi.soLanNhacNho = 1;
                    }

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
                const mocCanhBao = new Date(
                    ngayHetHan.getTime() + 5 * 24 * 60 * 60 * 1000,
                );

                // Cảnh báo trước khi khóa 2 ngày (ngày thứ 5 của đợt ân hạn)
                if (now >= mocCanhBao && now <= mocKhoaThe && (tt.soLanNhacNho || 0) < 2) {
                    if (docGia.email) {
                        const hanChot = mocKhoaThe.toLocaleDateString('vi-VN');
                        MailService.guiEmailGiaHanThe(docGia.email, {
                            hoTen: `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim(),
                            maThanhToan: tt.maThanhToan,
                            tenGoi: GOI_GIA_HAN[tt.goiGiaHan]?.tenGoi || 'Gói gia hạn',
                            soTien: tt.soTien,
                            hanChot,
                            loaiNhac: 'sap_khoa_the',
                        }).catch(err => console.error('Lỗi gửi mail cảnh báo gia hạn:', err.message));

                        tt.lanGuiMailCuoi = now;
                        tt.soLanNhacNho = 2;
                        await tt.save();
                    }
                }

                if (now > mocKhoaThe) {
                    docGia.trangThaiTaiKhoan = TRANG_THAI_DOC_GIA.TAM_KHOA;
                    await docGia.save();

                    // Tìm sách độc giả đang giữ (đang mượn, quá hạn, hoặc báo mất chưa đền)
                    const sachDangGiu = await TheoDoiMuonSach.find({
                        maDocGia: docGia._id,
                        trangThai: {
                            $in: [
                                TRANG_THAI_MUON.DANG_MUON,
                                TRANG_THAI_MUON.QUA_HAN,
                                TRANG_THAI_MUON.DA_MAT,
                            ],
                        },
                    }).populate('maSach');
                    const dsSachDangGiu = sachDangGiu.map(s => ({
                        tenSach: s.maSach?.tenSach || 'Sách thư viện',
                        ngayHenTra: s.ngayHenTra
                            ? new Date(s.ngayHenTra).toLocaleDateString('vi-VN')
                            : 'Không xác định',
                    }));

                    // Tìm các khoản nợ cần thanh toán
                    const cacKhoanNo = await KyThanhToan.find({
                        maDocGia: docGia._id,
                        trangThai: TRANG_THAI_THANH_TOAN.CHO_XAC_NHAN,
                    });
                    const dsKhoanNo = cacKhoanNo.map(k => ({
                        loai: k.loai,
                        soTien: k.soTien,
                        maThanhToan: k.maThanhToan,
                        ghiChu: k.ghiChu,
                    }));
                    const tongTienNo = cacKhoanNo.reduce((sum, k) => sum + k.soTien, 0);

                    if (docGia.email) {
                        MailService.guiEmailKhoaThe(docGia.email, {
                            hoTen: `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim(),
                            lyDo: 'Chưa thanh toán khoản gia hạn thẻ và đã quá hạn ân hạn 7 ngày.',
                            dsSachDangGiu,
                            dsKhoanNo,
                            tongTienNo,
                        }).catch(err => console.error('Lỗi gửi mail khóa thẻ:', err.message));
                    }

                    daXuLyDocGiaIds.add(docGia._id.toString());
                    ketQua.push({
                        docGiaId: docGia._id,
                        maDocGia: docGia.maDocGia,
                        ngayHetHanThe: docGia.ngayHetHanThe,
                        maThanhToanNo: tt.maThanhToan,
                        lyDo: 'Chưa thanh toán khoản gia hạn và đã quá hạn thẻ hơn 7 ngày.',
                        dsSachDangGiu,
                        tongTienNo,
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
