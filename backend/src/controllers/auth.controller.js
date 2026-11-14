const AuthService = require('../services/auth.service');
const OtpService = require('../services/otp.service');

class AuthController {
    // [POST] /api/auth/gui-otp-dang-ky
    static async guiOtpDangKy(req, res, next) {
        try {
            const { email } = req.body;
            const ketQua = await OtpService.guiOtpDangKy(email);
            res.json({
                success: true,
                ...ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/xac-thuc-otp
    static async xacThucOtp(req, res, next) {
        try {
            const { email, otp } = req.body;
            const ketQua = await OtpService.xacThucOtp(email, otp);
            res.json({
                success: true,
                ...ketQua,
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
                ...ketQua,
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
    // [POST] /api/auth/gui-otp-quen-mat-khau
    static async guiOtpQuenMatKhau(req, res, next) {
        try {
            const { email } = req.body;
            const ketQua = await OtpService.guiOtpQuenMatKhau(email);
            res.json({
                success: true,
                ...ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/auth/dat-lai-mat-khau
    static async datLaiMatKhau(req, res, next) {
        try {
            const ketQua = await AuthService.datLaiMatKhauQuen(req.body);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
