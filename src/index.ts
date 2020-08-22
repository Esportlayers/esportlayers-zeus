import config from './config';
import express from 'express';
import fs from 'fs';
import https from 'https';
import http from 'http';
import {green} from 'chalk';
import passport from 'passport';
import expressWs from 'express-ws';
import './tasks';
import './services/twitchChat';
import * as Sentry from '@sentry/node';
import * as Apm from '@sentry/apm';


let key: string;
let cert: string;
let ca: string;

if(config.server.secure) {
    key = fs.readFileSync(config.server.certs.basePath + config.server.certs.key, 'utf8');
    cert = fs.readFileSync(config.server.certs.basePath + config.server.certs.cert, 'utf8');
    ca = fs.readFileSync(config.server.certs.basePath + config.server.certs.chain, 'utf8');
}

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
            tracesSampleRate: 1.0, // Be sure to lower this in production
        });
  
        console.log(green(`🐞 Registered sentry`));
        app.use(Sentry.Handlers.requestHandler({request: true, user: ['id', 'twitchId', 'displayName']}));
        app.use(Sentry.Handlers.tracingHandler());
    }
    const server  = config.server.secure ? https.createServer({key, cert, ca}, app) : http.createServer(app);
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
