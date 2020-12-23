import { Router, Request, Response } from 'express';
import { checkGSIAuth, checkRecordingGSIAuth, gsiBodyParser, newGsiListener } from '../../middleware/dotaGsi';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createGsiAuthToken, resetDotaGsi } from '../../services/entity/User';
import {User} from '@streamdota/shared-types';
import { generateConfig } from '../../services/gsiConfigGenerator';
import path from 'path';
import ws from 'ws';
import { heartbeat } from '../../tasks/websocketHeartbeat';
import { checkUserFrameWebsocketApiKey } from '../../middleware/frameApi';
import fs from 'fs';
import { parseEvents } from '@esportlayers/morphling';
import { sendMessage } from '../../services/websocket';
import { checkGSIAuthToken, newGSIListener } from '../../middleware/gsiConnection';

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


  route.post('/v2', checkGSIAuthToken, async (req: Request, res: Response) => {
    const user = req.user as User;
    const events = await parseEvents(req.body, '' + user.id);
    events.length && console.log(events);
    for(const {event, value} of events) {
      sendMessage(user.id, event, value);
    }
    return res.end()
  });

  route.ws('/v2/live/:frameApiKey', checkUserFrameWebsocketApiKey, newGSIListener, async (conn: ws, req: Request) => {
    //@ts-ignore
    conn.isAlive = true;
    conn.on('pong', heartbeat);
  });

  route.post('/recording', checkRecordingGSIAuth, async (req: Request, res: Response) => {
    const data = JSON.stringify(req.body);
    const fileName = __dirname + '/../../../static/recordedGsi/' + Date.now() + '.json'; 
    await fs.promises.writeFile(fileName, data);
    res.end();
  });
};
