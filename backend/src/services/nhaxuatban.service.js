const { NhaXuatBan, Sach } = require('../models');
const ApiError = require('../api-error');

class NhaXuatBanService {
    static async taoMaNhaXuatBan() {
        const prefix = 'NXB';
        const nxbs = await NhaXuatBan.find({}, { maNXB: 1, _id: 0 }).lean();
        let maxNumber = 0;
        for (const n of nxbs) {
            const match = n.maNXB?.match(/^NXB(\d+)$/);
            if (match) {
                maxNumber = Math.max(maxNumber, Number(match[1]));
            }
        }
        return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
    }

    static async themNhaXuatBan(data) {
        if (!data.tenNxb || !data.tenNxb.trim()) {
            throw new ApiError(400, 'Tên nhà xuất bản là bắt buộc.');
        }

        const maNXB = data.maNXB?.trim().toUpperCase() || (await this.taoMaNhaXuatBan());
        const tonTai = await NhaXuatBan.findOne({ maNXB });
        if (tonTai) {
            throw new ApiError(400, `Mã nhà xuất bản [${maNXB}] đã tồn tại.`);
        }

        const nxb = new NhaXuatBan({
            maNXB,
            tenNxb: data.tenNxb.trim(),
            diaChi: data.diaChi || '',
        });
        await nxb.save();
        return nxb;
    }

    static async getDanhSachNhaXuatBan({ search, page = 1, limit = 10 }) {
        const filter = {};
        if (search) {
            filter.$or = [
                { maNXB: new RegExp(search, 'i') },
                { tenNxb: new RegExp(search, 'i') },
                { diaChi: new RegExp(search, 'i') },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [nxbs, total] = await Promise.all([
            NhaXuatBan.find(filter)
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            NhaXuatBan.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: nxbs,
        };
    }

    static async getChiTietNhaXuatBan(idOrMa) {
        let nxb = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            nxb = await NhaXuatBan.findById(idOrMa);
        }
        if (!nxb) {
            nxb = await NhaXuatBan.findOne({ maNXB: idOrMa.toUpperCase() });
        }
        if (!nxb) {
            throw new ApiError(404, 'Không tìm thấy nhà xuất bản.');
        }
        return nxb;
    }

    static async capNhatNhaXuatBan(id, data) {
        const nxb = await NhaXuatBan.findById(id);
        if (!nxb) {
            throw new ApiError(404, 'Không tìm thấy nhà xuất bản.');
        }

        if (data.tenNxb) nxb.tenNxb = data.tenNxb.trim();
        if (data.diaChi !== undefined) nxb.diaChi = data.diaChi;

        await nxb.save();
        return nxb;
    }

    static async xoaNhaXuatBan(id) {
        const nxb = await NhaXuatBan.findById(id);
        if (!nxb) {
            throw new ApiError(404, 'Không tìm thấy nhà xuất bản.');
        }

        const coSachThamChieu = await Sach.exists({ maNXB: id });
        if (coSachThamChieu) {
            throw new ApiError(
                400,
                'Không thể xóa nhà xuất bản vì đang có sách thuộc nhà xuất bản này.',
            );
        }

        await NhaXuatBan.findByIdAndDelete(id);
        return { success: true, message: 'Đã xóa nhà xuất bản thành công.' };
    }
}

module.exports = NhaXuatBanService;
