const AuthService = require('../services/auth.service');
const { TaiKhoan } = require('../models');
const ApiError = require('../api-error');

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

    // [POST] /api/auth/dang-ky-nhan-vien
    static async dangKyNhanVien(req, res, next) {
        try {
            const ketQua = await AuthService.dangKyNhanVien(req.body);
            res.status(201).json({
                success: true,
                message: 'Đăng ký tài khoản nhân viên thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dang-nhap
    static async dangNhap(req, res, next) {
        try {
            const { email, password } = req.body;
            const taiKhoan = await TaiKhoan.findOne({
                email: email.toLowerCase(),
            });
            if (!taiKhoan || taiKhoan.password !== password) {
                throw new ApiError(401, 'Email hoặc mật khẩu không chính xác.');
            }
            if (taiKhoan.trangThai === 'tamKhoa') {
                throw new ApiError(403, 'Tài khoản đang bị tạm khóa.');
            }
            if (taiKhoan.trangThai === 'daHuy') {
                throw new ApiError(403, 'Tài khoản đã bị hủy.');
            }

            res.json({
                success: true,
                message: 'Đăng nhập thành công.',
                data: {
                    _id: taiKhoan._id,
                    email: taiKhoan.email,
                    maVaiTro: taiKhoan.maVaiTro,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
