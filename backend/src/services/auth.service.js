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

        for (const vt of danhSachVaiTro) {
            await VaiTro.findByIdAndUpdate(vt._id, vt, {
                upsert: true,
                returnDocument: 'after',
            });
        }
    }

    /**
     * Đăng ký tài khoản độc giả mới
     */
    static async dangKyDocGia({
        email,
        password,
        hoLot,
        ten,
        dienThoai = '0900000000',
        loaiDocGia = LOAI_DOC_GIA.DOCGIA_TUDO,
        diaChi = '',
        ngaySinh = null,
        phai = 'khac',
    }) {
        const emailExists = await TaiKhoan.findOne({
            email: email.toLowerCase(),
        });
        if (emailExists) {
            throw new ApiError(400, 'Email này đã được sử dụng.');
        }

        // Tạo tài khoản
        const taiKhoan = new TaiKhoan({
            email,
            password, // Trong thực tế băm bằng bcrypt
            maVaiTro: ROLES.DOCGIA,
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
        });
        await taiKhoan.save();

        // Tạo hồ sơ độc giả với _id = taiKhoan._id
        const maDocGia = `DG${Date.now().toString().slice(-6)}`;
        const docGia = new DocGia({
            _id: taiKhoan._id,
            maDocGia,
            hoLot,
            ten,
            dienThoai,
            diaChi,
            ngaySinh,
            phai,
            loaiDocGia,
            diemDocGia: DIEM.MAC_DINH, // 100 điểm
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
        });
        await docGia.save();

        return { taiKhoan, docGia };
    }

    /**
     * Đăng ký tài khoản nhân viên
     */
    static async dangKyNhanVien({
        email,
        password,
        hoTen,
        dienThoai = '0900000000',
        chucVu = CHUC_VU_NHAN_VIEN.NHAN_VIEN,
        diaChi = '',
        luong = 0,
        isAdmin = false,
    }) {
        const emailExists = await TaiKhoan.findOne({
            email: email.toLowerCase(),
        });
        if (emailExists) {
            throw new ApiError(400, 'Email này đã được sử dụng.');
        }

        const maVaiTro = isAdmin ? ROLES.QUANTRIVIEN : ROLES.NHANVIEN;

        const taiKhoan = new TaiKhoan({
            email,
            password,
            maVaiTro,
            trangThai: TRANG_THAI_DOC_GIA.HOAT_DONG,
        });
        await taiKhoan.save();

        const msnv = `NV${Date.now().toString().slice(-6)}`;
        const nhanVien = new NhanVien({
            _id: taiKhoan._id,
            msnv,
            hoTen,
            chucVu,
            diaChi,
            dienThoai,
            luong,
        });
        await nhanVien.save();

        return { taiKhoan, nhanVien };
    }

    /**
     * Kiểm tra quyền hạn theo Permission Matrix
     */
    static kiemTraQuyen(maVaiTro, requiredPermission) {
        const permissions = ROLE_PERMISSIONS[maVaiTro] || [];
        return permissions.includes(requiredPermission);
    }
}

module.exports = AuthService;
