const bcrypt = require('bcryptjs');
const { TaiKhoan, DocGia, NhanVien, VaiTro } = require('../models');
const ApiError = require('../api-error');
const { ROLES, ROLE_PERMISSIONS } = require('../constants/permissions');
const {
    LOAI_DOC_GIA,
    CHUC_VU_NHAN_VIEN,
    DIEM,
    TRANG_THAI_DOC_GIA,
} = require('../constants/business-rules');

class AuthService {
    /**
     * Khởi tạo dữ liệu vai trò ban đầu theo Bảng Permissions
     */
    static async khoiTaoVaiTroMacDinh() {
        const danhSachVaiTro = [
            {
                _id: ROLES.KHACH,
                tenVaiTro: 'Khách',
                danhSachQuyen: ROLE_PERMISSIONS[ROLES.KHACH],
                moTa: 'Người dùng vãng lai chưa đăng nhập',
            },
            {
                _id: ROLES.DOCGIA,
                tenVaiTro: 'Độc giả',
                danhSachQuyen: ROLE_PERMISSIONS[ROLES.DOCGIA],
                moTa: 'Độc giả thư viện',
            },
            {
                _id: ROLES.NHANVIEN,
                tenVaiTro: 'Nhân viên thư viện',
                danhSachQuyen: ROLE_PERMISSIONS[ROLES.NHANVIEN],
                moTa: 'Nhân viên quản lý sách và mượn trả',
            },
            {
                _id: ROLES.QUANTRIVIEN,
                tenVaiTro: 'Quản trị viên',
                danhSachQuyen: ROLE_PERMISSIONS[ROLES.QUANTRIVIEN],
                moTa: 'Quản trị toàn quyền hệ thống',
            },
        ];

        for (const vaiTro of danhSachVaiTro) {
            await VaiTro.findByIdAndUpdate(vaiTro._id, vaiTro, {
                upsert: true,
                returnDocument: 'after',
            });
        }
    }

    /**
     * Tạo mã độc giả gồm 10 ký tự, gồm DG + 1 chữ + 7 số, quét qua từ DGA0000000 đến DGZ9999999
     */
    static async taoMaDocGia() {
        const prefix = 'DG';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // Lấy danh sách mã độc giả hiện có
        const docGias = await DocGia.find({}, { maDocGia: 1, _id: 0 }).lean();

        // Tìm mã lớn nhất hiện có
        let maxIndex = -1;

        for (const docGia of docGias) {
            const match = docGia.maDocGia?.match(/^DG([A-Z])(\d{7})$/);

            if (match) {
                const letterIndex = letters.indexOf(match[1]);
                const number = Number(match[2]);

                const index = letterIndex * 10_000_000 + number;

                maxIndex = Math.max(maxIndex, index);
            }
        }

        // Mã tiếp theo
        const nextIndex = maxIndex + 1;

        // Kiểm tra đã hết mã hay chưa
        if (nextIndex >= 26 * 10_000_000) {
            throw new Error('Đã hết mã độc giả có thể tạo.');
        }

        // Tách chữ cái và phần số
        const letterIndex = Math.floor(nextIndex / 10_000_000);
        const number = nextIndex % 10_000_000;

        const code = `${prefix}${letters[letterIndex]}${String(number).padStart(7, '0')}`;

        return code;
    }

    /**
     * Tạo mã số nhân viên gồm 8 ký tự: S + 1 chữ + 6 số
     */
    static async taoMaNhanVien() {
        const prefix = 'S';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // Lấy danh sách mã nhân viên hiện có
        const nhanViens = await NhanVien.find({}, { msnv: 1, _id: 0 }).lean();

        // Tìm mã lớn nhất hiện có
        let maxIndex = -1;

        for (const nhanVien of nhanViens) {
            const match = nhanVien.msnv?.match(/^S([A-Z])(\d{6})$/);

            if (match) {
                const letterIndex = letters.indexOf(match[1]);
                const number = Number(match[2]);

                const index = letterIndex * 1_000_000 + number;

                maxIndex = Math.max(maxIndex, index);
            }
        }

        // Mã tiếp theo
        const nextIndex = maxIndex + 1;

        // Kiểm tra đã hết mã hay chưa
        if (nextIndex >= 26 * 1_000_000) {
            throw new Error('Đã hết mã nhân viên có thể tạo.');
        }

        // Tách chữ cái và phần số
        const letterIndex = Math.floor(nextIndex / 1_000_000);
        const number = nextIndex % 1_000_000;

        const code = `${prefix}${letters[letterIndex]}${String(number).padStart(6, '0')}`;

        return code;
    }

