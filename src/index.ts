import config from './config';
import express from 'express';
import http from 'http';
import {green} from 'chalk';
import passport from 'passport';
import expressWs from 'express-ws';
import './tasks';
import './services/twitchChat';
import * as Sentry from '@sentry/node';
import * as Apm from '@sentry/apm';

export let WebsocketInstance: expressWs.Instance;

async function startServer() {
    const app = express();
    const useSentryDsn = config.sentryDSN.length > 0;

    if(useSentryDsn) {
        Sentry.init({
            dsn: config.sentryDSN,
            integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // enable Express.js middleware tracing
            new Apm.Integrations.Express({ app }),
            ],
            tracesSampleRate: .005, // Be sure to lower this in production
        });
        console.log(green(`🐞 Registered sentry`));
        app.use(Sentry.Handlers.requestHandler({request: true, user: ['id', 'twitchId', 'displayName']}));
        app.use(Sentry.Handlers.tracingHandler());
    }

    const server = http.createServer(app);
    WebsocketInstance = expressWs(app, server);
    await require('./loader').default({app, passport});

    if(useSentryDsn) {
        app.use(Sentry.Handlers.errorHandler());
    }
    
    server.listen(config.port, () => {
        console.log(green(`API started on: ${config.port}`));
    });
}


if(process.env.NODE_ENV !== 'test') {
    startServer();
}
