const KyThanhToanService = require('../services/kythanhtoan.service');

class KyThanhToanController {
    // [GET] /api/kythanhtoans
    static async getDanhSachThanhToan(req, res, next) {
        try {
            const { docGiaId, trangThai, loai, phuongThuc, search, page, limit } = req.query;
            const ketQua = await KyThanhToanService.getDanhSachThanhToan({
                docGiaId,
                trangThai,
                loai,
                phuongThuc,
                search,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/kythanhtoans/:id
    static async getChiTietThanhToan(req, res, next) {
        try {
            const tt = await KyThanhToanService.getChiTietThanhToan(
                req.params.id,
            );
            const callerRole = req.user?.role || req.user?.maVaiTro;
            const callerId = req.user?._id?.toString();
            const ownerId = (tt.maDocGia?._id || tt.maDocGia)?.toString();

            if (callerRole === 'docGia' && callerId && ownerId !== callerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem giao dịch thanh toán của độc giả khác.',
                });
            }

            res.json({ success: true, data: tt });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/kythanhtoans
    static async taoThanhToan(req, res, next) {
        try {
            let data = { ...req.body };
            const callerRole = req.user?.role || req.user?.maVaiTro;
            if (callerRole === 'docGia') {
                data.maDocGia = req.user._id;
                delete data.docGia;
            }
            if (req.user?.msnv && !data.msnv) {
                data.msnv = req.user._id;
            }

            const tt = await KyThanhToanService.taoThanhToan(data);
            res.status(201).json({
                success: true,
                message: 'Tạo giao dịch thanh toán thành công.',
                data: tt,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/kythanhtoans/:id
    static async capNhatThanhToan(req, res, next) {
        try {
            const callerRole = req.user?.role || req.user?.maVaiTro;
            const callerId = req.user?._id?.toString();

            if (callerRole === 'docGia') {
                const ttHienTai = await KyThanhToanService.getChiTietThanhToan(req.params.id);
                const ownerId = (ttHienTai.maDocGia?._id || ttHienTai.maDocGia)?.toString();
                if (callerId && ownerId !== callerId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền cập nhật giao dịch thanh toán của độc giả khác.',
                    });
                }
            }

            const tt = await KyThanhToanService.capNhatThanhToan(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật giao dịch thành công.',
                data: tt,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/kythanhtoans/xac-nhan hoặc /api/kythanhtoans/:id/xac-nhan
    static async xacNhanThanhToan(req, res, next) {
        try {
            const thanhToanId = req.params.id || req.body.thanhToanId;
            const maThanhToan = req.body.maThanhToan;
            let msnvId = req.body.msnvId;
            if (!msnvId && req.user?.msnv) {
                msnvId = req.user._id;
            }

            const ketQua = await KyThanhToanService.xacNhanThanhToan({
                thanhToanId,
                maThanhToan,
                msnvId,
                ngayThanhToan: req.body.ngayThanhToan,
            });
            res.json({
                success: true,
                message: 'Xác nhận thanh toán hợp lệ thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/kythanhtoans/:id/huy
    static async huyThanhToan(req, res, next) {
        try {
            let msnvId = req.body.msnvId;
            if (!msnvId && req.user?.msnv) {
                msnvId = req.user._id;
            }

            const ketQua = await KyThanhToanService.huyThanhToan(
                req.params.id,
                req.body.lyDo,
                msnvId,
                req.body.ngayHuy || new Date(),
            );
            res.json({
                success: true,
                message: 'Hủy giao dịch thanh toán thành công.',
                data: ketQua,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/kythanhtoans/:id
    static async xoaThanhToan(req, res, next) {
        try {
            const ketQua = await KyThanhToanService.xoaThanhToan(req.params.id);
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/kythanhtoans/doc-gia/:docGiaId
    static async getThanhToanCuaDocGia(req, res, next) {
        try {
            const docGiaId = req.params.docGiaId;
            const callerRole = req.user?.role || req.user?.maVaiTro;
            const callerId = req.user?._id?.toString();

            if (callerRole === 'docGia' && callerId && callerId !== docGiaId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem lịch sử thanh toán của độc giả khác.',
                });
            }

            const ketQua = await KyThanhToanService.getDanhSachThanhToan({
                docGiaId,
                limit: 100,
            });
            res.json({ success: true, data: ketQua.data });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = KyThanhToanController;
