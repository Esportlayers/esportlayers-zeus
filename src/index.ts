import config from './config';
import express from 'express';
import fs from 'fs';
import https from 'https';
import http from 'http';
import {green} from 'chalk';
import passport from 'passport';
import expressWs from 'express-ws';

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
    const server  = config.server.secure ? https.createServer({key, cert, ca}, app) : http.createServer(app);
    WebsocketInstance = expressWs(app, server);
    await require('./loader').default({app, passport});
    server.listen(config.port, () => {
        console.log(green(`API started on: ${config.port}`));
    });
}

startServer();
