const NhanVienService = require('../services/nhanvien.service');

class NhanVienController {
    // [GET] /api/nhanviens
    static async getDanhSachNhanVien(req, res, next) {
        try {
            const { search, chucVu, page, limit } = req.query;
            const ketQua = await NhanVienService.getDanhSachNhanVien({
                search,
                chucVu,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/nhanviens/:id
    static async getChiTietNhanVien(req, res, next) {
        try {
            const nv = await NhanVienService.getChiTietNhanVien(req.params.id);
            res.json({ success: true, data: nv });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/nhanviens
    static async taoNhanVien(req, res, next) {
        try {
            const nv = await NhanVienService.taoNhanVien(req.body);
            res.status(201).json({
                success: true,
                message: 'Tạo nhân viên thành công.',
                data: nv,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/nhanviens/:id
    static async capNhatNhanVien(req, res, next) {
        try {
            const callerRole = req.user?.role || req.user?.maVaiTro;
            const nv = await NhanVienService.capNhatNhanVien(
                req.params.id,
                req.body,
                callerRole,
            );
            res.json({
                success: true,
                message: 'Cập nhật nhân viên thành công.',
                data: nv,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/nhanviens/:id
    static async xoaNhanVien(req, res, next) {
        try {
            const ketQua = await NhanVienService.xoaNhanVien(req.params.id);
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/nhanviens/:id/doi-mat-khau
    static async doiMatKhau(req, res, next) {
        try {
            const ketQua = await NhanVienService.doiMatKhau(
                req.params.id,
                req.body,
            );
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = NhanVienController;
