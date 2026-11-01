const { DocGia } = require('../models');
const DocGiaService = require('../services/docgia.service');
const DiemService = require('../services/diem.service');
const ApiError = require('../api-error');

class DocGiaController {
    // [GET] /api/doc-gia/:id
    static async getThongTinDocGia(req, res, next) {
        try {
            const docGia = await DocGia.findById(req.params.id).populate(
                '_id',
                'email avatar',
            );
            if (!docGia) throw new ApiError(404, 'Không tìm thấy độc giả.');

            const soSachToiDa = DiemService.tinhSoSachToiDa(docGia.diemDocGia);
            res.json({
                success: true,
                data: {
                    ...docGia.toObject(),
                    soSachToiDa,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/doc-gia/:id/gia-han
    static async yeuCauGiaHan(req, res, next) {
        try {
            const { goiGiaHan, phuongThuc } = req.body;
            const thanhToan = await DocGiaService.taoYeuCauGiaHanThe({
                docGiaId: req.params.id,
                goiGiaHan,
                phuongThuc,
            });
            res.status(201).json({
                success: true,
                message: 'Tạo yêu cầu gia hạn thẻ thành công.',
                data: thanhToan,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = DocGiaController;
