const NhaXuatBanService = require('../services/nhaxuatban.service');

class NhaXuatBanController {
    // [GET] /api/nhaxuatbans
    static async getDanhSachNhaXuatBan(req, res, next) {
        try {
            const { search, page, limit } = req.query;
            const ketQua = await NhaXuatBanService.getDanhSachNhaXuatBan({
                search,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/nhaxuatbans/:id
    static async getChiTietNhaXuatBan(req, res, next) {
        try {
            const nxb = await NhaXuatBanService.getChiTietNhaXuatBan(
                req.params.id,
            );
            res.json({ success: true, data: nxb });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/nhaxuatbans
    static async themNhaXuatBan(req, res, next) {
        try {
            const nxb = await NhaXuatBanService.themNhaXuatBan(req.body);
            res.status(201).json({
                success: true,
                message: 'Thêm nhà xuất bản thành công.',
                data: nxb,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/nhaxuatbans/:id
    static async capNhatNhaXuatBan(req, res, next) {
        try {
            const nxb = await NhaXuatBanService.capNhatNhaXuatBan(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật nhà xuất bản thành công.',
                data: nxb,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/nhaxuatbans/:id
    static async xoaNhaXuatBan(req, res, next) {
        try {
            const ketQua = await NhaXuatBanService.xoaNhaXuatBan(req.params.id);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = NhaXuatBanController;
