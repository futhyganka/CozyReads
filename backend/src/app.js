const express = require('express');
const cors = require('cors');
const app = express();

const sachRoutes = require('./routes/sach.route');

app.use(cors());
app.use(express.json());

app.use('/api/sach', sachRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to contact book application.' });
});

module.exports = app;
