const NhanVienService = require('../services/nhanvien.service');
const ApiError = require('../api-error');

function damBaoQuyenTruyCapNhanVien(req, targetIdOrMsnv) {
    const callerRole = req.user?.role || req.user?.maVaiTro;
    // Admin có toàn quyền quản lý nhân viên
    if (callerRole === 'quanTriVien') {
        return;
    }
    // Nhân viên chỉ được xem/sửa đúng hồ sơ của chính mình
    const callerId = req.user?._id?.toString();
    const callerMsnv = req.user?.msnv?.toUpperCase();
    const target = String(targetIdOrMsnv || '').trim();

    if (
        callerRole === 'nhanVien' &&
        ((callerId && callerId === target) ||
            (callerMsnv && callerMsnv === target.toUpperCase()))
    ) {
        return;
    }
    throw new ApiError(
        403,
        'Bạn không có quyền xem hoặc chỉnh sửa thông tin của nhân viên khác.',
    );
}

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
            damBaoQuyenTruyCapNhanVien(req, req.params.id);
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
            damBaoQuyenTruyCapNhanVien(req, req.params.id);
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
            damBaoQuyenTruyCapNhanVien(req, req.params.id);
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
