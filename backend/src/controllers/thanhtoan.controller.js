const ThanhToanService = require('../services/thanhtoan.service');
const { ThanhToan } = require('../models');

class ThanhToanController {
    // [GET] /api/thanh-toan/doc-gia/:docGiaId
    static async getThanhToanCuaDocGia(req, res, next) {
        try {
            const danhSach = await ThanhToan.find({
                docGia: req.params.docGiaId,
            })
                .populate('theoDoiMuonSach')
                .populate('msnv', 'hoTen msnv')
                .sort({ createdAt: -1 });
            res.json({ success: true, data: danhSach });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/thanh-toan/xac-nhan
    static async xacNhanThanhToan(req, res, next) {
        try {
            const { maThanhToan, msnvId } = req.body;
            const ketQua = await ThanhToanService.xacNhanThanhToan({
                maThanhToan,
                msnvId,
            });
            res.json({
                success: true,
                message: 'Xác nhận thanh toán thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ThanhToanController;
