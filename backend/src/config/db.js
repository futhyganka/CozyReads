const mongoose = require('mongoose');
const config = require('./index');

async function connect() {
    try {
        // Kết nối với mongoose
        await mongoose.connect(config.db.url);
        console.log('Connect successfully!!!');
    } catch (error) {
        process.exit(1);
    }
}

module.exports = { connect };
