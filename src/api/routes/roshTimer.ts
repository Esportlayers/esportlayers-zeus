import { Router, Request, Response } from 'express';
import {User} from '@streamdota/shared-types';
import {OverlayConfig} from '@streamdota/shared-types';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { requireRoshOverlay, patchRoshOverlay } from '../../services/entity/RoshOverlay';
import { sendMessage } from '../../services/websocket';

const route = Router();

export default (app: Router) => {
    app.use('/roshTimer', route);

    route.get('/', checkUserFrameAPIKey, requireAuthorization, async (req: Request, res: Response) => {
        const config = await requireRoshOverlay((req.user as User).id);
        return res.json(config).status(200);
    });
    
    route.patch('/', requireAuthorization, async (req: Request, res: Response) => {
        await patchRoshOverlay((req.user as User).id, req.body as OverlayConfig);
        sendMessage((req.user as User).id, 'overlay', true);
        return res.sendStatus(204);
    });
};
