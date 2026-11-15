const DocGiaService = require('../services/docgia.service');
const OtpService = require('../services/otp.service');
const ApiError = require('../api-error');

function damBaoQuyenTruyCapDocGia(req, targetIdOrMa) {
    const callerRole = req.user?.role || req.user?.maVaiTro;
    // Nhân viên và Admin có quyền quản lý hồ sơ độc giả
    if (callerRole === 'nhanVien' || callerRole === 'quanTriVien') {
        return;
    }
    // Độc giả chỉ được thao tác trên đúng hồ sơ của chính mình
    const callerId = req.user?._id?.toString();
    const callerMa = req.user?.maDocGia?.toUpperCase();
    const target = String(targetIdOrMa || '').trim();

    if (
        callerRole === 'docGia' &&
        ((callerId && callerId === target) ||
            (callerMa && callerMa === target.toUpperCase()))
    ) {
        return;
    }
    throw new ApiError(
        403,
        'Bạn chỉ được phép xem hoặc cập nhật hồ sơ độc giả của chính mình.',
    );
}

class DocGiaController {
    // [POST] /api/docgias/:id/gui-otp-doi-email
    static async guiOtpDoiEmail(req, res, next) {
        try {
            damBaoQuyenTruyCapDocGia(req, req.params.id);
            const { emailMoi } = req.body;
            const ketQua = await OtpService.guiOtpDoiEmail(emailMoi, req.params.id);
            res.json({
                success: true,
                ...ketQua,
            });
        } catch (error) {
            next(error);
        }
    }
    // [GET] /api/docgias hoặc /api/doc-gia
    static async getDanhSachDocGia(req, res, next) {
        try {
            const { search, loaiDocGia, trangThai, page, limit } = req.query;
            const ketQua = await DocGiaService.getDanhSachDocGia({
                search,
                loaiDocGia,
                trangThai,
                page,
                limit,
            });
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/docgias/:id hoặc /api/doc-gia/:id
    static async getChiTietDocGia(req, res, next) {
        try {
            damBaoQuyenTruyCapDocGia(req, req.params.id);
            const docGia = await DocGiaService.getChiTietDocGia(req.params.id);
            res.json({ success: true, data: docGia });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/docgias (Tạo tại quầy)
    static async taoDocGia(req, res, next) {
        try {
            const docGia = await DocGiaService.taoDocGiaTaiQuay(req.body);
            res.status(201).json({
                success: true,
                message: 'Tạo hồ sơ độc giả thành công.',
                data: docGia,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/docgias/:id
    static async capNhatDocGia(req, res, next) {
        try {
            damBaoQuyenTruyCapDocGia(req, req.params.id);
            const docGia = await DocGiaService.capNhatDocGia(
                req.params.id,
                req.body,
            );
            res.json({
                success: true,
                message: 'Cập nhật độc giả thành công.',
                data: docGia,
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/docgias/:id
    static async xoaDocGia(req, res, next) {
        try {
            const ketQua = await DocGiaService.xoaDocGia(req.params.id);
            res.json({ success: true, ...ketQua });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/docgias/:id/doi-mat-khau
    static async doiMatKhau(req, res, next) {
        try {
            damBaoQuyenTruyCapDocGia(req, req.params.id);
            const ketQua = await DocGiaService.doiMatKhau(
                req.params.id,
                req.body,
            );
            res.json(ketQua);
        } catch (error) {
            next(error);
        }
    }

    // [PATCH] /api/docgias/:id/trang-thai
    static async capNhatTrangThaiThe(req, res, next) {
        try {
            const { trangThai } = req.body;
            const docGia = await DocGiaService.capNhatTrangThaiThe(
                req.params.id,
                trangThai,
            );
            res.json({
                success: true,
                message: 'Cập nhật trạng thái thẻ thành công.',
                data: docGia,
            });
        } catch (error) {
            next(error);
        }
    }

    // [PATCH] /api/docgias/:id/diem
    static async capNhatDiem(req, res, next) {
        try {
            const { diem } = req.body;
            const docGia = await DocGiaService.capNhatDiem(req.params.id, diem);
            res.json({
                success: true,
                message: 'Cập nhật điểm độc giả thành công.',
                data: docGia,
            });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/docgias/:id/gia-han
    static async taoKhoanThanhToanGiaHan(req, res, next) {
        try {
            damBaoQuyenTruyCapDocGia(req, req.params.id);
            const { goiGiaHan, phuongThuc } = req.body;
            const thanhToan = await DocGiaService.taoKhoanThanhToanGiaHan({
                docGiaId: req.params.id,
                goiGiaHan,
                phuongThuc,
            });
            res.status(201).json({
                success: true,
                message: 'Tạo yêu cầu thanh toán gia hạn thành công.',
                data: thanhToan,
            });
        } catch (error) {
            next(error);
        }
    }

    // Tương thích cũ
    static async getThongTinDocGia(req, res, next) {
        return DocGiaController.getChiTietDocGia(req, res, next);
    }
}

module.exports = DocGiaController;
