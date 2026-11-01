const databaseName = 'CozyReads';
const mongoURI = `mongodb://127.0.0.1:27017/${databaseName}`;
const port = 3000;

const config = {
    app: {
        port: process.env.PORT || port,
    },
    db: {
        url: process.env.MONGODB_URL || mongoURI,
    },
};

module.exports = config;
