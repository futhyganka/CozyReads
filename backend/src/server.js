const app = require('./app.js');
const db = require('./config/db.js');
const config = require('./config/index.js');
const AuthService = require('./services/auth.service.js');
const { runDailyCronTasks } = require('./jobs/cron-tasks.js');

async function startServer() {
    await db.connect();

    // Khởi tạo bảng vai trò & quyền hạn mặc định
    await AuthService.khoiTaoVaiTroMacDinh();

    // Chạy tác vụ quét điểm và hạn thẻ khi khởi động
    runDailyCronTasks().catch((err) => console.error('[CRON ERROR]', err));

    // Lặp lại tự động mỗi 24 giờ (86.400.000 ms)
    setInterval(
        () => {
            runDailyCronTasks().catch((err) =>
                console.error('[CRON ERROR]', err),
            );
        },
        24 * 60 * 60 * 1000,
    );

    app.listen(config.app.port, () => {
        console.log(
            `CozyReads Backend Server listening on port ${config.app.port}`,
        );
    });
}

startServer();
