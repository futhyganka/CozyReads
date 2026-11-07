const MuonTraService = require('../services/muontra.service');

class MuonTraController {
    // [GET] /api/theodoimuonsachs - Lấy danh sách phiếu mượn
    static async getDanhSachPhieuMuon(req, res, next) {
        try {
            const { docGiaId, sachId, trangThai, page, limit } = req.query;
            const ketQua = await MuonTraService.getDanhSachPhieuMuon({
                docGiaId,
                sachId,
                trangThai,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/theodoimuonsachs/:id - Lấy chi tiết phiếu mượn
    static async getChiTietPhieuMuon(req, res, next) {
        try {
            const phieuMuon = await MuonTraService.getChiTietPhieuMuon(
                req.params.id,
            );
            res.json({ success: true, data: phieuMuon });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/theodoimuonsachs/kiem-tra
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

    // [POST] /api/theodoimuonsachs (Tạo phiếu mượn tại quầy hoặc tạo yêu cầu giữ sách trực tuyến)
    static async taoPhieuMuon(req, res, next) {
        try {
            let { docGiaId, sachId, msnvMuonId, soNgayMuon, maDocGia, maSach } = req.body;
            const dg = docGiaId || maDocGia;
            const s = sachId || maSach;
            const callerRole = req.user?.role || req.user?.maVaiTro;

            // Nếu người gọi là Reader -> Chỉ được tạo yêu cầu giữ sách trực tuyến (trong 24h)
            if (callerRole === 'docGia') {
                const targetDocGia = req.user?._id || dg;
                const phieuGiuSach = await MuonTraService.taoYeuCauGiuSachOnline({
                    docGiaId: targetDocGia,
                    sachId: s,
                });
                return res.status(201).json({
                    success: true,
                    message: 'Đã tạo yêu cầu giữ sách trực tuyến thành công. Vui lòng đến trực tiếp quầy thư viện trong 24h để hoàn tất thủ tục mượn.',
                    data: phieuGiuSach,
                });
            }

            // Nếu người gọi là Librarian / Admin -> Tạo phiếu mượn chính thức tại quầy
            if (!msnvMuonId && req.user?.msnv) {
                msnvMuonId = req.user._id;
            }

            const phieuMuon = await MuonTraService.taoPhieuMuon({
                docGiaId: dg,
                sachId: s,
                msnvMuonId,
                soNgayMuon,
            });
            res.status(201).json({
                success: true,
                message: 'Tạo phiếu mượn sách tại quầy thành công.',
                data: phieuMuon,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/theodoimuonsachs/:id/xac-nhan-quay (Nhân viên xác nhận giữ sách thành mượn chính thức)
    static async xacNhanMuonTaiQuay(req, res, next) {
        try {
            const luotMuonId = req.params.id;
            let msnvMuonId = req.body.msnvMuonId;
            if (!msnvMuonId && req.user?.msnv) {
                msnvMuonId = req.user._id;
            }
            const phieuMuon = await MuonTraService.xacNhanMuonTaiQuay({
                luotMuonId,
                msnvMuonId,
                soNgayMuon: req.body.soNgayMuon || 14,
            });
            res.json({
                success: true,
                message: 'Đã xác nhận mượn sách trực tiếp tại quầy thành công.',
                data: phieuMuon,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/theodoimuonsachs/:id
    static async capNhatPhieuMuon(req, res, next) {
        try {
            const phieuMuon = await MuonTraService.capNhatPhieuMuon(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật phiếu mượn thành công.',
                data: phieuMuon,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/theodoimuonsachs/:id
    static async xoaPhieuMuon(req, res, next) {
        try {
            const ketQua = await MuonTraService.xoaPhieuMuon(req.params.id);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/theodoimuonsachs/tra-sach hoặc /api/theodoimuonsachs/:id/tra-sach
    static async traSach(req, res, next) {
        try {
            const luotMuonId = req.params.id || req.body.luotMuonId;
            let msnvTraId = req.body.msnvTraId;
            if (!msnvTraId && req.user?.msnv) {
                msnvTraId = req.user._id;
            }

            const ketQua = await MuonTraService.traSach({
                luotMuonId,
                msnvTraId,
                ngayTra: req.body.ngayTra,
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

    // [POST] /api/theodoimuonsachs/bao-mat hoặc /api/theodoimuonsachs/:id/bao-mat
    static async baoMatSach(req, res, next) {
        try {
            const luotMuonId = req.params.id || req.body.luotMuonId;
            let msnvGhiNhanId = req.body.msnvGhiNhanId;
            if (!msnvGhiNhanId && req.user?.msnv) {
                msnvGhiNhanId = req.user._id;
            }

            const ketQua = await MuonTraService.baoMatSach({
                luotMuonId,
                msnvGhiNhanId,
                ngayBaoMat: req.body.ngayBaoMat,
                ghiChu: req.body.ghiChu,
            });
            res.json({
                success: true,
                message:
                    'Ghi nhận báo mất/hỏng sách và tạo khoản bồi thường thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/theodoimuonsachs/lich-su/:docGiaId
    static async getLichSuMuon(req, res, next) {
        try {
            const targetDocGiaId = req.params.docGiaId;
            const callerRole = req.user?.role || req.user?.maVaiTro;
            const callerId = req.user?._id?.toString();

            // Nếu người gọi là Reader -> chỉ được xem lịch sử của chính mình
            if (callerRole === 'docGia' && callerId && callerId !== targetDocGiaId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem lịch sử mượn sách của độc giả khác.',
                });
            }

            const ketQua = await MuonTraService.getDanhSachPhieuMuon({
                docGiaId: targetDocGiaId,
                limit: 100,
            });
            res.json({ success: true, data: ketQua.data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = MuonTraController;
