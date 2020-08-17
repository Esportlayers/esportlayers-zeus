import { Router, Request, Response } from 'express';
import { sendMessage } from '../../services/websocket';

const route = Router();

export default (app: Router) => {
    app.use('/casting', route);

    route.get('/wsEvent/:userId/:type', async (req: Request, res: Response) => {

        sendMessage(+req.params.userId, req.params.type, req.body);
        return res.json(undefined).status(204);
    });
};
