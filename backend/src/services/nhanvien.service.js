const { NhanVien, TheoDoiMuonSach, KyThanhToan } = require('../models');
const ApiError = require('../api-error');
const AuthService = require('./auth.service');
const { CHUC_VU_NHAN_VIEN } = require('../constants/business-rules');

class NhanVienService {
    /**
     * Tạo nhân viên mới (chỉ Admin)
     */
    static async taoNhanVien(data) {
        const {
            hoTenNv,
            hoTen,
            password,
            chucVu = CHUC_VU_NHAN_VIEN.NHAN_VIEN,
            diaChi = '',
            soDienThoai,
            dienThoai,
            luong = 0,
        } = data;

        const ten = hoTenNv || hoTen;
        const sdt = soDienThoai || dienThoai;

        if (!ten || !ten.trim()) {
            throw new ApiError(400, 'Họ tên nhân viên là bắt buộc.');
        }
        if (!password) {
            throw new ApiError(400, 'Mật khẩu là bắt buộc.');
        }
        if (!sdt || !sdt.trim()) {
            throw new ApiError(400, 'Số điện thoại nhân viên là bắt buộc.');
        }

        const msnv = await AuthService.taoMaNhanVien();
        const hashedPassword = await AuthService.bamMatKhau(password);

        const nhanVien = new NhanVien({
            msnv,
            hoTenNv: ten.trim(),
            password: hashedPassword,
            chucVu,
            diaChi,
            soDienThoai: sdt.trim(),
            luong: Number(luong) || 0,
        });

        await nhanVien.save();

        const nvRes = nhanVien.toObject();
        delete nvRes.password;
        return nvRes;
    }

    /**
     * Lấy danh sách nhân viên có phân trang, tìm kiếm, lọc chức vụ
     */
    static async getDanhSachNhanVien({ search, chucVu, page = 1, limit = 10 }) {
        const filter = {};
        if (search) {
            filter.$or = [
                { msnv: new RegExp(search, 'i') },
                { hoTenNv: new RegExp(search, 'i') },
                { soDienThoai: new RegExp(search, 'i') },
            ];
        }
        if (chucVu) filter.chucVu = chucVu;

        const skip = (Number(page) - 1) * Number(limit);
        const [nhanViens, total] = await Promise.all([
            NhanVien.find(filter)
                .select('-password')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 }),
            NhanVien.countDocuments(filter),
        ]);

        return {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            data: nhanViens,
        };
    }

    /**
     * Lấy chi tiết nhân viên theo ID hoặc MSNV
     */
    static async getChiTietNhanVien(idOrMsnv) {
        let nv = null;
        if (idOrMsnv.match(/^[0-9a-fA-F]{24}$/)) {
            nv = await NhanVien.findById(idOrMsnv).select('-password');
        }
        if (!nv) {
            nv = await NhanVien.findOne({ msnv: idOrMsnv.toUpperCase() }).select('-password');
        }
        if (!nv) {
            throw new ApiError(404, 'Không tìm thấy nhân viên.');
        }
        return nv;
    }

    /**
     * Cập nhật thông tin nhân viên
     */
    static async capNhatNhanVien(id, updateData, callerRole) {
        const nhanVien = await NhanVien.findById(id);
        if (!nhanVien) {
            throw new ApiError(404, 'Không tìm thấy nhân viên.');
        }

        // Không cho phép đổi MSNV hay password ở API này
        delete updateData.msnv;
        delete updateData.password;

        // Chỉ Admin mới được đổi chức vụ nhân viên
        if (updateData.chucVu && updateData.chucVu !== nhanVien.chucVu) {
            if (callerRole !== 'quanTriVien') {
                throw new ApiError(403, 'Chỉ Quản trị viên (Admin) mới có quyền thay đổi chức vụ nhân viên.');
            }
        }

        if (updateData.hoTen) updateData.hoTenNv = updateData.hoTen;
        if (updateData.dienThoai) updateData.soDienThoai = updateData.dienThoai;

        Object.assign(nhanVien, updateData);
        await nhanVien.save();

        const nvRes = nhanVien.toObject();
        delete nvRes.password;
        return nvRes;
    }

    /**
     * Đổi mật khẩu nhân viên
     */
    static async doiMatKhau(nhanVienId, { matKhauCu, matKhauMoi }) {
        if (!matKhauMoi || matKhauMoi.length < 6) {
            throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        const nhanVien = await NhanVien.findById(nhanVienId).select('+password');
        if (!nhanVien) {
            throw new ApiError(404, 'Không tìm thấy nhân viên.');
        }

        if (matKhauCu) {
            const isMatch = await AuthService.kiemTraMatKhau(matKhauCu, nhanVien.password);
            if (!isMatch) {
                throw new ApiError(400, 'Mật khẩu cũ không chính xác.');
            }
        }

        nhanVien.password = await AuthService.bamMatKhau(matKhauMoi);
        await nhanVien.save();
        return { success: true, message: 'Đổi mật khẩu nhân viên thành công.' };
    }

    /**
     * Xóa hoặc vô hiệu hóa nhân viên
     */
    static async xoaNhanVien(nhanVienId) {
        const nhanVien = await NhanVien.findById(nhanVienId);
        if (!nhanVien) {
            throw new ApiError(404, 'Không tìm thấy nhân viên.');
        }

        // Kiểm tra xem nhân viên đã từng tạo phiếu mượn, nhận trả sách, hoặc xác nhận thanh toán chưa
        const coGiaoDichMuon = await TheoDoiMuonSach.exists({
            $or: [{ msnvMuon: nhanVienId }, { msnvTra: nhanVienId }],
        });
        const coGiaoDichThanhToan = await KyThanhToan.exists({ msnv: nhanVienId });

        if (coGiaoDichMuon || coGiaoDichThanhToan) {
            // Không xóa cứng để bảo toàn thông tin giao dịch lịch sử -> đánh dấu daNghiViec = true
            nhanVien.daNghiViec = true;
            await nhanVien.save();
            return {
                type: 'soft_delete',
                message: 'Nhân viên đã tham gia xử lý giao dịch. Đã đánh dấu nghỉ việc để bảo toàn lịch sử giao dịch.',
                nhanVien,
            };
        }

        await NhanVien.findByIdAndDelete(nhanVienId);
        return {
            type: 'hard_delete',
            message: 'Đã xóa hoàn toàn nhân viên chưa phát sinh giao dịch.',
        };
    }
}

module.exports = NhanVienService;
