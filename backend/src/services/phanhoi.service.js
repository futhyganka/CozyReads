const { PhanHoi, DocGia, NhanVien } = require('../models');
const ApiError = require('../api-error');
const MailService = require('./mail.service');
const {
    LOAI_PHAN_HOI,
    TRANG_THAI_PHAN_HOI,
} = require('../constants/business-rules');

class PhanHoiService {
    /**
     * Bộ nhớ đệm idempotency chống gửi trùng Email khi SMTP đã nhận thư
     * nhưng bước cập nhật MongoDB gặp sự cố tạm thời và người xử lý bấm thử lại.
     * Key: phanHoiId -> { noiDungPhanHoi, email, sentAt }
     */
    static sentEmailCache = new Map();

    /**
     * Sinh mã phản hồi tự động:
     * - Liên hệ (lienHe): LH00001, LH00002...
     * - Góp ý (gopY): GY00001, GY00002...
     */
    static async taoMaPhanHoi(loai) {
        const prefix = loai === LOAI_PHAN_HOI.LIEN_HE ? 'LH' : 'GY';
        const records = await PhanHoi.find(
            { loai },
            { maPhanHoi: 1, _id: 0 },
        ).lean();

        let maxNumber = 0;
        const regex = new RegExp(`^${prefix}(\\d+)$`);
        for (const r of records) {
            const match = r.maPhanHoi?.match(regex);
            if (match) {
                maxNumber = Math.max(maxNumber, Number(match[1]));
            }
        }
        return `${prefix}${String(maxNumber + 1).padStart(5, '0')}`;
    }

    /**
     * Độc giả gửi yêu cầu Liên hệ (bắt buộc có maDocGia để lấy thông tin độc giả và phản hồi qua Email)
     */
    static async taoLienHe({ docGiaId, noiDung }) {
        if (!docGiaId) {
            throw new ApiError(
                401,
                'Vui lòng đăng nhập tài khoản độc giả để gửi yêu cầu liên hệ.',
            );
        }

        const trimmedNoiDung = String(noiDung || '').trim();
        if (!trimmedNoiDung) {
            throw new ApiError(400, 'Nội dung liên hệ không được để trống.');
        }

        const docGia = await DocGia.findById(docGiaId);
        if (!docGia) {
            throw new ApiError(404, 'Không tìm thấy hồ sơ độc giả.');
        }
        if (!docGia.email) {
            throw new ApiError(
                400,
                'Tài khoản độc giả chưa có địa chỉ Email để nhận phản hồi từ thư viện.',
            );
        }

        const maPhanHoi = await this.taoMaPhanHoi(LOAI_PHAN_HOI.LIEN_HE);

        const phanHoi = new PhanHoi({
            maPhanHoi,
            loai: LOAI_PHAN_HOI.LIEN_HE,
            maDocGia: docGia._id,
            noiDung: trimmedNoiDung,
            trangThai: TRANG_THAI_PHAN_HOI.CHO_XU_LY,
        });

        await phanHoi.save();
        return phanHoi.populate(
            'maDocGia',
            'maDocGia hoLot ten email dienThoai',
        );
    }

    /**
     * Độc giả hoặc Khách gửi Góp ý (nếu maDocGia = null thì hiển thị Ẩn danh)
     */
    static async taoGopY({ docGiaId = null, noiDung }) {
        const trimmedNoiDung = String(noiDung || '').trim();
        if (!trimmedNoiDung) {
            throw new ApiError(400, 'Nội dung góp ý không được để trống.');
        }

        let validDocGiaId = null;
        if (docGiaId) {
            const docGia = await DocGia.findById(docGiaId);
            if (!docGia) {
                throw new ApiError(404, 'Không tìm thấy hồ sơ độc giả.');
            }
            validDocGiaId = docGia._id;
        }

        const maPhanHoi = await this.taoMaPhanHoi(LOAI_PHAN_HOI.GOP_Y);

        const phanHoi = new PhanHoi({
            maPhanHoi,
            loai: LOAI_PHAN_HOI.GOP_Y,
            maDocGia: validDocGiaId,
            noiDung: trimmedNoiDung,
            trangThai: TRANG_THAI_PHAN_HOI.CHO_XU_LY,
        });

        await phanHoi.save();
        if (validDocGiaId) {
            await phanHoi.populate(
                'maDocGia',
                'maDocGia hoLot ten email dienThoai',
            );
        }
        return phanHoi;
    }

