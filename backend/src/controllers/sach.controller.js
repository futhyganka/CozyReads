const Sach = require('../models/sach.model');
const ApiError = require('../api-error');

class SachController {
    // GET /api/sach
    async getAllSach(req, res, next) {
        try {
            const sachs = await Sach.find({});

            res.status(200).json({
                success: true,
                count: sachs.length,
                data: sachs,
            });
        } catch (error) {
            next(error)
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách sách.',
                error: error.message,
            });
        }
    }
}

module.exports = new SachController();
