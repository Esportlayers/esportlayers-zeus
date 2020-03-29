import { Router, Request, Response } from 'express';
import { checkGSIAuth, gsiBodyParser, checkLiveGSIAuth } from '../../middleware/dotaGsi';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createGsiAuthToken } from '../../services/entity/User';
import { User } from '../../@types/Entities/User';
import { generateConfig } from '../../services/gsiConfigGenerator';
import path from 'path';
import ws from 'ws';

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

  route.ws('/live/:gsiAuth', checkLiveGSIAuth, (ws: ws, req: Request) => {
    ws.on('message', (msg: string) => {
      //@ts-ignore
      console.log('got message from', ws.user.displayName, 'with content', msg);
      ws.send(msg);
    })
  })
};