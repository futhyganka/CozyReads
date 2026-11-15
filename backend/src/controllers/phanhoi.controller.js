const PhanHoiService = require('../services/phanhoi.service');
const ApiError = require('../api-error');
const { ROLES } = require('../constants/permissions');
const { LOAI_PHAN_HOI } = require('../constants/business-rules');

class PhanHoiController {
    /**
     * Độc giả gửi yêu cầu Liên hệ
     * POST /api/phanhois/lien-he
     */
    static async guiLienHe(req, res, next) {
        try {
            if (!req.user || req.user.role !== ROLES.DOCGIA) {
                throw new ApiError(
                    403,
                    'Chỉ tài khoản Độc giả mới có thể gửi yêu cầu liên hệ trực tuyến.',
                );
            }

            const result = await PhanHoiService.taoLienHe({
                docGiaId: req.user._id,
                noiDung: req.body.noiDung,
            });

            res.status(201).json({
                success: true,
                message: 'Đã gửi yêu cầu liên hệ thành công. Thư viện sẽ phản hồi qua Email của bạn.',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Độc giả hoặc Khách gửi Góp ý (nếu maDocGia = null thì hiển thị Ẩn danh)
     * POST /api/phanhois/gop-y
     */
    static async guiGopY(req, res, next) {
        try {
            let docGiaId = null;
            // Nếu người gửi đang đăng nhập vai trò Độc giả và không chọn gửi ẩn danh
            if (req.user && req.user.role === ROLES.DOCGIA && !req.body.guiAnDanh) {
                docGiaId = req.user._id;
            }

            const result = await PhanHoiService.taoGopY({
                docGiaId,
                noiDung: req.body.noiDung,
            });

            res.status(201).json({
                success: true,
                message: 'Cảm ơn bạn đã gửi ý kiến góp ý cho Thư viện CozyReads.',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Độc giả xem lịch sử Liên hệ / Góp ý của chính mình
     * GET /api/phanhois/cua-toi
     */
    static async getDanhSachCuaToi(req, res, next) {
        try {
            if (!req.user || req.user.role !== ROLES.DOCGIA) {
                throw new ApiError(
                    403,
                    'Chỉ tài khoản Độc giả mới có thể xem lịch sử liên hệ của mình.',
                );
            }

            const result = await PhanHoiService.getDanhSachPhanHoi({
                loai: req.query.loai,
                trangThai: req.query.trangThai,
                docGiaId: req.user._id,
                page: req.query.page,
                limit: req.query.limit,
            });

            res.json({
                success: true,
                ...result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin lấy danh sách phản hồi (hỗ trợ lọc loai = lienHe hoặc gopY)
     * GET /api/phanhois
     */
    static async getDanhSachPhanHoi(req, res, next) {
        try {
            const result = await PhanHoiService.getDanhSachPhanHoi(req.query);
            res.json({
                success: true,
                ...result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin lấy danh sách Quản lý Liên hệ (chỉ lấy loai = lienHe)
     * GET /api/phanhois/lien-he
     */
    static async getDanhSachLienHe(req, res, next) {
        try {
            const result = await PhanHoiService.getDanhSachPhanHoi({
                ...req.query,
                loai: LOAI_PHAN_HOI.LIEN_HE,
            });
            res.json({
                success: true,
                ...result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin lấy danh sách Quản lý Góp ý (chỉ lấy loai = gopY)
     * GET /api/phanhois/gop-y
     */
    static async getDanhSachGopY(req, res, next) {
        try {
            const result = await PhanHoiService.getDanhSachPhanHoi({
                ...req.query,
                loai: LOAI_PHAN_HOI.GOP_Y,
            });
            res.json({
                success: true,
                ...result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin xem chi tiết 1 bản ghi Liên hệ hoặc Góp ý
     * GET /api/phanhois/:id
     */
    static async getChiTietPhanHoi(req, res, next) {
        try {
            const result = await PhanHoiService.getChiTietPhanHoi(
                req.params.id,
                req.query.loai || null,
            );
            res.json({
                success: true,
                data: result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin tiếp nhận hoặc cập nhật trạng thái (choXuLy -> dangXuLy, hoặc gopY -> daXuLy)
     * PATCH /api/phanhois/:id/trang-thai
     */
    static async capNhatTrangThai(req, res, next) {
        try {
            const result = await PhanHoiService.capNhatTrangThai(req.params.id, {
                trangThai: req.body.trangThai,
                msnvId: req.user._id,
                expectedLoai: req.body.loai || null,
            });
            res.json({
                success: true,
                message: 'Đã cập nhật trạng thái xử lý thành công.',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Nhân viên / Admin gửi phản hồi Liên hệ qua Email
     * POST /api/phanhois/:id/phan-hoi
     */
    static async guiPhanHoiLienHe(req, res, next) {
        try {
            const result = await PhanHoiService.guiPhanHoiLienHeQuaEmail(
                req.params.id,
                {
                    noiDungPhanHoi: req.body.noiDungPhanHoi,
                    msnvId: req.user._id,
                },
            );
            res.json({
                success: true,
                message: 'Đã gửi phản hồi qua Email tới độc giả và hoàn tất xử lý liên hệ.',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = PhanHoiController;
