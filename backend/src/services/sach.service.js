const { Sach, TacGia, DanhMuc, NhaXuatBan, TheoDoiMuonSach } = require('../models');
const ApiError = require('../api-error');

class SachService {
    static extractObjectId(val) {
        if (!val) return null;
        const mongoose = require('mongoose');
        if (val instanceof mongoose.Types.ObjectId) return val;
        if (Array.isArray(val)) return this.extractObjectId(val[0]);
        if (typeof val === 'object' && (val._id || val.$oid)) {
            const idStr = String(val._id || val.$oid);
            return mongoose.Types.ObjectId.isValid(idStr)
                ? new mongoose.Types.ObjectId(idStr)
                : null;
        }
        if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
            return new mongoose.Types.ObjectId(val);
        }
        return null;
    }

    /**
     * Đồng bộ dữ liệu sách cũ dùng trường maTG / maDM hoặc định dạng {_id: '...'} sang ObjectId chuẩn
     */
    static async chuanHoaDuLieuSachCu() {
        const mongoose = require('mongoose');
        const docs = await Sach.collection.find({}).toArray();

        for (const doc of docs) {
            const updateFields = {};
            const tgObjId = this.extractObjectId(doc.tacGia || doc.maTG);
            if (
                tgObjId &&
                (!(doc.tacGia instanceof mongoose.Types.ObjectId) ||
                    doc.tacGia.toString() !== tgObjId.toString())
            ) {
                updateFields.tacGia = tgObjId;
            }

            const dmObjId = this.extractObjectId(doc.danhMuc || doc.maDM);
            if (
                dmObjId &&
                (!(doc.danhMuc instanceof mongoose.Types.ObjectId) ||
                    doc.danhMuc.toString() !== dmObjId.toString())
            ) {
                updateFields.danhMuc = dmObjId;
            }

            const nxbObjId = this.extractObjectId(doc.maNXB);
            if (
                nxbObjId &&
                (!(doc.maNXB instanceof mongoose.Types.ObjectId) ||
                    doc.maNXB.toString() !== nxbObjId.toString())
            ) {
                updateFields.maNXB = nxbObjId;
            }

            if (Object.keys(updateFields).length > 0) {
                await Sach.collection.updateOne(
                    { _id: doc._id },
                    { $set: updateFields },
                );
            }
        }
    }

    static async taoMaSach() {
        const prefix = 'MS';
        const sachs = await Sach.find({}, { maSach: 1, _id: 0 }).lean();
        let maxNumber = 0;
        for (const s of sachs) {
            const match = s.maSach?.match(/^MS(\d+)$/);
            if (match) {
                maxNumber = Math.max(maxNumber, Number(match[1]));
            }
        }
        return `${prefix}${String(maxNumber + 1).padStart(5, '0')}`;
    }

    static async themSach(data) {
        let {
            maSach,
            tenSach,
            moTa = '',
            donGia,
            soQuyen = 0,
            namXuatBan,
            maNXB,
            hinhAnh = '',
            nguonGoc = '',
            ngonNgu = 'Tiếng Việt',
            tacGia,
            danhMuc,
            maTG,
            maDM,
        } = data;

        // Tương thích nếu client gửi maTG / maDM mảng hoặc đơn
        if (!tacGia && maTG) {
            tacGia = Array.isArray(maTG) ? maTG[0] : maTG;
        }
        if (!danhMuc && maDM) {
            danhMuc = Array.isArray(maDM) ? maDM[0] : maDM;
        }

        if (!tenSach || !tenSach.trim()) {
            throw new ApiError(400, 'Tên sách là bắt buộc.');
        }
        if (donGia === undefined || donGia === null || donGia < 0) {
            throw new ApiError(400, 'Đơn giá sách là bắt buộc và phải >= 0.');
        }
        if (soQuyen === undefined || soQuyen === null || soQuyen < 0) {
            throw new ApiError(400, 'Số quyển sách là bắt buộc và phải >= 0.');
        }
        if (!namXuatBan) {
            throw new ApiError(400, 'Năm xuất bản là bắt buộc.');
        }
        if (!maNXB) {
            throw new ApiError(400, 'Nhà xuất bản là bắt buộc.');
        }
        if (!tacGia) {
            throw new ApiError(400, 'Tác giả là bắt buộc.');
        }
        if (!danhMuc) {
            throw new ApiError(400, 'Danh mục là bắt buộc.');
        }

        // Kiểm tra hợp lệ các tham chiếu
        const [nxbTonTai, tgTonTai, dmTonTai] = await Promise.all([
            NhaXuatBan.findById(maNXB),
            TacGia.findById(tacGia),
            DanhMuc.findById(danhMuc),
        ]);
        if (!nxbTonTai) throw new ApiError(404, 'Nhà xuất bản không tồn tại.');
        if (!tgTonTai) throw new ApiError(404, 'Tác giả không tồn tại.');
        if (!dmTonTai) throw new ApiError(404, 'Danh mục không tồn tại.');

        if (!maSach) {
            maSach = await this.taoMaSach();
        } else {
            maSach = maSach.trim().toUpperCase();
            const tonTai = await Sach.findOne({ maSach });
            if (tonTai) {
                throw new ApiError(400, `Mã sách [${maSach}] đã tồn tại.`);
            }
        }

        const sach = new Sach({
            maSach,
            tenSach: tenSach.trim(),
            moTa,
            donGia: Number(donGia),
            soQuyen: Number(soQuyen),
            namXuatBan: Number(namXuatBan),
            maNXB,
            hinhAnh,
            nguonGoc,
            ngonNgu,
            tacGia,
            danhMuc,
        });

        await sach.save();
        return sach.populate(['tacGia', 'danhMuc', 'maNXB']);
    }

    static async getDanhSachSach({
        search,
        tacGia,
        danhMuc,
        maNXB,
        dm,
        tg,
        nxb,
        minGia,
        maxGia,
        conHang,
        page = 1,
        limit = 10,
    }) {
        await this.chuanHoaDuLieuSachCu();
        const filter = {};
        if (search) {
            filter.$or = [
                { tenSach: new RegExp(search, 'i') },
                { maSach: new RegExp(search, 'i') },
                { moTa: new RegExp(search, 'i') },
            ];
        }

        const tgFilter = tacGia || tg;
        const dmFilter = danhMuc || dm;
        const nxbFilter = maNXB || nxb;

        if (tgFilter) filter.tacGia = tgFilter;
        if (dmFilter) filter.danhMuc = dmFilter;
        if (nxbFilter) filter.maNXB = nxbFilter;

        if (minGia !== undefined || maxGia !== undefined) {
            filter.donGia = {};
            if (minGia !== undefined) filter.donGia.$gte = Number(minGia);
            if (maxGia !== undefined) filter.donGia.$lte = Number(maxGia);
        }

        if (conHang === 'true' || conHang === true) {
            filter.soQuyen = { $gt: 0 };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [sachs, total] = await Promise.all([
            Sach.find(filter)
                .populate('tacGia', 'tenTg maTG quocTich')
                .populate('danhMuc', 'tenDm maDM')
                .populate('maNXB', 'tenNxb maNXB diaChi')
                .skip(skip)
                .limit(Number(limit))
                .sort({ hinhAnh: -1, createdAt: -1 }),
            Sach.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: sachs,
        };
    }

    static async getChiTietSach(idOrMa) {
        await this.chuanHoaDuLieuSachCu();
        let sach = null;
        if (idOrMa.match(/^[0-9a-fA-F]{24}$/)) {
            sach = await Sach.findById(idOrMa)
                .populate('tacGia')
                .populate('danhMuc')
                .populate('maNXB');
        }
        if (!sach) {
            sach = await Sach.findOne({ maSach: idOrMa.toUpperCase() })
                .populate('tacGia')
                .populate('danhMuc')
                .populate('maNXB');
        }
        if (!sach) {
            throw new ApiError(404, 'Không tìm thấy sách.');
        }
        return sach;
    }

    static async capNhatSach(id, data) {
        const sach = await Sach.findById(id);
        if (!sach) {
            throw new ApiError(404, 'Không tìm thấy sách.');
        }

        delete data.maSach; // Không cho phép đổi mã sách

        if (data.maTG && !data.tacGia) {
            data.tacGia = Array.isArray(data.maTG) ? data.maTG[0] : data.maTG;
        }
        if (data.maDM && !data.danhMuc) {
            data.danhMuc = Array.isArray(data.maDM) ? data.maDM[0] : data.maDM;
        }

        if (data.tacGia) {
            const tg = await TacGia.findById(data.tacGia);
            if (!tg) throw new ApiError(404, 'Tác giả không tồn tại.');
        }
        if (data.danhMuc) {
            const dm = await DanhMuc.findById(data.danhMuc);
            if (!dm) throw new ApiError(404, 'Danh mục không tồn tại.');
        }
        if (data.maNXB) {
            const nxb = await NhaXuatBan.findById(data.maNXB);
            if (!nxb) throw new ApiError(404, 'Nhà xuất bản không tồn tại.');
        }

        Object.assign(sach, data);
        await sach.save();
        return sach.populate(['tacGia', 'danhMuc', 'maNXB']);
    }

    static async xoaSach(id) {
        const sach = await Sach.findById(id);
        if (!sach) {
            throw new ApiError(404, 'Không tìm thấy sách.');
        }

        // Kiểm tra xem sách có đang trong lượt mượn hoặc đã có lịch sử mượn
        const dangMuon = await TheoDoiMuonSach.exists({
            maSach: id,
            trangThai: { $in: ['dangMuon', 'quaHan'] },
        });
        if (dangMuon) {
            throw new ApiError(
                400,
                'Không thể xóa sách vì đang có độc giả mượn cuốn sách này.',
            );
        }

        const coLichSu = await TheoDoiMuonSach.exists({ maSach: id });
        if (coLichSu) {
            // Đã có lịch sử mượn trả -> ẩn sách bằng cách đặt soQuyen = 0 hoặc thông báo
            sach.soQuyen = 0;
            sach.moTa = `${sach.moTa} [Ngừng lưu hành]`.trim();
            await sach.save();
            return {
                type: 'soft_delete',
                message: 'Sách đã có lịch sử mượn trả nên đã được cập nhật số lượng về 0 và gắn nhãn ngừng lưu hành để bảo toàn dữ liệu.',
                sach,
            };
        }

        await Sach.findByIdAndDelete(id);
        return {
            type: 'hard_delete',
            message: 'Đã xóa hoàn toàn sách khỏi hệ thống.',
        };
    }
}

module.exports = SachService;
