import express from 'express';
import bodyParser from 'body-parser';
import routes from '../api';
import cors from 'cors';


export default async ({ app }: { app: express.Application}) => {
    app.use(cors());

    app.use('/static', express.static('static', {
        maxAge: '31536000'
    }));

    /** health check endpoints */
    app.get('/status', (req, res) => res.status(200).end());
    app.head('/status', (req, res) => res.status(200).end());

    app.use(bodyParser.json());
    app.use(routes());
};
