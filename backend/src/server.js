const app = require('./app.js');
const db = require('./config/db.js');
const config = require('./config/index.js');

async function startServer() {
    db.connect();
    app.listen(config.app.port, () => {
        console.log(`App listening on port ${config.app.port}`);
    });
}

startServer();
