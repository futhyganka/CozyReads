const SachService = require('../services/sach.service');
const GoiYService = require('../services/goiy.service');
const { ROLES } = require('../constants/permissions');

class SachController {
    // [GET] /api/sachs/goi-y hoặc /api/sach/goi-y - Gợi ý sách thông minh KNN / Nổi bật
    static async getGoiYSach(req, res, next) {
        try {
            const isDocGia =
                req.user &&
                (req.user.role === ROLES.DOCGIA ||
                    req.user.maVaiTro === ROLES.DOCGIA) &&
                req.user._id;

            const docGiaId = isDocGia ? req.user._id : null;
            const limit = parseInt(req.query.limit, 10) || 10;

            const ketQua = await GoiYService.layGoiYSach({
                docGiaId,
                limit,
            });

            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/sachs hoặc /api/sach - Tra cứu, lọc, phân trang
    static async getDanhSachSach(req, res, next) {
        try {
            const ketQua = await SachService.getDanhSachSach(req.query);
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/sachs/:id
    static async getChiTietSach(req, res, next) {
        try {
            const sach = await SachService.getChiTietSach(req.params.id);
            res.json({ success: true, data: sach });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/sachs
    static async themSach(req, res, next) {
        try {
            const sach = await SachService.themSach(req.body);
            res.status(201).json({
                success: true,
                message: 'Thêm sách mới thành công.',
                data: sach,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/sachs/:id
    static async capNhatSach(req, res, next) {
        try {
            const sach = await SachService.capNhatSach(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật sách thành công.',
                data: sach,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/sachs/:id
    static async xoaSach(req, res, next) {
        try {
            const ketQua = await SachService.xoaSach(req.params.id);
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SachController;
