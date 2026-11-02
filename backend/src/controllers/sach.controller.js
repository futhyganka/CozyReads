const { Sach } = require('../models');
const ApiError = require('../api-error');

class SachController {
    // [GET] /api/sach - Tra cứu & lọc sách
    static async getDanhSachSach(req, res, next) {
        try {
            const { search, dm, tg, nxb, page = 1, limit = 10 } = req.query;
            const filter = {};

            if (search) {
                filter.$text = { $search: search };
            }
            if (dm) filter.maDM = dm;
            if (tg) filter.maTG = tg;
            if (nxb) filter.maNXB = nxb;

            const skip = (Number(page) - 1) * Number(limit);
            const [sachs, total] = await Promise.all([
                Sach.find(filter)
                    .populate('maNXB', 'tenNxb maNXB')
                    .populate('maTG', 'tenTg maTG')
                    .populate('maDM', 'tenDm maDM')
                    .skip(skip)
                    .limit(Number(limit))
                    .sort({ createdAt: -1 }),
                Sach.countDocuments(filter),
            ]);

            res.json({
                success: true,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                data: sachs,
            });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /api/sach/:id
    static async getChiTietSach(req, res, next) {
        try {
            const sach = await Sach.findById(req.params.id)
                .populate('maNXB')
                .populate('maTG')
                .populate('maDM');
            if (!sach) {
                throw new ApiError(404, 'Không tìm thấy sách.');
            }
            res.json({ success: true, data: sach });
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/sach
    static async themSach(req, res, next) {
        try {
            const sach = new Sach(req.body);
            await sach.save();
            res.status(201).json({ success: true, data: sach });
        } catch (error) {
            next(error);
        }
    }

    // [PUT] /api/sach/:id
    static async capNhatSach(req, res, next) {
        try {
            const sach = await Sach.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });
            if (!sach) throw new ApiError(404, 'Không tìm thấy sách.');
            res.json({ success: true, data: sach });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/sach/:id
    static async xoaSach(req, res, next) {
        try {
            const sach = await Sach.findByIdAndDelete(req.params.id);
            if (!sach) throw new ApiError(404, 'Không tìm thấy sách.');
            res.json({ success: true, message: 'Đã xóa sách thành công.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SachController;
