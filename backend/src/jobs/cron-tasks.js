const DiemService = require('../services/diem.service');
const DocGiaService = require('../services/docgia.service');

/**
 * Hàm thực thi các tác vụ định kỳ tự động hàng ngày:
 * 1. Tự động kiểm tra và cập nhật trạng thái mượn sách quá hạn ('dangMuon' -> 'quaHan').
 * 2. Tự động quét và trừ điểm đối với các độc giả đang có sách 'quaHan' (1 điểm/ngày).
 * 3. Tự động quét và cộng điểm cho độc giả không vi phạm (cứ mỗi 3 ngày +1 điểm).
 * 4. Tự động quét và xử lý gia hạn thẻ định kỳ (tạo thanh toán cho độc giả tự do, gia hạn 6 tháng miễn phí cho các độc giả khác).
 * 5. Tự động quét các khoản thanh toán gia hạn chưa thanh toán, kiểm tra quá hạn > 7 ngày để khóa thẻ.
 * 6. Tự động quét và hủy thẻ sinh viên đã tốt nghiệp và hết hạn thẻ.
 */
async function runDailyCronTasks(thoiDiem = new Date()) {
    console.log(
        `[CRON] Bắt đầu chạy tác vụ tự động hàng ngày: ${new Date(thoiDiem).toISOString()}`,
    );

    // 1. Kiểm tra và cập nhật trạng thái các lượt mượn quá ngày hẹn trả sang 'quaHan'
    const soLuongCapNhatQuaHan =
        await DiemService.kiemTraVaCapNhatTrangThaiMuonSach(thoiDiem);
    console.log(
        `[CRON] Đã cập nhật trạng thái quá hạn: ${soLuongCapNhatQuaHan} lượt mượn.`,
    );

    // 2. Quét và trừ điểm độc giả có sách quá hạn
    const dsTruDiem = await DiemService.quetVaTruDiemQuaHan(thoiDiem);
    console.log(
        `[CRON] Đã trừ điểm độc giả có sách quá hạn: ${dsTruDiem.length} độc giả.`,
    );

    // 3. Quét và cộng điểm độc giả không vi phạm
    const dsCongDiem = await DiemService.quetVaCongDiemKhongViPham(thoiDiem);
    console.log(
        `[CRON] Đã cộng điểm không vi phạm: ${dsCongDiem.length} độc giả.`,
    );

    // 4. Tự động quét và xử lý gia hạn thẻ định kỳ
    const dsXuLyGiaHan =
        await DocGiaService.quetVaXuLyGiaHanThe(thoiDiem);
    console.log(
        `[CRON] Đã quét và xử lý gia hạn thẻ định kỳ: ${dsXuLyGiaHan.length} độc giả.`,
    );

    // 5. Khóa thẻ độc giả tự do nợ khoản thanh toán gia hạn quá hạn hơn 7 ngày
    const dsKhoaThe = await DocGiaService.quetVaKhoaTheDocGiaTuDo(thoiDiem);
    console.log(
        `[CRON] Đã khóa thẻ độc giả tự do nợ phí gia hạn: ${dsKhoaThe.length} độc giả.`,
    );

    // 6. Hủy thẻ sinh viên tốt nghiệp hết hạn
    const dsHuyThe =
        await DocGiaService.quetVaHuyTheSinhVienTotNghiep(thoiDiem);
    console.log(
        `[CRON] Đã hủy thẻ sinh viên tốt nghiệp: ${dsHuyThe.length} sinh viên.`,
    );

    return {
        soLuongCapNhatQuaHan,
        dsTruDiem,
        dsCongDiem,
        dsXuLyGiaHan,
        dsKhoaThe,
        dsHuyThe,
    };
}

module.exports = {
    runDailyCronTasks,
};
