import { Router, Request, Response } from 'express';
import {User} from '@streamdota/shared-types';
import {OverlayConfig} from '@streamdota/shared-types';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { getDotaOverlayByUser, updateOverlay } from '../../services/entity/DotaOverlay';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';

const route = Router();

export default (app: Router) => {
    app.use('/overlay', route);

    route.get('/', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const config = await getDotaOverlayByUser((req.user as User).id)
        return res.json(config).status(200);
    });
    
    route.patch('/', reuqireAuthorization, async (req: Request, res: Response) => {
        const config = await updateOverlay((req.user as User).id, req.body as OverlayConfig);
        return res.json(config).status(200);
    });
};
