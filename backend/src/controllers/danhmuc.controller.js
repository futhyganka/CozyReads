const DanhMucService = require('../services/danhmuc.service');

class DanhMucController {
    // [GET] /api/danhmucs
    static async getDanhSachDanhMuc(req, res, next) {
        try {
            const { search, page, limit } = req.query;
            const ketQua = await DanhMucService.getDanhSachDanhMuc({
                search,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/danhmucs/:id
    static async getChiTietDanhMuc(req, res, next) {
        try {
            const dm = await DanhMucService.getChiTietDanhMuc(req.params.id);
            res.json({ success: true, data: dm });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/danhmucs
    static async themDanhMuc(req, res, next) {
        try {
            const dm = await DanhMucService.themDanhMuc(req.body);
            res.status(201).json({
                success: true,
                message: 'Thêm danh mục thành công.',
                data: dm,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/danhmucs/:id
    static async capNhatDanhMuc(req, res, next) {
        try {
            const dm = await DanhMucService.capNhatDanhMuc(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật danh mục thành công.',
                data: dm,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/danhmucs/:id
    static async xoaDanhMuc(req, res, next) {
        try {
            const ketQua = await DanhMucService.xoaDanhMuc(req.params.id);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = DanhMucController;
