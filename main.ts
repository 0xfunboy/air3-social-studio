import { bootstrap } from './src/core/bootstrap.js';
import { createApp } from './src/api/server.js';
import { resolve } from 'node:path';
const app = bootstrap();
const server = createApp(app.studio, app.auth, resolve('web'));
server.listen(app.cfg.port, app.cfg.host, () => {
    console.log(`AIR3 Social Studio: ${app.cfg.baseUrl}`);
    if (app.cfg.worker) {
        app.worker.start();
        app.oauth.startMaintenance();
    }
});
let closing = false;
async function stop() {
    if (closing)
        return;
    closing = true;
    await Promise.all([new Promise<void>(r => server.close(() => r())), app.worker.stop(), app.oauth.stopMaintenance()]);
    app.store.close();
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
