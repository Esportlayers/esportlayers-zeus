import express from 'express';
import bodyParser from 'body-parser';
import routes from '../api';
import cors from 'cors';
import { PassportStatic } from 'passport';


export default async ({ app, passport }: { app: express.Application; passport: PassportStatic}) => {
    app.use(cors({
        exposedHeaders: 'Content-Disposition'
    }));

    app.use('/static', express.static('static', {
        maxAge: '31536000'
    }));

    /** health check endpoints */
    app.get('/status', (req, res) => res.status(200).end());
    app.head('/status', (req, res) => res.status(200).end());

    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(routes({passport}));
};
