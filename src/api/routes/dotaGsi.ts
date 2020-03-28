import { Router, Request, Response } from 'express';
import { checkGSIAuth, gsiBodyParser } from '../../middleware/dotaGsi';

const route = Router();

export default (app: Router) => {
  app.use('/dota-gsi', route);

  route.post('/', checkGSIAuth, gsiBodyParser, (req: Request, res: Response) => res.end());
};