    /**
     * Lấy thống kê số lượng theo loại phản hồi (lienHe hoặc gopY)
     */
    static async getThongKeTheoLoai(loai) {
        const baseFilter = loai ? { loai } : {};
        const [tongSo, choXuLy, dangXuLy, daXuLy] = await Promise.all([
            PhanHoi.countDocuments(baseFilter),
            PhanHoi.countDocuments({
                ...baseFilter,
                trangThai: TRANG_THAI_PHAN_HOI.CHO_XU_LY,
            }),
            PhanHoi.countDocuments({
                ...baseFilter,
                trangThai: TRANG_THAI_PHAN_HOI.DANG_XU_LY,
            }),
            PhanHoi.countDocuments({
                ...baseFilter,
                trangThai: TRANG_THAI_PHAN_HOI.DA_XU_LY,
            }),
        ]);

        return {
            tongSo,
            choXuLy,
            dangXuLy,
            daXuLy,
        };
    }

    /**
     * Lấy danh sách Liên hệ hoặc Góp ý có phân trang, bộ lọc trạng thái, ngày gửi và từ khóa
     */
    static async getDanhSachPhanHoi({
        loai,
        trangThai,
        search,
        ngayGui,
        tuNgay,
        denNgay,
        docGiaId,
        page = 1,
        limit = 10,
    }) {
        const filter = {};

        if (loai) {
            if (!Object.values(LOAI_PHAN_HOI).includes(loai)) {
                throw new ApiError(
                    400,
                    'Loại phản hồi không hợp lệ (chỉ chấp nhận lienHe hoặc gopY).',
                );
            }
            filter.loai = loai;
        }

        if (trangThai) {
            if (!Object.values(TRANG_THAI_PHAN_HOI).includes(trangThai)) {
                throw new ApiError(400, 'Trạng thái lọc không hợp lệ.');
            }
            filter.trangThai = trangThai;
        }

        if (docGiaId) {
            filter.maDocGia = docGiaId;
        }

        // Lọc theo ngày gửi
        if (ngayGui) {
            const d = new Date(ngayGui);
            if (!isNaN(d.getTime())) {
                const start = new Date(d);
                start.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setHours(23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        } else if (tuNgay || denNgay) {
            filter.createdAt = {};
            if (tuNgay) {
                const start = new Date(tuNgay);
                if (!isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    filter.createdAt.$gte = start;
                }
            }
            if (denNgay) {
                const end = new Date(denNgay);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = end;
                }
            }
            if (Object.keys(filter.createdAt).length === 0) {
                delete filter.createdAt;
            }
        }

        // Tìm kiếm theo mã, nội dung hoặc thông tin độc giả
        if (search && String(search).trim()) {
            const keyword = String(search).trim();
            const regex = new RegExp(keyword, 'i');
            const matchingReaders = await DocGia.find(
                {
                    $or: [
                        { maDocGia: regex },
                        { hoLot: regex },
                        { ten: regex },
                        { email: regex },
                        { dienThoai: regex },
                    ],
                },
                { _id: 1 },
            ).lean();
            const readerIds = matchingReaders.map((r) => r._id);

            filter.$or = [
                { maPhanHoi: regex },
                { noiDung: regex },
                ...(readerIds.length > 0
                    ? [{ maDocGia: { $in: readerIds } }]
                    : []),
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [items, total, stats] = await Promise.all([
            PhanHoi.find(filter)
                .populate('maDocGia', 'maDocGia hoLot ten email dienThoai')
                .populate('msnvXuLy', 'msnv hoTenNv chucVu')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            PhanHoi.countDocuments(filter),
            this.getThongKeTheoLoai(loai),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            stats,
            data: items,
        };
    }

    /**
     * Xem chi tiết 1 bản ghi Liên hệ hoặc Góp ý
     */
    static async getChiTietPhanHoi(idOrMa, expectedLoai = null) {
        let phanHoi = null;
        if (String(idOrMa).match(/^[0-9a-fA-F]{24}$/)) {
            phanHoi = await PhanHoi.findById(idOrMa)
                .populate('maDocGia', 'maDocGia hoLot ten email dienThoai')
                .populate('msnvXuLy', 'msnv hoTenNv chucVu');
        }
        if (!phanHoi) {
            phanHoi = await PhanHoi.findOne({
                maPhanHoi: String(idOrMa).trim().toUpperCase(),
            })
                .populate('maDocGia', 'maDocGia hoLot ten email dienThoai')
                .populate('msnvXuLy', 'msnv hoTenNv chucVu');
        }
        if (!phanHoi) {
            throw new ApiError(404, 'Không tìm thấy bản ghi yêu cầu.');
        }
        if (expectedLoai && phanHoi.loai !== expectedLoai) {
            throw new ApiError(
                400,
                `Bản ghi [${phanHoi.maPhanHoi}] không thuộc phân loại [${expectedLoai}].`,
            );
        }
        return phanHoi;
    }

    /**
     * Tiếp nhận hoặc cập nhật trạng thái xử lý (dùng cho Góp ý: choXuLy -> dangXuLy -> daXuLy,
     * và tiếp nhận Liên hệ: choXuLy -> dangXuLy)
     */
    static async capNhatTrangThai(
        id,
        { trangThai, msnvId, expectedLoai = null },
    ) {
        if (!Object.values(TRANG_THAI_PHAN_HOI).includes(trangThai)) {
            throw new ApiError(400, 'Trạng thái cập nhật không hợp lệ.');
        }

        const nhanVien = await NhanVien.findById(msnvId);
        if (!nhanVien || nhanVien.daNghiViec) {
            throw new ApiError(
                403,
                'Nhân viên thực hiện không hợp lệ hoặc đã nghỉ việc.',
            );
        }

        const phanHoi = await PhanHoi.findById(id);
        if (!phanHoi) {
            throw new ApiError(404, 'Không tìm thấy bản ghi cần cập nhật.');
        }

        if (expectedLoai && phanHoi.loai !== expectedLoai) {
            throw new ApiError(
                400,
                `Bản ghi này không thuộc phân loại [${expectedLoai}].`,
            );
        }

        // Đối với Liên hệ (lienHe), trạng thái daXuLy bắt buộc phải thông qua luồng gửi Email phản hồi
        if (
            phanHoi.loai === LOAI_PHAN_HOI.LIEN_HE &&
            trangThai === TRANG_THAI_PHAN_HOI.DA_XU_LY
        ) {
            throw new ApiError(
                400,
                'Đối với yêu cầu Liên hệ, vui lòng sử dụng chức năng Gửi phản hồi qua Email để hoàn tất xử lý.',
            );
        }

        phanHoi.trangThai = trangThai;
        phanHoi.msnvXuLy = nhanVien._id;
        await phanHoi.save();

        return phanHoi.populate([
            { path: 'maDocGia', select: 'maDocGia hoLot ten email dienThoai' },
            { path: 'msnvXuLy', select: 'msnv hoTenNv chucVu' },
        ]);
    }

    /**
     * Gửi phản hồi Liên hệ qua Email (Chỉ áp dụng cho loai = 'lienHe')
     */
    static async guiPhanHoiLienHeQuaEmail(id, { noiDungPhanHoi, msnvId }) {
        // 1. Kiểm tra nhân viên/Admin xử lý
        const nhanVien = await NhanVien.findById(msnvId);
        if (!nhanVien || nhanVien.daNghiViec) {
            throw new ApiError(
                403,
                'Nhân viên hoặc Quản trị viên thực hiện không hợp lệ.',
            );
        }

        // 2. Kiểm tra bản ghi tồn tại và có loai = lienHe
        const phanHoi = await PhanHoi.findById(id);
        if (!phanHoi) {
            throw new ApiError(404, 'Không tìm thấy yêu cầu liên hệ.');
        }
        if (phanHoi.loai !== LOAI_PHAN_HOI.LIEN_HE) {
            throw new ApiError(
                400,
                'Chức năng gửi phản hồi qua Email chỉ áp dụng cho yêu cầu Liên hệ, không áp dụng cho Góp ý.',
            );
        }

        // 3. Kiểm tra nội dung phản hồi hợp lệ (không được để trống)
        const trimmedReply = String(noiDungPhanHoi || '').trim();
        if (!trimmedReply) {
            throw new ApiError(400, 'Nội dung phản hồi không được để trống.');
        }

        // 4. Lấy thông tin độc giả và Email hiện tại từ model DocGia thông qua maDocGia
        if (!phanHoi.maDocGia) {
            throw new ApiError(
                400,
                'Yêu cầu liên hệ này không gắn với hồ sơ độc giả hợp lệ.',
            );
        }
        const docGia = await DocGia.findById(phanHoi.maDocGia);
        if (!docGia) {
            throw new ApiError(
                404,
                'Không tìm thấy hồ sơ độc giả tương ứng với yêu cầu liên hệ này.',
            );
        }
        if (!docGia.email) {
            throw new ApiError(
                400,
                'Hồ sơ độc giả hiện không có địa chỉ Email để nhận thư phản hồi.',
            );
        }

        const hoTenDocGia =
            `${docGia.hoLot || ''} ${docGia.ten || ''}`.trim() || 'Độc giả';

        // 5. Cơ chế Idempotency: Kiểm tra xem cùng nội dung phản hồi cho phiếu này đã được SMTP chấp nhận chưa
        const cacheKey = String(phanHoi._id);
        const cachedSent = this.sentEmailCache.get(cacheKey);
        const isAlreadySent =
            cachedSent &&
            cachedSent.noiDungPhanHoi === trimmedReply &&
            cachedSent.email === docGia.email &&
            Date.now() - cachedSent.sentAt < 15 * 60 * 1000;

        if (!isAlreadySent) {
            try {
                await MailService.guiEmailPhanHoiLienHe(docGia.email, {
                    hoTen: hoTenDocGia,
                    maPhanHoi: phanHoi.maPhanHoi,
                    noiDungPhanHoi: trimmedReply,
                });

                // Đánh dấu vào bộ nhớ đệm ngay sau khi SMTP chấp nhận thư thành công
                this.sentEmailCache.set(cacheKey, {
                    noiDungPhanHoi: trimmedReply,
                    email: docGia.email,
                    sentAt: Date.now(),
                });
            } catch (mailErr) {
                // Nếu gửi Email thất bại: Tuyệt đối KHÔNG cập nhật trạng thái thành daXuLy
                throw new ApiError(
                    502,
                    `Không thể gửi Email phản hồi tới độc giả (${mailErr.message || 'Lỗi kết nối dịch vụ SMTP'}). Vui lòng kiểm tra và thử lại.`,
                );
            }
        }

        // 6. Khi Email đã được SMTP chấp nhận thành công, cập nhật bản ghi trong MongoDB
        phanHoi.noiDungPhanHoi = trimmedReply;
        phanHoi.msnvXuLy = nhanVien._id;
        phanHoi.trangThai = TRANG_THAI_PHAN_HOI.DA_XU_LY;
        await phanHoi.save();

        // Xóa cache sau khi lưu DB thành công
        this.sentEmailCache.delete(cacheKey);

        return phanHoi.populate([
            { path: 'maDocGia', select: 'maDocGia hoLot ten email dienThoai' },
            { path: 'msnvXuLy', select: 'msnv hoTenNv chucVu' },
        ]);
    }
}

module.exports = PhanHoiService;
