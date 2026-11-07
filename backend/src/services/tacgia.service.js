const { TacGia, Sach } = require('../models');
const ApiError = require('../api-error');

class TacGiaService {
    static async taoMaTacGia() {
        const prefix = 'TG';
        const tacGias = await TacGia.find({}, { maTG: 1, _id: 0 }).lean();
        let maxNumber = 0;
        for (const tg of tacGias) {
            const match = tg.maTG?.match(/^TG(\d+)$/);
            if (match) {
                maxNumber = Math.max(maxNumber, Number(match[1]));
            }
        }
        return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
    }

    static async themTacGia(data) {
        if (!data.tenTg || !data.tenTg.trim()) {
            throw new ApiError(400, 'Tên tác giả là bắt buộc.');
        }

        const maTG = data.maTG?.trim().toUpperCase() || (await this.taoMaTacGia());
        const tonTai = await TacGia.findOne({ maTG });
        if (tonTai) {
            throw new ApiError(400, `Mã tác giả [${maTG}] đã tồn tại.`);
        }

        const tacGia = new TacGia({
            maTG,
            tenTg: data.tenTg.trim(),
            quocTich: data.quocTich || 'Việt Nam',
        });
        await tacGia.save();
        return tacGia;
    }

    static async getDanhSachTacGia({ search, page = 1, limit = 10 }) {
        const filter = {};
        if (search) {
            filter.$or = [
                { maTG: new RegExp(search, 'i') },
                { tenTg: new RegExp(search, 'i') },
                { quocTich: new RegExp(search, 'i') },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [tacGias, total] = await Promise.all([
            TacGia.find(filter)
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            TacGia.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: tacGias,
        };
    }

    static async getChiTietTacGia(idOrMa) {
        let tacGia = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            tacGia = await TacGia.findById(idOrMa);
        }
        if (!tacGia) {
            tacGia = await TacGia.findOne({ maTG: idOrMa.toUpperCase() });
        }
        if (!tacGia) {
            throw new ApiError(404, 'Không tìm thấy tác giả.');
        }
        return tacGia;
    }

    static async capNhatTacGia(id, data) {
        const tacGia = await TacGia.findById(id);
        if (!tacGia) {
            throw new ApiError(404, 'Không tìm thấy tác giả.');
        }

        if (data.tenTg) tacGia.tenTg = data.tenTg.trim();
        if (data.quocTich) tacGia.quocTich = data.quocTich.trim();

        await tacGia.save();
        return tacGia;
    }

    static async xoaTacGia(id) {
        const tacGia = await TacGia.findById(id);
        if (!tacGia) {
            throw new ApiError(404, 'Không tìm thấy tác giả.');
        }

        const coSachThamChieu = await Sach.exists({ tacGia: id });
        if (coSachThamChieu) {
            throw new ApiError(
                400,
                'Không thể xóa tác giả vì đang có đầu sách liên kết đến tác giả này.',
            );
        }

        await TacGia.findByIdAndDelete(id);
        return { success: true, message: 'Đã xóa tác giả thành công.' };
    }
}

module.exports = TacGiaService;
