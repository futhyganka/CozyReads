const DiemService = require('../services/diem.service');
const DocGiaService = require('../services/docgia.service');

/**
 * Hàm thực thi các tác vụ định kỳ tự động hàng ngày:
 * 1. Tự động quét và trừ điểm sách quá hạn đang giữ (1 điểm/ngày).
 * 2. Tự động quét và cộng điểm cho độc giả không vi phạm (cứ mỗi 3 ngày +1 điểm).
 * 3. Tự động quét và khóa thẻ độc giả tự do nợ phí gia hạn quá 7 ngày.
 * 4. Tự động quét và hủy thẻ sinh viên đã tốt nghiệp và hết hạn thẻ.
 */
async function runDailyCronTasks(thoiDiem = new Date()) {
    console.log(
        `[CRON] Bắt đầu chạy tác vụ tự động hàng ngày: ${new Date(thoiDiem).toISOString()}`,
    );

    // 1. Quét và trừ điểm quá hạn
    const dsTruDiem = await DiemService.quetVaTruDiemQuaHan(thoiDiem);
    console.log(
        `[CRON] Đã xử lý trừ điểm quá hạn: ${dsTruDiem.length} lượt mượn.`,
    );

    // 2. Quét và cộng điểm độc giả không vi phạm
    const dsCongDiem = await DiemService.quetVaCongDiemKhongViPham(thoiDiem);
    console.log(
        `[CRON] Đã cộng điểm không vi phạm: ${dsCongDiem.length} độc giả.`,
    );

    // 3. Khóa thẻ độc giả tự do quá hạn 7 ngày
    const dsKhoaThe = await DocGiaService.quetVaKhoaTheDocGiaTuDo(thoiDiem);
    console.log(
        `[CRON] Đã khóa thẻ độc giả tự do nợ phí: ${dsKhoaThe.length} độc giả.`,
    );

    // 4. Hủy thẻ sinh viên tốt nghiệp hết hạn
    const dsHuyThe =
        await DocGiaService.quetVaHuyTheSinhVienTotNghiep(thoiDiem);
    console.log(
        `[CRON] Đã hủy thẻ sinh viên tốt nghiệp: ${dsHuyThe.length} sinh viên.`,
    );

    return {
        dsTruDiem,
        dsCongDiem,
        dsKhoaThe,
        dsHuyThe,
    };
}

module.exports = {
    runDailyCronTasks,
};
