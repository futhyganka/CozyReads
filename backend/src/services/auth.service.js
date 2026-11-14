const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { DocGia, NhanVien } = require('../models');
const OtpService = require('./otp.service');
const ApiError = require('../api-error');
const { ROLES, ROLE_PERMISSIONS } = require('../constants/permissions');
const {
    LOAI_DOC_GIA,
    CHUC_VU_NHAN_VIEN,
    DIEM,
    TRANG_THAI_DOC_GIA,
    GOI_GIA_HAN,
    REGEX,
} = require('../constants/business-rules');

class AuthService {
    /**
     * Tương thích với các bản test cũ (không còn bảng VaiTro nên là no-op)
     */
    static async khoiTaoVaiTroMacDinh() {
        return true;
    }

    /**
     * Tạo tài khoản (tương thích backward)
     */
    static async dangKyTaiKhoan(data) {
        return this.dangKyDocGia(data);
    }

    /**
     * Tạo nhân viên trọn gói (hỗ trợ test cũ)
     */
    static async dangKyNhanVien(data) {
        const NhanVienService = require('./nhanvien.service');
        const chucVu = data.isAdmin
            ? CHUC_VU_NHAN_VIEN.ADMIN
            : data.chucVu || CHUC_VU_NHAN_VIEN.NHAN_VIEN;
        const nhanVien = await NhanVienService.taoNhanVien({
            hoTenNv: data.hoTen,
            password: data.password,
            chucVu,
            diaChi: data.diaChi,
            soDienThoai: data.dienThoai || data.soDienThoai,
            luong: data.luong,
        });

        let docGia = null;
        if (data.taoHoSoDocGia) {
            const DocGiaService = require('./docgia.service');
            docGia = await DocGiaService.taoDocGiaTaiQuay({
                hoLot: data.hoLot || data.hoTen.split(' ')[0] || 'NV',
                ten:
                    data.ten ||
                    data.hoTen.split(' ').slice(1).join(' ') ||
                    data.hoTen,
                dienThoai: data.dienThoai || data.soDienThoai,
                loaiDocGia: LOAI_DOC_GIA.NHANVIEN,
                diaChi: data.diaChi,
            });
        }

        return { nhanVien, docGia };
    }
    static async taoMaDocGia() {
        const prefix = 'DG';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const docGias = await DocGia.find({}, { maDocGia: 1, _id: 0 }).lean();

        let maxIndex = -1;
        for (const dg of docGias) {
            const match = dg.maDocGia?.match(/^DG([A-Z])(\d{7})$/);
            if (match) {
                const letterIndex = letters.indexOf(match[1]);
                const number = Number(match[2]);
                const index = letterIndex * 10_000_000 + number;
                maxIndex = Math.max(maxIndex, index);
            }
        }

        const nextIndex = maxIndex + 1;
        if (nextIndex >= 26 * 10_000_000) {
            throw new Error('Đã hết mã độc giả có thể tạo.');
        }

        const letterIndex = Math.floor(nextIndex / 10_000_000);
        const number = nextIndex % 10_000_000;
        return `${prefix}${letters[letterIndex]}${String(number).padStart(7, '0')}`;
    }

    /**
     * Tạo mã số nhân viên gồm 8 ký tự: S + 1 chữ + 6 số
     */
    static async taoMaNhanVien() {
        const prefix = 'S';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nhanViens = await NhanVien.find({}, { msnv: 1, _id: 0 }).lean();

        let maxIndex = -1;
        for (const nv of nhanViens) {
            const match = nv.msnv?.match(/^S([A-Z])(\d{6})$/);
            if (match) {
                const letterIndex = letters.indexOf(match[1]);
                const number = Number(match[2]);
                const index = letterIndex * 1_000_000 + number;
                maxIndex = Math.max(maxIndex, index);
            }
        }

        const nextIndex = maxIndex + 1;
        if (nextIndex >= 26 * 1_000_000) {
            throw new Error('Đã hết mã nhân viên có thể tạo.');
        }

        const letterIndex = Math.floor(nextIndex / 1_000_000);
        const number = nextIndex % 1_000_000;
        return `${prefix}${letters[letterIndex]}${String(number).padStart(6, '0')}`;
    }

