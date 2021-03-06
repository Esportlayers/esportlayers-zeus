import { Router, Request, Response } from 'express';
import {User} from '@streamdota/shared-types';
import {OverlayConfig} from '@streamdota/shared-types';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import { getDotaOverlayByUser, updateOverlay } from '../../services/entity/DotaOverlay';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { sendMessage } from '../../services/websocket';

const route = Router();

export default (app: Router) => {
    app.use('/overlay', route);

    route.get('/', checkUserFrameAPIKey, requireAuthorization, async (req: Request, res: Response) => {
        const config = await getDotaOverlayByUser((req.user as User).id)
        return res.json(config).status(200);
    });
    
    route.patch('/', requireAuthorization, async (req: Request, res: Response) => {
        await updateOverlay((req.user as User).id, req.body as Partial<OverlayConfig>);
        sendMessage((req.user as User).id, 'overlay', true);
        return res.sendStatus(204);
    });
};
