const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

// Fake hoặc giải mã JWT user middleware cho demo (nếu có header x-user-role)
app.use((req, res, next) => {
    const roleHeader = req.headers['x-user-role'];
    if (roleHeader) {
        req.user = { maVaiTro: roleHeader };
    }
    next();
});

// API Routes
app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với hệ thống thư viện CozyReads API.' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
