const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { authenticate } = require('./middlewares/auth.middleware');

const app = express();

app.use(cors());
app.use(express.json());

// Xác thực JWT token hoặc header x-user-role
app.use(authenticate);

// API Routes
app.use('/api', routes);

app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với hệ thống thư viện CozyReads API.' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
