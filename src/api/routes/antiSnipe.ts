import { Router, Request, Response } from 'express';
import {AntiSnipeOverlay, User} from '@streamdota/shared-types';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { sendMessage } from '../../services/websocket';
import { patchAntiSnipeOverlay, requireAntiSnipeOverlay } from '../../services/entity/AntiSnipeOverlay';

const route = Router();

export default (app: Router) => {
    app.use('/antiSnipe', route);

    route.get('/', checkUserFrameAPIKey, requireAuthorization, async (req: Request, res: Response) => {
        const config = await requireAntiSnipeOverlay((req.user as User).id);
        return res.json(config).status(200);
    });
    
    route.patch('/', requireAuthorization, async (req: Request, res: Response) => {
        await patchAntiSnipeOverlay((req.user as User).id, req.body as AntiSnipeOverlay);
        sendMessage((req.user as User).id, 'overlay', true);
        return res.sendStatus(204);
    });
};
