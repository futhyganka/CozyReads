const { DanhMuc, Sach } = require('../models');
const ApiError = require('../api-error');

class DanhMucService {
    static async taoMaDanhMuc() {
        const prefix = 'DM';
        const danhMucs = await DanhMuc.find({}, { maDM: 1, _id: 0 }).lean();
        let maxNumber = 0;
        for (const dm of danhMucs) {
            const match = dm.maDM?.match(/^DM(\d+)$/);
            if (match) {
                maxNumber = Math.max(maxNumber, Number(match[1]));
            }
        }
        return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
    }

    static async themDanhMuc(data) {
        if (!data.tenDm || !data.tenDm.trim()) {
            throw new ApiError(400, 'Tên danh mục là bắt buộc.');
        }

        const maDM = data.maDM?.trim().toUpperCase() || (await this.taoMaDanhMuc());
        const tonTai = await DanhMuc.findOne({ maDM });
        if (tonTai) {
            throw new ApiError(400, `Mã danh mục [${maDM}] đã tồn tại.`);
        }

        const danhMuc = new DanhMuc({
            maDM,
            tenDm: data.tenDm.trim(),
            moTa: data.moTa || '',
        });
        await danhMuc.save();
        return danhMuc;
    }

    static async getDanhSachDanhMuc({ search, page = 1, limit = 10 }) {
        const filter = {};
        if (search) {
            filter.$or = [
                { maDM: new RegExp(search, 'i') },
                { tenDm: new RegExp(search, 'i') },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [danhMucs, total] = await Promise.all([
            DanhMuc.find(filter)
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            DanhMuc.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: danhMucs,
        };
    }

    static async getChiTietDanhMuc(idOrMa) {
        let dm = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            dm = await DanhMuc.findById(idOrMa);
        }
        if (!dm) {
            dm = await DanhMuc.findOne({ maDM: idOrMa.toUpperCase() });
        }
        if (!dm) {
            throw new ApiError(404, 'Không tìm thấy danh mục.');
        }
        return dm;
    }

    static async capNhatDanhMuc(id, data) {
        const dm = await DanhMuc.findById(id);
        if (!dm) {
            throw new ApiError(404, 'Không tìm thấy danh mục.');
        }

        if (data.tenDm) dm.tenDm = data.tenDm.trim();
        if (data.moTa !== undefined) dm.moTa = data.moTa;

        await dm.save();
        return dm;
    }

    static async xoaDanhMuc(id) {
        const dm = await DanhMuc.findById(id);
        if (!dm) {
            throw new ApiError(404, 'Không tìm thấy danh mục.');
        }

        const coSachThamChieu = await Sach.exists({ danhMuc: id });
        if (coSachThamChieu) {
            throw new ApiError(
                400,
                'Không thể xóa danh mục vì đang có sách thuộc danh mục này.',
            );
        }

        await DanhMuc.findByIdAndDelete(id);
        return { success: true, message: 'Đã xóa danh mục thành công.' };
    }
}

module.exports = DanhMucService;
