const TacGiaService = require('../services/tacgia.service');

class TacGiaController {
    // [GET] /api/tacgias
    static async getDanhSachTacGia(req, res, next) {
        try {
            const { search, page, limit } = req.query;
            const ketQua = await TacGiaService.getDanhSachTacGia({
                search,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/tacgias/:id
    static async getChiTietTacGia(req, res, next) {
        try {
            const tg = await TacGiaService.getChiTietTacGia(req.params.id);
            res.json({ success: true, data: tg });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/tacgias
    static async themTacGia(req, res, next) {
        try {
            const tg = await TacGiaService.themTacGia(req.body);
            res.status(201).json({
                success: true,
                message: 'Thêm tác giả thành công.',
                data: tg,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/tacgias/:id
    static async capNhatTacGia(req, res, next) {
        try {
            const tg = await TacGiaService.capNhatTacGia(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật tác giả thành công.',
                data: tg,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/tacgias/:id
    static async xoaTacGia(req, res, next) {
        try {
            const ketQua = await TacGiaService.xoaTacGia(req.params.id);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TacGiaController;
