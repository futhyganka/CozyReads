const express = require('express');
const router = express.Router();

const sachController = require('../controllers/sach.controller');

router.get('/', (req, res) => {
    sachController.getAllSach(req, res);
});

module.exports = router;
