const assert = require('assert');
const { connectTestDb, clearTestDb } = require('./setup');
const { PhanHoi, DocGia } = require('../src/models');
const AuthService = require('../src/services/auth.service');
const NhanVienService = require('../src/services/nhanvien.service');
const PhanHoiService = require('../src/services/phanhoi.service');
const PhanHoiController = require('../src/controllers/phanhoi.controller');
const MailService = require('../src/services/mail.service');
const {
    requireAuth,
    checkPermission,
} = require('../src/middlewares/auth.middleware');
const { PERMISSIONS, ROLES } = require('../src/constants/permissions');
const {
    LOAI_PHAN_HOI,
    TRANG_THAI_PHAN_HOI,
    CHUC_VU_NHAN_VIEN,
} = require('../src/constants/business-rules');

async function runLienHeGopYTests() {
    console.log('\n--- BẮT ĐẦU TEST: tests/lienhe-gopy.test.js ---');
    await connectTestDb();
    await clearTestDb();

    // Khởi tạo dữ liệu Nhân viên, Admin và Độc giả
    const nhanVien = await NhanVienService.taoNhanVien({
        hoTenNv: 'Trần Thủ Thư',
        password: 'StaffPassword@123',
        chucVu: CHUC_VU_NHAN_VIEN.NHAN_VIEN,
        soDienThoai: '0911222333',
    });

    const admin = await NhanVienService.taoNhanVien({
        hoTenNv: 'Nguyễn Quản Trị',
        password: 'AdminPassword@123',
        chucVu: CHUC_VU_NHAN_VIEN.ADMIN,
        soDienThoai: '0944555666',
    });

    const hashedPassword = await AuthService.bamMatKhau('ReaderPass@123');
    const docGia = await DocGia.create({
        maDocGia: 'DGA0000001',
        hoLot: 'Lê Minh',
        ten: 'Tâm',
        dienThoai: '0987654321',
        email: 'leminhtam@example.com',
        password: hashedPassword,
    });

    // 1. Tạo dữ liệu Liên hệ và Góp ý (ẩn danh + định danh)
    console.log(
        'Case 1: Độc giả tạo Liên hệ (không lưu trùng họ tên/email/SĐT) & tạo Góp ý (ẩn danh + định danh)',
    );
    const lienHe1 = await PhanHoiService.taoLienHe({
        docGiaId: docGia._id,
        noiDung: 'Cho tôi hỏi thủ tục gia hạn thẻ độc giả tự do gói 3 tháng.',
    });
    const lienHe2 = await PhanHoiService.taoLienHe({
        docGiaId: docGia._id,
        noiDung: 'Tôi cần hỗ trợ kiểm tra lịch sử mượn sách.',
    });

    // Kiểm tra bản ghi raw trong MongoDB không lưu trùng hoTen, email, dienThoai, anDanh, chuDe...
    const rawLienHe = await PhanHoi.collection.findOne({ _id: lienHe1._id });
    assert.strictEqual(rawLienHe.loai, LOAI_PHAN_HOI.LIEN_HE);
    assert.strictEqual(rawLienHe.hoTen, undefined);
    assert.strictEqual(rawLienHe.email, undefined);
    assert.strictEqual(rawLienHe.dienThoai, undefined);
    assert.strictEqual(rawLienHe.anDanh, undefined);

    const gopYAnDanh = await PhanHoiService.taoGopY({
        docGiaId: null,
        noiDung: 'Góp ý bổ sung thêm bàn đọc sách khu vực tầng 2.',
    });
    const gopYDinhDanh = await PhanHoiService.taoGopY({
        docGiaId: docGia._id,
        noiDung: 'Website tra cứu sách rất nhanh và dễ dùng.',
    });

    assert.strictEqual(gopYAnDanh.maDocGia, null);
    assert.strictEqual(
        gopYDinhDanh.maDocGia._id.toString(),
        docGia._id.toString(),
    );

    // 2. Trang Quản lý liên hệ chỉ lấy dữ liệu lienHe & Nhân viên/Admin đều xem được
    console.log(
        'Case 2: Nhân viên & Admin xem danh sách Liên hệ (chỉ trả về loai = lienHe)',
    );
    let nvListLienHe = null;
    await PhanHoiController.getDanhSachLienHe(
        {
            user: { _id: nhanVien._id, role: ROLES.NHANVIEN, maVaiTro: ROLES.NHANVIEN },
            query: {},
        },
        {
            json: (payload) => {
                nvListLienHe = payload;
            },
        },
        (err) => {
            throw err;
        },
    );
    assert.strictEqual(nvListLienHe.success, true);
    assert.strictEqual(nvListLienHe.total, 2);
    assert(
        nvListLienHe.data.every((item) => item.loai === LOAI_PHAN_HOI.LIEN_HE),
        'Danh sách Quản lý liên hệ chỉ được chứa bản ghi loai = lienHe',
    );

    let adminListLienHe = null;
    await PhanHoiController.getDanhSachLienHe(
        {
            user: {
                _id: admin._id,
                role: ROLES.QUANTRIVIEN,
                maVaiTro: ROLES.QUANTRIVIEN,
            },
            query: {},
        },
        {
            json: (payload) => {
                adminListLienHe = payload;
            },
        },
        (err) => {
            throw err;
        },
    );
    assert.strictEqual(adminListLienHe.success, true);
    assert.strictEqual(adminListLienHe.total, 2);

    // 3. Trang Quản lý góp ý chỉ lấy dữ liệu gopY & Nhân viên/Admin xử lý góp ý thành công
    console.log(
        'Case 3: Trang Quản lý góp ý chỉ lấy loai = gopY & Nhân viên/Admin xử lý góp ý (choXuLy -> dangXuLy -> daXuLy)',
    );
    let nvListGopY = null;
    await PhanHoiController.getDanhSachGopY(
        {
            user: { _id: nhanVien._id, role: ROLES.NHANVIEN, maVaiTro: ROLES.NHANVIEN },
            query: {},
        },
        {
            json: (payload) => {
                nvListGopY = payload;
            },
        },
        (err) => {
            throw err;
        },
    );
    assert.strictEqual(nvListGopY.total, 2);
    assert(
        nvListGopY.data.every((item) => item.loai === LOAI_PHAN_HOI.GOP_Y),
        'Danh sách Quản lý góp ý chỉ được chứa bản ghi loai = gopY',
    );

    // Tiếp nhận góp ý: choXuLy -> dangXuLy
    const gopYDangXuLy = await PhanHoiService.capNhatTrangThai(
        gopYAnDanh._id,
        {
            trangThai: TRANG_THAI_PHAN_HOI.DANG_XU_LY,
            msnvId: nhanVien._id,
            expectedLoai: LOAI_PHAN_HOI.GOP_Y,
        },
    );
    assert.strictEqual(gopYDangXuLy.trangThai, TRANG_THAI_PHAN_HOI.DANG_XU_LY);
    assert.strictEqual(
        gopYDangXuLy.msnvXuLy._id.toString(),
        nhanVien._id.toString(),
    );

    // Đánh dấu đã xử lý góp ý: dangXuLy -> daXuLy bởi Admin
    const gopYDaXuLy = await PhanHoiService.capNhatTrangThai(gopYAnDanh._id, {
        trangThai: TRANG_THAI_PHAN_HOI.DA_XU_LY,
        msnvId: admin._id,
        expectedLoai: LOAI_PHAN_HOI.GOP_Y,
    });
    assert.strictEqual(gopYDaXuLy.trangThai, TRANG_THAI_PHAN_HOI.DA_XU_LY);
    assert.strictEqual(gopYDaXuLy.msnvXuLy._id.toString(), admin._id.toString());

    // 4. Khách và Độc giả bị chặn khi truy cập API quản lý
    console.log(
        'Case 4: Khách và Độc giả không thể truy cập API quản lý Liên hệ / Góp ý',
    );
    const checkManagePerm = checkPermission(PERMISSIONS.FEEDBACKS_MANAGE);

    let guestErr = null;
    requireAuth({ user: { role: ROLES.KHACH, maVaiTro: ROLES.KHACH } }, {}, (e) => {
        guestErr = e;
    });
    assert(guestErr && guestErr.statusCode === 401, 'Khách phải bị chặn 401');

    let readerErr = null;
    checkManagePerm(
        { user: { _id: docGia._id, role: ROLES.DOCGIA, maVaiTro: ROLES.DOCGIA } },
        {},
        (e) => {
            readerErr = e;
        },
    );
    assert(
        readerErr && readerErr.statusCode === 403,
        'Độc giả phải bị chặn 403 khi gọi API quản lý Liên hệ / Góp ý',
    );

    // 5. Không cho phép gửi phản hồi rỗng & Không cho phép gọi API phản hồi liên hệ đối với phiếu Góp ý
    console.log(
        'Case 5: Chặn gửi phản hồi rỗng & chặn gọi API phản hồi Email đối với phiếu Góp ý',
    );
    let emptyReplyErr = null;
    try {
        await PhanHoiService.guiPhanHoiLienHeQuaEmail(lienHe1._id, {
            noiDungPhanHoi: '   ',
            msnvId: nhanVien._id,
        });
    } catch (err) {
        emptyReplyErr = err;
    }
    assert(
        emptyReplyErr && emptyReplyErr.statusCode === 400,
        'Phải chặn gửi phản hồi khi nội dung rỗng',
    );

    let gopYReplyErr = null;
    try {
        await PhanHoiService.guiPhanHoiLienHeQuaEmail(gopYDinhDanh._id, {
            noiDungPhanHoi: 'Thử gửi mail cho góp ý',
            msnvId: nhanVien._id,
        });
    } catch (err) {
        gopYReplyErr = err;
    }
    assert(
        gopYReplyErr && gopYReplyErr.statusCode === 400,
        'Không cho phép gọi API phản hồi liên hệ đối với phiếu Góp ý',
    );

    // 6. Khi SMTP gửi thất bại -> Phiếu không được chuyển thành daXuLy
    console.log(
        'Case 6: Khi SMTP gửi thất bại, phiếu Liên hệ không được chuyển thành daXuLy',
    );
    const originalGetTransporter = MailService.getTransporter;
    let sentMailOptions = [];

    MailService.getTransporter = () => ({
        sendMail: async () => {
            throw new Error('SMTP connection timeout');
        },
    });

    let smtpFailErr = null;
    try {
        await PhanHoiService.guiPhanHoiLienHeQuaEmail(lienHe1._id, {
            noiDungPhanHoi: 'Nội dung phản hồi khi SMTP lỗi.',
            msnvId: nhanVien._id,
        });
    } catch (err) {
        smtpFailErr = err;
    }
    assert(smtpFailErr && smtpFailErr.statusCode === 502);

    const checkAfterFail = await PhanHoi.findById(lienHe1._id);
    assert.strictEqual(
        checkAfterFail.trangThai,
        TRANG_THAI_PHAN_HOI.CHO_XU_LY,
        'Khi SMTP lỗi, trạng thái không được cập nhật thành daXuLy',
    );
    assert.strictEqual(checkAfterFail.noiDungPhanHoi, '');

    // 7. Nhân viên nhập nội dung phản hồi & gửi Email thành công + Kiểm tra đúng địa chỉ, đúng template, không lộ tên/msnv người xử lý
    console.log(
        'Case 7: Gửi phản hồi Email thành công, đúng địa chỉ độc giả, đúng template & không lộ thông tin nhân viên xử lý',
    );
    MailService.getTransporter = () => ({
        sendMail: async (mailOptions) => {
            sentMailOptions.push(mailOptions);
            return { messageId: 'mock-msg-id-1' };
        },
    });

    const noiDungTraLoi =
        'Bạn có thể gia hạn gói 3 tháng (55.000đ) trực tiếp tại mục Phí & Thanh toán trên website <CozyReads>.';
    const repliedLienHe = await PhanHoiService.guiPhanHoiLienHeQuaEmail(
        lienHe1._id,
        {
            noiDungPhanHoi: noiDungTraLoi,
            msnvId: nhanVien._id,
        },
    );

    assert.strictEqual(repliedLienHe.trangThai, TRANG_THAI_PHAN_HOI.DA_XU_LY);
    assert.strictEqual(repliedLienHe.noiDungPhanHoi, noiDungTraLoi);
    assert.strictEqual(
        repliedLienHe.msnvXuLy._id.toString(),
        nhanVien._id.toString(),
    );
    assert.strictEqual(sentMailOptions.length, 1);

    const mailSent = sentMailOptions[0];
    assert.strictEqual(mailSent.to, 'leminhtam@example.com');
    assert.strictEqual(
        mailSent.subject,
        '[CozyReads] Phản hồi yêu cầu liên hệ',
    );
    // Kiểm tra nội dung template
    assert(mailSent.text.includes('Kính gửi Lê Minh Tâm,'));
    assert(
        mailSent.text.includes(
            'Thư viện CozyReads xin phản hồi yêu cầu liên hệ của bạn như sau:',
        ),
    );
    assert(mailSent.text.includes(`Mã liên hệ: ${lienHe1.maPhanHoi}`));
    assert(mailSent.text.includes('Nội dung phản hồi:'));
    assert(mailSent.text.includes(noiDungTraLoi));
    assert(
        mailSent.text.includes(
            'Nếu cần hỗ trợ thêm, bạn có thể tiếp tục liên hệ với thư viện qua website CozyReads.',
        ),
    );
    assert(mailSent.text.includes('Thư viện CozyReads'));

    // Kiểm tra escape HTML an toàn
    assert(mailSent.html.includes('&lt;CozyReads&gt;'));

    // Quy định quan trọng: Tuyệt đối không chứa tên nhân viên hoặc msnvXuLy trong Email
    assert(!mailSent.text.includes(nhanVien.hoTenNv));
    assert(!mailSent.text.includes(nhanVien.msnv));
    assert(!mailSent.html.includes(nhanVien.hoTenNv));
    assert(!mailSent.html.includes(nhanVien.msnv));

    // 8. Kiểm tra cơ chế Idempotency khi gửi Email thành công nhưng lưu MongoDB gặp lỗi tạm thời ở lần 1
    console.log(
        'Case 8: Chống gửi trùng Email (Idempotency) khi SMTP thành công nhưng lưu MongoDB thất bại ở lần đầu',
    );
    sentMailOptions = [];
    const originalSave = PhanHoi.prototype.save;
    let failFirstSave = true;
    PhanHoi.prototype.save = async function (...args) {
        if (failFirstSave && this._id.toString() === lienHe2._id.toString()) {
            failFirstSave = false;
            throw new Error('Simulated transient DB write error');
        }
        return originalSave.apply(this, args);
    };

    try {
        await PhanHoiService.guiPhanHoiLienHeQuaEmail(lienHe2._id, {
            noiDungPhanHoi: 'Phản hồi cho liên hệ số 2.',
            msnvId: admin._id,
        });
    } catch {
        // Lần 1 thất bại ở bước save DB sau khi SMTP đã gửi
    }
    assert.strictEqual(
        sentMailOptions.length,
        1,
        'SMTP đã gửi 1 lần ở lần thử đầu tiên',
    );

    // Thử lại lần 2 với cùng nội dung phản hồi -> Không gửi lại mail trùng, cập nhật DB thành công
    const retryResult = await PhanHoiService.guiPhanHoiLienHeQuaEmail(
        lienHe2._id,
        {
            noiDungPhanHoi: 'Phản hồi cho liên hệ số 2.',
            msnvId: admin._id,
        },
    );
    assert.strictEqual(
        sentMailOptions.length,
        1,
        'Idempotency: Không được gửi trùng Email lần thứ 2 khi thử lại',
    );
    assert.strictEqual(retryResult.trangThai, TRANG_THAI_PHAN_HOI.DA_XU_LY);

    // Khôi phục hàm gốc
    PhanHoi.prototype.save = originalSave;
    MailService.getTransporter = originalGetTransporter;

    console.log('✅ tests/lienhe-gopy.test.js PASSED ALL CHECKS!');
}

module.exports = runLienHeGopYTests;

if (require.main === module) {
    const { disconnectTestDb } = require('./setup');
    runLienHeGopYTests()
        .catch((err) => {
            console.error(err);
            process.exitCode = 1;
        })
        .finally(() => disconnectTestDb());
}
