const { start } = require('repl');
const webServer = require('./services/web-server.js');

async function startup() {
    console.log('Starting application');

    try {
        console.log('Initializing web server module');

        await webServer.initialise();
    } catch (err) {
        console.log(err);

        process.exit(1);
    }
}

startup();

async function shutdown(e) {
    let err = e;

    console.log('Shutting down');

    try {
        console.log('Closing web server module');

        await webServer.close();
    } catch (e) {
        console.log('Encountered error', e);

        err = err || e;
    }

    console.log('Exiting process');

    if (err) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// process.on('SGITERM', () => {
//     console.log('Received SIGTERM');

//     shutdown();
// });

// process.on('SIGINT', () => {
//     console.log('Received SIGINT');

//     shutdown();
// });

process.on('uncaughtException', err => {
    console.log('Uncaught exception');
    console.error(err);

    shutdown();
});