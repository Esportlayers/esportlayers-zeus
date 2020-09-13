import { Router, Request, Response } from 'express';
import { checkGSIAuth, gsiBodyParser, newGsiListener } from '../../middleware/dotaGsi';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createGsiAuthToken, resetDotaGsi } from '../../services/entity/User';
import {User} from '@streamdota/shared-types';
import { generateConfig } from '../../services/gsiConfigGenerator';
import path from 'path';
import ws from 'ws';
import { heartbeat } from '../../tasks/websocketHeartbeat';
import { checkUserFrameWebsocketApiKey } from '../../middleware/frameApi';

const route = Router();

export default (app: Router) => {
  app.use('/dota-gsi', route);

  route.post('/', checkGSIAuth, gsiBodyParser, (req: Request, res: Response) => res.end());

  route.get('/generateConfig', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const gsiAuth = await createGsiAuthToken(user.id);
    const [filename, configPath] = generateConfig(gsiAuth, user.displayName);

    res.set({"Content-Disposition":`attachment; filename=${filename}`});
    res.sendFile(path.resolve(configPath));
  });


  route.delete('/resetGsi', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await resetDotaGsi(user.id);

    return res.sendStatus(204);
  });

  route.ws('/live/:frameApiKey', checkUserFrameWebsocketApiKey, async (conn: ws, req: Request) => {
    //@ts-ignore
    conn.isAlive = true;
    conn.on('pong', heartbeat);
    newGsiListener((req.user as User).id);
  });
};