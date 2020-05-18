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
        Sentry.init({ dsn: config.sentryDSN });
        console.log(green(`🐞 Registered sentry`));
        app.use(Sentry.Handlers.requestHandler({request: true, user: ['id', 'twitchId', 'displayName']}));
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

startServer();
