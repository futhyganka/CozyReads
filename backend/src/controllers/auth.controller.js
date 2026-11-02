const AuthService = require('../services/auth.service');

class AuthController {
    // [POST] /api/auth/dang-ky-tai-khoan
    static async dangKyTaiKhoan(req, res, next) {
        try {
            const ketQua = await AuthService.dangKyTaiKhoan(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản thành công.',
                data: {
                    _id: ketQua._id,
                    email: ketQua.email,
                    maVaiTro: ketQua.maVaiTro,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/tao-ho-so-doc-gia
    static async taoHoSoDocGia(req, res, next) {
        try {
            const ketQua = await AuthService.taoHoSoDocGia(req.body);
            res.status(201).json({
                success: true,
                message: 'Tạo hồ sơ độc giả thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/tao-ho-so-nhan-vien
    static async taoHoSoNhanVien(req, res, next) {
        try {
            const ketQua = await AuthService.taoHoSoNhanVien(req.body);
            res.status(201).json({
                success: true,
                message: 'Tạo hồ sơ nhân viên thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-ky-doc-gia
    static async dangKyDocGia(req, res, next) {
        try {
            const ketQua = await AuthService.dangKyDocGia(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản và hồ sơ độc giả thành công.',
                data: {
                    taiKhoan: {
                        _id: ketQua.taiKhoan._id,
                        email: ketQua.taiKhoan.email,
                        maVaiTro: ketQua.taiKhoan.maVaiTro,
                    },
                    docGia: ketQua.docGia,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-ky-nhan-vien
    static async dangKyNhanVien(req, res, next) {
        try {
            const ketQua = await AuthService.dangKyNhanVien(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản và hồ sơ nhân viên thành công.',
                data: {
                    taiKhoan: {
                        _id: ketQua.taiKhoan._id,
                        email: ketQua.taiKhoan.email,
                        maVaiTro: ketQua.taiKhoan.maVaiTro,
                    },
                    nhanVien: ketQua.nhanVien,
                    docGia: ketQua.docGia,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-nhap
    static async dangNhap(req, res, next) {
        try {
            const { email, password } = req.body;
            const data = await AuthService.dangNhap({ email, password });
            res.json({
                success: true,
                message: 'Đăng nhập thành công.',
                data,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
