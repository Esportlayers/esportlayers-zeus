import { Router, Request, Response } from 'express';
import { checkGSIAuth } from '../../middleware/dotaGsi';
const route = Router();

export default (app: Router) => {
  app.use('/dota-gsi', route);

  route.post('/', checkGSIAuth, (req: Request, res: Response) => {
      console.log('new data', req.body);
      res.end();
  });
};