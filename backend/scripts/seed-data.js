const mongoose = require('mongoose');
const config = require('../src/config');
const {
    DocGia,
    NhanVien,
    NhaXuatBan,
    TacGia,
    DanhMuc,
    Sach,
} = require('../src/models');
const AuthService = require('../src/services/auth.service');
const NhanVienService = require('../src/services/nhanvien.service');
const {
    LOAI_DOC_GIA,
    CHUC_VU_NHAN_VIEN,
} = require('../src/constants/business-rules');

async function seedData() {
    try {
        console.log('Đang kết nối cơ sở dữ liệu CozyReads...');
        await mongoose.connect(config.db.url);
        console.log('Kết nối thành công!');

        // 1. Nhà xuất bản
        console.log('1. Khởi tạo Nhà xuất bản...');
        const nxbTre = await NhaXuatBan.findOneAndUpdate(
            { maNXB: 'NXB_TRE' },
            {
                maNXB: 'NXB_TRE',
                tenNxb: 'Nhà Xuất Bản Trẻ',
                diaChi: '161B Lý Chính Thắng, Quận 3, TP.HCM',
            },
            { upsert: true, returnDocument: 'after' },
        );
        const nxbKimDong = await NhaXuatBan.findOneAndUpdate(
            { maNXB: 'NXB_KIMDONG' },
            {
                maNXB: 'NXB_KIMDONG',
                tenNxb: 'Nhà Xuất Bản Kim Đồng',
                diaChi: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 2. Tác giả
        console.log('2. Khởi tạo Tác giả...');
        const tgNguyenNhatAnh = await TacGia.findOneAndUpdate(
            { maTG: 'TG_NNA' },
            { maTG: 'TG_NNA', tenTg: 'Nguyễn Nhật Ánh', quocTich: 'Việt Nam' },
            { upsert: true, returnDocument: 'after' },
        );
        const tgToHoai = await TacGia.findOneAndUpdate(
            { maTG: 'TG_TH' },
            { maTG: 'TG_TH', tenTg: 'Tô Hoài', quocTich: 'Việt Nam' },
            { upsert: true, returnDocument: 'after' },
        );

        // 3. Danh mục
        console.log('3. Khởi tạo Danh mục...');
        const dmVanHoc = await DanhMuc.findOneAndUpdate(
            { maDM: 'DM_VANHOC' },
            {
                maDM: 'DM_VANHOC',
                tenDm: 'Văn học thiếu nhi',
                moTa: 'Truyện dài, tản văn, tiểu thuyết',
            },
            { upsert: true, returnDocument: 'after' },
        );
        const dmKhoaHoc = await DanhMuc.findOneAndUpdate(
            { maDM: 'DM_KHOAHOC' },
            {
                maDM: 'DM_KHOAHOC',
                tenDm: 'Khoa học & Đời sống',
                moTa: 'Sách khám phá khoa học kỹ thuật',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 4. Sách
        console.log('4. Khởi tạo Đầu sách...');
        await Sach.findOneAndUpdate(
            { maSach: 'MS_KVH_01' },
            {
                maSach: 'MS_KVH_01',
                tenSach: 'Kính Vạn Hoa - Tập 1',
                moTa: 'Tác phẩm thiếu nhi đặc sắc về bộ ba Quý ròm, Tiểu Long, nhỏ Hạnh.',
                donGia: 85000,
                soQuyen: 10,
                namXuatBan: 2022,
                maNXB: nxbTre._id,
                tacGia: tgNguyenNhatAnh._id,
                danhMuc: dmVanHoc._id,
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
                maNXB: nxbKimDong._id,
                tacGia: tgToHoai._id,
                danhMuc: dmVanHoc._id,
                ngonNgu: 'Tiếng Việt',
            },
            { upsert: true, returnDocument: 'after' },
        );

        // 5. Nhân viên Quản trị & Thủ thư
        console.log('5. Khởi tạo Nhân viên Quản trị & Thủ thư...');
        const adminExists = await NhanVien.findOne({ chucVu: CHUC_VU_NHAN_VIEN.ADMIN });
        if (!adminExists) {
            await NhanVienService.taoNhanVien({
                hoTenNv: 'Quản Trị Viên Hệ Thống',
                password: 'adminPassword123',
                chucVu: CHUC_VU_NHAN_VIEN.ADMIN,
                soDienThoai: '0988888888',
                luong: 20000000,
            });
        }

        const staffExists = await NhanVien.findOne({ chucVu: CHUC_VU_NHAN_VIEN.NHAN_VIEN });
        if (!staffExists) {
            await NhanVienService.taoNhanVien({
                hoTenNv: 'Nguyễn Thị Thủ Thư',
                password: 'staffPassword123',
                chucVu: CHUC_VU_NHAN_VIEN.NHAN_VIEN,
                soDienThoai: '0977777777',
                luong: 12000000,
            });
        }

        // 6. Độc giả mẫu
        console.log('6. Khởi tạo Độc giả mẫu...');
        const dgEmail = 'docgia.an@gmail.com';
        const dgExists = await DocGia.findOne({ email: dgEmail });
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

        console.log('✨ Khởi tạo dữ liệu mẫu CozyReads thành công theo cấu trúc 8 thực thể mới!');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi seed data:', error);
        process.exit(1);
    }
}

seedData();
