const ChatService = require('../services/chat.service');

// Quản lý Rate Limit đơn giản theo IP (tối đa 20 request / phút)
const ipRequestHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip) {
    const now = Date.now();
    const timestamps = ipRequestHistory.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    ipRequestHistory.set(ip, validTimestamps);
    return true;
}

class ChatController {
    // [POST] /api/chat/message
    static async guiTinNhan(req, res, next) {
        try {
            const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

            // Kiểm tra Rate Limit
            if (!checkRateLimit(clientIp)) {
                return res.status(429).json({
                    success: false,
                    message: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi giây lát rồi thử lại nhé!',
                });
            }

            const { message, history } = req.body;

            if (!message || typeof message !== 'string' || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Nội dung tin nhắn không được để trống.',
                });
            }

            const ketQua = await ChatService.xuLyTinNhan({
                userMessage: message,
                history: Array.isArray(history) ? history.slice(-8) : [],
                user: req.user,
            });

            res.json({
                success: true,
                ...ketQua,
            });
        } catch (error) {
            console.error('[ChatController] Lỗi xử lý tin nhắn:', error.message);
            res.status(500).json({
                success: false,
                message: 'CozySmart đang gặp sự cố kết nối trong giây lát. Bạn vui lòng thử lại sau nhé!',
            });
        }
    }
}

module.exports = ChatController;
