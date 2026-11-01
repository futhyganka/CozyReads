const mongoose = require('mongoose');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/CozyReads_Test_DB';

async function connectTestDb() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(TEST_DB_URI);
    }
}

async function clearTestDb() {
    if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
}

async function disconnectTestDb() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
}

module.exports = {
    connectTestDb,
    clearTestDb,
    disconnectTestDb,
};
