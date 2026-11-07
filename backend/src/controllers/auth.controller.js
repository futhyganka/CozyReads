const AuthService = require('../services/auth.service');

class AuthController {
    // [POST] /api/auth/dang-ky-doc-gia
    static async dangKyDocGia(req, res, next) {
        try {
            const ketQua = await AuthService.dangKyDocGia(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản độc giả thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-nhap-doc-gia
    static async dangNhapDocGia(req, res, next) {
        try {
            const ketQua = await AuthService.dangNhapDocGia(req.body);
            res.json({
                success: true,
                message: 'Đăng nhập độc giả thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-nhap-nhan-vien
    static async dangNhapNhanVien(req, res, next) {
        try {
            const ketQua = await AuthService.dangNhapNhanVien(req.body);
            res.json({
                success: true,
                message: 'Đăng nhập nhân viên thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-nhap (chung)
    static async dangNhap(req, res, next) {
        try {
            const ketQua = await AuthService.dangNhap(req.body);
            res.json({
                success: true,
                message: 'Đăng nhập thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
