const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// [POST] /api/chat/message (Khách và Độc giả đều truy cập được, tự động nhận diện tài khoản nếu có token)
router.post('/message', authenticate, ChatController.guiTinNhan);

module.exports = router;
