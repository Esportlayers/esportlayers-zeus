import { Router, Request, Response } from 'express';
const route = Router();

export default (app: Router) => {
  app.use('/', route);

  route.get('/', (req: Request, res: Response) => {
    return res.json({ msg: 'Welcome to griefco.de api' }).status(200);
  });
};
