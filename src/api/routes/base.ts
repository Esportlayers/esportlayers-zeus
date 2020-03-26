import { Router, Request, Response } from 'express';
import proxy from 'express-http-proxy';
import config from '../../config';
const route = Router();

export default (app: Router) => {
  app.use('/', route);

  route.get('/', (req: Request, res: Response) => {
    return res.json({ msg: 'Welcome to streamdota.de api' }).status(200);
  });

  app.use('/dota-gsi', proxy('localhost:' + config.gsiPort));
};
