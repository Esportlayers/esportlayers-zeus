import { Router, Request, Response } from 'express';
import {User} from '@streamdota/shared-types';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import { createWordForGroup, createWordGroup, deleteWordForGroup, deleteWordGroup, getUserWordGroups, updateWordForGroup, updateWordGroup } from '../../services/entity/ChatKeyWords';

const route = Router();

export default (app: Router) => {
    app.use('/chatKeywords', route);

    route.get('/wordGroups', requireAuthorization, async (req: Request, res: Response) => {
        const user = req.user as User;
        const wordGroups = await getUserWordGroups(user.id);
        return res.json(wordGroups).status(200);
    });

    route.post('/wordGroup', requireAuthorization, async (req: Request, res: Response) => {
        await createWordGroup((req.user as User).id, req.body.name);
        return res.sendStatus(201);
    });

    route.patch('/wordGroup/:wordGroupId', requireAuthorization, async (req: Request, res: Response) => {
        await updateWordGroup(+req.params.wordGroupId, req.body);
        return res.sendStatus(204);
    });

    route.delete('/wordGroup/:wordGroupId', requireAuthorization, async (req: Request, res: Response) => {
        await deleteWordGroup(+req.params.wordGroupId);
        return res.sendStatus(204);
    });

    route.post('/word/:wordGroupId', requireAuthorization, async (req: Request, res: Response) => {
        await createWordForGroup(+req.params.wordGroupId, req.body.name);
        return res.sendStatus(201);
    });
    
    route.patch('/word/:wordId', requireAuthorization, async (req: Request, res: Response) => {
        await updateWordForGroup(+req.params.wordId, req.body);
        return res.sendStatus(204);
    });

    route.delete('/word/:wordId', requireAuthorization, async (req: Request, res: Response) => {
        await deleteWordForGroup(+req.params.wordId);
        return res.sendStatus(204);
    });
};
