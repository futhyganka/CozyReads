const { disconnectTestDb } = require('./setup');
const testMuonTra = require('./muontra.test');
const testDiemTuDong = require('./diem-tudong.test');
const testTheDocGia = require('./the-docgia.test');
const testThanhToan = require('./thanhtoan.test');
const testPhanQuyen = require('./phanquyen.test');

async function runAllTests() {
    console.log('====================================================');
    console.log('  COZYREADS BUSINESS LOGIC TEST SUITE (TOÀN BỘ)     ');
    console.log('====================================================');
    const start = Date.now();

    try {
        await testPhanQuyen();
        await testMuonTra();
        await testDiemTuDong();
        await testTheDocGia();
        await testThanhToan();

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log('\n====================================================');
        console.log(
            `🎉 TẤT CẢ 5 NHÓM NGHIỆP VỤ ĐÃ VƯỢT QUA TEST THÀNH CÔNG (${duration}s)!`,
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