    /**
     * Hash mật khẩu
     */
    static async bamMatKhau(plainPassword) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(plainPassword, salt);
    }

    /**
     * So khớp mật khẩu
     */
    static async kiemTraMatKhau(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Tạo JWT token chứa thông tin xác thực
     */
    static taoToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
    }

    /**
     * Ánh xạ chức vụ nhân viên sang Role
     */
    static xacDinhRoleNhanVien(chucVu) {
        if (chucVu === CHUC_VU_NHAN_VIEN.ADMIN) {
            return ROLES.QUANTRIVIEN;
        }
        if (
            chucVu === CHUC_VU_NHAN_VIEN.NHAN_VIEN ||
            chucVu === CHUC_VU_NHAN_VIEN.QUAN_LY
        ) {
            return ROLES.NHANVIEN;
        }
        return ROLES.KHACH;
    }

    /**
     * Bước 4: Hoàn tất đăng ký độc giả bằng registrationToken đã xác thực
     */
    static async dangKyDocGia(data) {
        const {
            registrationToken,
            email,
            password,
            hoLot,
            ten,
            dienThoai,
            loaiDocGia = LOAI_DOC_GIA.DOCGIA_TUDO,
            chuKyThanhToan = '1_thang',
            diaChi = '',
            ngaySinh = null,
            phai = 'khac',
            avatar = '',
        } = data;

        if (!registrationToken) {
            throw new ApiError(
                400,
                'registrationToken là bắt buộc. Vui lòng xác thực email trước khi hoàn tất đăng ký.',
            );
        }

        if (!password) {
            throw new ApiError(400, 'Mật khẩu là bắt buộc.');
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
        if (!hoLot || !ten) {
            throw new ApiError(400, 'Họ lót và tên là bắt buộc.');
        }

        // Tiêu thụ registrationToken (đảm bảo hợp lệ, chưa dùng, chưa hết hạn và đúng email)
        const verifiedEmail = await OtpService.tieuThuRegistrationToken(
            registrationToken,
            email,
        );

        // Kiểm tra xem email có vừa bị đăng ký bởi request khác không
        const emailExists = await DocGia.findOne({ email: verifiedEmail });
        if (emailExists) {
            throw new ApiError(400, 'Email này đã được sử dụng.');
        }

        const hashedPassword = await this.bamMatKhau(password);
        const maDocGia = await this.taoMaDocGia();

        // Tính ngày hết hạn thẻ ban đầu
        let ngayHetHanThe = undefined;
        if (loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO) {
            const thongTinGoi = GOI_GIA_HAN[chuKyThanhToan] || GOI_GIA_HAN['1_thang'];
            const soNgay = thongTinGoi ? thongTinGoi.soNgay : 30;
            ngayHetHanThe = new Date(Date.now() + soNgay * 24 * 60 * 60 * 1000);
        } else {
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
            avatar,
            chuKyThanhToan: loaiDocGia === LOAI_DOC_GIA.DOCGIA_TUDO ? chuKyThanhToan : '6_thang_mien_phi',
            ngayHetHanThe,
            loaiDocGia,
            diemDocGia: DIEM.MAC_DINH,
            trangThaiTaiKhoan: TRANG_THAI_DOC_GIA.HOAT_DONG,
            ngayCapNhatDiemKhongViPham: new Date(),
        });

        await docGia.save();

        // Yêu cầu: Trả về thông báo đăng ký thành công cùng mã độc giả, KHÔNG trả mật khẩu hoặc JWT token
        return {
            success: true,
            message: 'Đăng ký tài khoản độc giả thành công.',
            maDocGia: docGia.maDocGia,
            email: docGia.email,
            hoTen: `${docGia.hoLot} ${docGia.ten}`.trim(),
        };
    }

    /**
     * Đăng nhập độc giả (bằng EMAIL hoặc MADOCGIA và PASSWORD)
     */
    static async dangNhapDocGia({ identifier, email, maDocGia, password }) {
        const iden = (identifier || email || maDocGia || '').trim();
        if (!iden || !password) {
            throw new ApiError(400, 'Vui lòng cung cấp Email hoặc Mã độc giả và Mật khẩu.');
        }

        const docGia = await DocGia.findOne({
            $or: [
                { email: iden.toLowerCase() },
                { maDocGia: iden.toUpperCase() },
            ],
        }).select('+password');

        if (!docGia) {
            throw new ApiError(401, 'Tài khoản độc giả không tồn tại.');
        }

        if (!docGia.password) {
            throw new ApiError(403, 'Hồ sơ độc giả này chưa thiết lập mật khẩu đăng nhập.');
        }

        const isMatch = await this.kiemTraMatKhau(password, docGia.password);
        if (!isMatch) {
            throw new ApiError(401, 'Thông tin đăng nhập hoặc mật khẩu không chính xác.');
        }

        if (docGia.daTotNghiep) {
            throw new ApiError(
                403,
                'Bạn đã tốt nghiệp, nếu muốn tiếp tục sử dụng dịch vụ, vui lòng đăng ký thẻ độc giả tự do.',
            );
        }
        if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.TAM_KHOA) {
            throw new ApiError(403, 'Thẻ độc giả đang bị tạm khóa.');
        }
        if (docGia.trangThaiTaiKhoan === TRANG_THAI_DOC_GIA.DA_HUY) {
            throw new ApiError(403, 'Thẻ độc giả đã bị hủy.');
        }

        const token = this.taoToken({
            _id: docGia._id,
            maDocGia: docGia.maDocGia,
            email: docGia.email,
            role: ROLES.DOCGIA,
            maVaiTro: ROLES.DOCGIA,
        });

        const docGiaRes = docGia.toObject();
        delete docGiaRes.password;

        return {
            _id: docGia._id,
            email: docGia.email,
            docGia: docGiaRes,
            token,
            role: ROLES.DOCGIA,
            maVaiTro: ROLES.DOCGIA,
        };
    }

    /**
     * Đăng nhập nhân viên (bằng MSNV và PASSWORD)
     */
    static async dangNhapNhanVien({ msnv, password }) {
        if (!msnv || !password) {
            throw new ApiError(400, 'Vui lòng cung cấp mã số nhân viên (MSNV) và mật khẩu.');
        }

        const nhanVien = await NhanVien.findOne({
            msnv: msnv.trim().toUpperCase(),
        }).select('+password');

        if (!nhanVien) {
            throw new ApiError(401, 'Mã số nhân viên hoặc mật khẩu không chính xác.');
        }

        const isMatch = await this.kiemTraMatKhau(password, nhanVien.password);
        if (!isMatch) {
            throw new ApiError(401, 'Mã số nhân viên hoặc mật khẩu không chính xác.');
        }

        const role = this.xacDinhRoleNhanVien(nhanVien.chucVu);
        if (role === ROLES.KHACH || nhanVien.daNghiViec) {
            throw new ApiError(403, 'Nhân viên này đã nghỉ việc hoặc không có quyền truy cập hệ thống.');
        }

        const token = this.taoToken({
            _id: nhanVien._id,
            msnv: nhanVien.msnv,
            chucVu: nhanVien.chucVu,
            role,
            maVaiTro: role,
        });

        const nvRes = nhanVien.toObject();
        delete nvRes.password;

        return {
            nhanVien: nvRes,
            token,
            role,
            maVaiTro: role,
        };
    }

    /**
     * Quên mật khẩu: Đặt lại mật khẩu mới bằng verificationToken đã xác thực OTP
     */
    static async datLaiMatKhauQuen({ email, verificationToken, matKhauMoi }) {
        if (!email || !verificationToken || !matKhauMoi) {
            throw new ApiError(
                400,
                'Email, verificationToken và mật khẩu mới là bắt buộc.',
            );
        }

        if (matKhauMoi.length < 6) {
            throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Tiêu thụ token (đảm bảo token hợp lệ, chưa dùng, chưa hết hạn và đúng email)
        const verifiedEmail = await OtpService.tieuThuRegistrationToken(
            verificationToken,
            normalizedEmail,
        );

        const docGia = await DocGia.findOne({ email: verifiedEmail }).select('+password');
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy tài khoản độc giả tương ứng.');
        }

        docGia.password = await this.bamMatKhau(matKhauMoi);
        await docGia.save();

        return {
            success: true,
            message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
        };
    }

    /**
     * Hàm kiểm tra quyền
     */
    static kiemTraQuyen(role, requiredPermission) {
        const permissions = ROLE_PERMISSIONS[role] || [];
        return permissions.includes(requiredPermission);
    }
}

module.exports = AuthService;
