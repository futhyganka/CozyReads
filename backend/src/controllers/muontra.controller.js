const MuonTraService = require('../services/muontra.service');
const { TheoDoiMuonSach } = require('../models');

class MuonTraController {
    // [POST] /api/muon-tra/kiem-tra
    static async kiemTraDieuKien(req, res, next) {
        try {
            const { docGiaId, sachId } = req.body;
            const ketQua = await MuonTraService.kiemTraDieuKienMuon(
                docGiaId,
                sachId,
            );
            res.json({
                success: true,
                message: 'Đủ điều kiện mượn sách.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/muon-tra
    static async taoPhieuMuon(req, res, next) {
        try {
            const { docGiaId, sachId, msnvMuonId, soNgayMuon } = req.body;
            const phieuMuon = await MuonTraService.taoPhieuMuon({
                docGiaId,
                sachId,
                msnvMuonId,
                soNgayMuon,
            });
            res.status(201).json({
                success: true,
                message: 'Tạo phiếu mượn sách thành công.',
                data: phieuMuon,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/muon-tra/tra-sach
    static async traSach(req, res, next) {
        try {
            const { luotMuonId, msnvTraId, ngayTra } = req.body;
            const ketQua = await MuonTraService.traSach({
                luotMuonId,
                msnvTraId,
                ngayTra,
            });
            res.json({
                success: true,
                message: 'Tiếp nhận trả sách thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/muon-tra/bao-mat
    static async baoMatSach(req, res, next) {
        try {
            const { luotMuonId, msnvGhiNhanId, ngayBaoMat } = req.body;
            const ketQua = await MuonTraService.baoMatSach({
                luotMuonId,
                msnvGhiNhanId,
                ngayBaoMat,
            });
            res.json({
                success: true,
                message:
                    'Ghi nhận báo mất sách và tạo khoản bồi thường thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/muon-tra/lich-su/:docGiaId
    static async getLichSuMuon(req, res, next) {
        try {
            const danhSach = await TheoDoiMuonSach.find({
                docGia: req.params.docGiaId,
            })
                .populate('sach')
                .populate('msnvMuon', 'hoTen msnv')
                .populate('msnvTra', 'hoTen msnv')
                .sort({ createdAt: -1 });
            res.json({ success: true, data: danhSach });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = MuonTraController;
