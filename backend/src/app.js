const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { authenticate } = require('./middlewares/auth.middleware');

const app = express();

const allowedOrigins = (config.app.corsOrigin || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Cho phép request cùng origin / server-to-server hoặc nằm trong danh sách cho phép
            if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Truy cập bị từ chối bởi chính sách bảo mật CORS.'));
        },
        credentials: true,
    }),
);
app.use(express.json({ limit: '1mb' }));

// Xác thực JWT token
app.use(authenticate);

// API Routes
app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với hệ thống thư viện CozyReads API.' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
