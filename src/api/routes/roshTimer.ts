import { Router, Request, Response } from 'express';
import {User} from '@streamdota/shared-types';
import {OverlayConfig} from '@streamdota/shared-types';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { requireRoshOverlay, patchRoshOverlay } from '../../services/entity/RoshOverlay';

const route = Router();

export default (app: Router) => {
    app.use('/roshTimer', route);

    route.get('/', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const config = await requireRoshOverlay((req.user as User).id);
        return res.json(config).status(200);
    });
    
    route.patch('/', reuqireAuthorization, async (req: Request, res: Response) => {
        const config = await patchRoshOverlay((req.user as User).id, req.body as OverlayConfig);
        return res.json(config).status(200);
    });
};
