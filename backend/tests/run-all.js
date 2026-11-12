const { disconnectTestDb } = require('./setup');
const testMuonTra = require('./muontra.test');
const testDiemTuDong = require('./diem-tudong.test');
const testTheDocGia = require('./the-docgia.test');
const testThanhToan = require('./thanhtoan.test');
const testPhanQuyen = require('./phanquyen.test');
const testCRUDToanBo = require('./crud-toan-bo.test');
const testRaSoatNghiepVu = require('./ra-soat-nghiep-vu.test');
const testKiemTraCuoiCung = require('./kiem-tra-cuoi-cung.test');
const testXacThucEmail = require('./xac-thuc-email.test');

async function runAllTests() {
    console.log('====================================================');
    console.log('  COZYREADS BUSINESS LOGIC & CRUD TEST SUITE        ');
    console.log('====================================================');
    const start = Date.now();

    try {
        await testPhanQuyen();
        await testMuonTra();
        await testDiemTuDong();
        await testTheDocGia();
        await testThanhToan();
        await testCRUDToanBo();
        await testRaSoatNghiepVu();
        await testKiemTraCuoiCung();
        await testXacThucEmail();

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log('\n====================================================');
        console.log(
            `🎉 TẤT CẢ 9 BỘ TEST (TOÀN BỘ NGHIỆP VỤ & XÁC THỰC EMAIL) ĐÃ VƯỢT QUA TEST THÀNH CÔNG (${duration}s)!`,
        );
        console.log('====================================================');
    } catch (error) {
        console.error('\n❌ TEST RUNNER GẶP LỖI:', error);
        process.exitCode = 1;
    } finally {
        await disconnectTestDb();
    }
}

runAllTests();
