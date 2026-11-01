const mongoose = require('mongoose');
const config = require('../src/config');
const {
    VaiTro,
    TaiKhoan,
    DocGia,
    NhanVien,
    NhaXuatBan,
    TacGia,
    DanhMuc,
    Sach,
} = require('../src/models');
const AuthService = require('../src/services/auth.service');
const {
    LOAI_DOC_GIA,
    CHUC_VU_NHAN_VIEN,
} = require('../src/constants/business-rules');

async function seedData() {
    try {
        console.log('Đang kết nối cơ sở dữ liệu CozyReads...');
        await mongoose.connect(config.db.url);
        console.log('Kết nối thành công!');

        // 1. Khởi tạo vai trò
        console.log('1. Khởi tạo vai trò & quyền hạn (VaiTro)...');
        await AuthService.khoiTaoVaiTroMacDinh();

        // 2. Nhà xuất bản
        console.log('2. Khởi tạo Nhà xuất bản...');
        const nxbTre = await NhaXuatBan.findOneAndUpdate(
            { maNxb: 'NXB_TRE' },
            {
                maNxb: 'NXB_TRE',
                tenNxb: 'Nhà Xuất Bản Trẻ',
                diaChi: '161B Lý Chính Thắng, Quận 3, TP.HCM',
            },
            { upsert: true, returnDocument: 'after' },
        );
        const nxbKimDong = await NhaXuatBan.findOneAndUpdate(
            { maNxb: 'NXB_KIMDONG' },
            {
                maNxb: 'NXB_KIMDONG',
                tenNxb: 'Nhà Xuất Bản Kim Đồng',
                diaChi: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 3. Tác giả
        console.log('3. Khởi tạo Tác giả...');
        const tgNguyenNhatAnh = await TacGia.findOneAndUpdate(
            { maTg: 'TG_NNA' },
            { maTg: 'TG_NNA', tenTg: 'Nguyễn Nhật Ánh', quocTich: 'Việt Nam' },
            { upsert: true, returnDocument: 'after' },
        );
        const tgToHoai = await TacGia.findOneAndUpdate(
            { maTg: 'TG_TH' },
            { maTg: 'TG_TH', tenTg: 'Tô Hoài', quocTich: 'Việt Nam' },
            { upsert: true, returnDocument: 'after' },
        );

        // 4. Danh mục
        console.log('4. Khởi tạo Danh mục...');
        const dmVanHoc = await DanhMuc.findOneAndUpdate(
            { maDm: 'DM_VANHOC' },
            {
                maDm: 'DM_VANHOC',
                tenDm: 'Văn học thiếu nhi',
                moTa: 'Truyện dài, tản văn, tiểu thuyết',
            },
            { upsert: true, returnDocument: 'after' },
        );
        const dmKhoaHoc = await DanhMuc.findOneAndUpdate(
            { maDm: 'DM_KHOAHOC' },
            {
                maDm: 'DM_KHOAHOC',
                tenDm: 'Khoa học & Đời sống',
                moTa: 'Sách khám phá khoa học kỹ thuật',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 5. Sách
        console.log('5. Khởi tạo Đầu sách...');
        await Sach.findOneAndUpdate(
            { maSach: 'MS_KVH_01' },
            {
                maSach: 'MS_KVH_01',
                tenSach: 'Kính Vạn Hoa - Tập 1',
                moTa: 'Tác phẩm thiếu nhi đặc sắc về bộ ba Quý ròm, Tiểu Long, nhỏ Hạnh.',
                donGia: 85000,
                soQuyen: 10,
                namXuatBan: 2022,
                maNxb: nxbTre._id,
                maTg: [tgNguyenNhatAnh._id],
                maDm: [dmVanHoc._id],
                ngonNgu: 'Tiếng Việt',
            },
            { upsert: true, returnDocument: 'after' },
        );

        await Sach.findOneAndUpdate(
            { maSach: 'MS_DMPLK' },
            {
                maSach: 'MS_DMPLK',
                tenSach: 'Dế Mèn Phiêu Lưu Ký',
                moTa: 'Tác phẩm văn học kinh điển của nhà văn Tô Hoài.',
                donGia: 65000,
                soQuyen: 8,
                namXuatBan: 2021,
                maNxb: nxbKimDong._id,
                maTg: [tgToHoai._id],
                maDm: [dmVanHoc._id],
                ngonNgu: 'Tiếng Việt',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 6. Tài khoản Admin & Nhân viên mẫu
        console.log('6. Khởi tạo Tài khoản Quản trị viên & Nhân viên...');
        const adminEmail = 'admin@cozyreads.vn';
        const adminExists = await TaiKhoan.findOne({ email: adminEmail });
        if (!adminExists) {
            await AuthService.dangKyNhanVien({
                email: adminEmail,
                password: 'adminPassword123',
                hoTen: 'Quản Trị Viên Hệ Thống',
                chucVu: CHUC_VU_NHAN_VIEN.ADMIN,
                dienThoai: '0988888888',
                isAdmin: true,
            });
        }

        const nvEmail = 'thuthu@cozyreads.vn';
        const nvExists = await TaiKhoan.findOne({ email: nvEmail });
        if (!nvExists) {
            await AuthService.dangKyNhanVien({
                email: nvEmail,
                password: 'staffPassword123',
                hoTen: 'Nguyễn Thị Thủ Thư',
                chucVu: CHUC_VU_NHAN_VIEN.NHAN_VIEN,
                dienThoai: '0977777777',
                isAdmin: false,
            });
        }

        // 7. Độc giả mẫu
        console.log('7. Khởi tạo Độc giả mẫu...');
        const dgEmail = 'docgia.an@gmail.com';
        const dgExists = await TaiKhoan.findOne({ email: dgEmail });
        if (!dgExists) {
            await AuthService.dangKyDocGia({
                email: dgEmail,
                password: 'readerPassword123',
                hoLot: 'Trần Văn',
                ten: 'An',
                dienThoai: '0966666666',
                loaiDocGia: LOAI_DOC_GIA.DOCGIA_TUDO,
            });
        }

        console.log('✨ Khởi tạo dữ liệu mẫu CozyReads thành công!');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi seed data:', error);
        process.exit(1);
    }
}

seedData();