    /**
     * Hàm băm mật khẩu
     */
    static async bamMatKhau(plainPassword) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(plainPassword, salt);
    }

    /**
     * Hàm kiểm tra mật khẩu
     */
    static async kiemTraMatKhau(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Đăng ký tài khoản chung
     */
    static async dangKyTaiKhoan({
        email,
        password,
        maVaiTro = ROLES.DOCGIA,
        avatar = '',
    }) {
        if (!email) {
            throw new ApiError(400, 'Email là bắt buộc.');
        }
        if (!password) {
            throw new ApiError(400, 'Mật khẩu là bắt buộc.');
        }

        const emailExists = await TaiKhoan.findOne({
            email: email.toLowerCase(),
        });
        if (emailExists) {
            throw new ApiError(400, 'Email này đã được sử dụng.');
        }

        const hashedPassword = await this.bamMatKhau(password);

        const taiKhoan = new TaiKhoan({
            email,
            password: hashedPassword,
            avatar,
            maVaiTro,
        });
        await taiKhoan.save();
        return taiKhoan;
    }

    /**
     * Tạo hồ sơ độc giả cho tài khoản
     */
    static async taoHoSoDocGia({
        taiKhoanId,
        hoLot,
        ten,
        dienThoai,
        loaiDocGia = LOAI_DOC_GIA.DOCGIA_TUDO,
        diaChi = '',
        ngaySinh = null,
        phai = 'khac',
    }) {
        if (!dienThoai || !dienThoai.trim()) {
            throw new ApiError(400, 'Số điện thoại độc giả là bắt buộc.');
        }
        if (!hoLot || !ten) {
            throw new ApiError(400, 'Họ lót và tên là bắt buộc.');
        }

        const taiKhoan = await TaiKhoan.findById(taiKhoanId);
        if (!taiKhoan) {
            throw new ApiError(404, 'Không tìm thấy tài khoản.');
        }

        const maDocGia = await this.taoMaDocGia();

        const docGia = new DocGia({
            _id: taiKhoanId,
            maDocGia,
            hoLot,
            ten,
            dienThoai,
            diaChi,
            ngaySinh,
            phai,
            loaiDocGia,
            diemDocGia: DIEM.MAC_DINH,
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
        });
        await docGia.save();
        return docGia;
    }

    /**
     * Tạo hồ sơ nhân viên cho tài khoản
     */
    static async taoHoSoNhanVien({
        taiKhoanId,
        hoTen,
        dienThoai,
        chucVu = CHUC_VU_NHAN_VIEN.NHAN_VIEN,
        diaChi = '',
        luong = 0,
    }) {
        if (!dienThoai || !dienThoai.trim()) {
            throw new ApiError(400, 'Số điện thoại nhân viên là bắt buộc.');
        }
        if (!hoTen) {
            throw new ApiError(400, 'Họ tên nhân viên là bắt buộc.');
        }

        const taiKhoan = await TaiKhoan.findById(taiKhoanId);
        if (!taiKhoan) {
            throw new ApiError(404, 'Không tìm thấy tài khoản.');
        }

        const msnv = await this.taoMaNhanVien();

        const nhanVien = new NhanVien({
            _id: taiKhoanId,
            msnv,
            hoTen,
            chucVu,
            diaChi,
            dienThoai,
            luong,
        });
        await nhanVien.save();
        return nhanVien;
    }

    /**
     * Đăng ký độc giả hoàn chỉnh (tạo tài khoản -> tạo hồ sơ độc giả)
     */
    static async dangKyDocGia(data) {
        const taiKhoan = await this.dangKyTaiKhoan({
            email: data.email,
            password: data.password,
            maVaiTro: ROLES.DOCGIA,
            avatar: data.avatar,
        });

        const docGia = await this.taoHoSoDocGia({
            taiKhoanId: taiKhoan._id,
            hoLot: data.hoLot,
            ten: data.ten,
            dienThoai: data.dienThoai,
            loaiDocGia: data.loaiDocGia,
            diaChi: data.diaChi,
            ngaySinh: data.ngaySinh,
            phai: data.phai,
        });

        return { taiKhoan, docGia };
    }

    /**
     * Đăng ký nhân viên hoàn chỉnh (tạo tài khoản -> tạo hồ sơ nhân viên + tùy chọn hồ sơ độc giả nếu muốn mượn sách)
     */
    static async dangKyNhanVien(data) {
        const maVaiTro = data.isAdmin ? ROLES.QUANTRIVIEN : ROLES.NHANVIEN;
        const taiKhoan = await this.dangKyTaiKhoan({
            email: data.email,
            password: data.password,
            maVaiTro,
            avatar: data.avatar,
        });

        const nhanVien = await this.taoHoSoNhanVien({
            taiKhoanId: taiKhoan._id,
            hoTen: data.hoTen,
            dienThoai: data.dienThoai,
            chucVu: data.chucVu,
            diaChi: data.diaChi,
            luong: data.luong,
        });

        // Nhân viên có thể đồng thời tạo hồ sơ độc giả để mượn sách
        let docGia = null;
        if (data.taoHoSoDocGia) {
            docGia = await this.taoHoSoDocGia({
                taiKhoanId: taiKhoan._id,
                hoLot: data.hoLot || data.hoTen.split(' ')[0] || 'NV',
                ten:
                    data.ten ||
                    data.hoTen.split(' ').slice(1).join(' ') ||
                    data.hoTen,
                dienThoai: data.dienThoai,
                loaiDocGia: LOAI_DOC_GIA.NHANVIEN,
                diaChi: data.diaChi,
            });
        }

        return { taiKhoan, nhanVien, docGia };
    }

    /**
     * Đăng nhập: Kiểm tra mật khẩu băm & kiểm tra trạng thái thẻ độc giả nếu vai trò là độc giả
     */
    static async dangNhap({ email, password }) {
        if (!email || !password) {
            throw new ApiError(400, 'Vui lòng cung cấp email và mật khẩu.');
        }

        const taiKhoan = await TaiKhoan.findOne({ email: email.toLowerCase() });
        if (!taiKhoan) {
            throw new ApiError(401, 'Email chưa được đăng ký.');
        }

        const isMatch = await this.kiemTraMatKhau(password, taiKhoan.password);
        if (!isMatch) {
            throw new ApiError(401, 'Email hoặc mật khẩu không chính xác.');
        }

        // Nếu vai trò là độc giả, kiểm tra DocGia.trangThai
        if (taiKhoan.maVaiTro === ROLES.DOCGIA) {
            const docGia = await DocGia.findById(taiKhoan._id);
            if (docGia) {
                if (docGia.trangThai === TRANG_THAI_DOC_GIA.TAM_KHOA) {
                    throw new ApiError(403, 'Thẻ độc giả đang bị tạm khóa.');
                }
                if (docGia.trangThai === TRANG_THAI_DOC_GIA.DA_HUY) {
                    throw new ApiError(403, 'Thẻ độc giả đã bị hủy.');
                }
            }
        }

        return {
            _id: taiKhoan._id,
            email: taiKhoan.email,
            maVaiTro: taiKhoan.maVaiTro,
        };
    }

    static kiemTraQuyen(maVaiTro, requiredPermission) {
        const permissions = ROLE_PERMISSIONS[maVaiTro] || [];
        return permissions.includes(requiredPermission);
    }
}

module.exports = AuthService;
