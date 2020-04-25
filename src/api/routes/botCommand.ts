import { Router, Request, Response } from "express";
import { reuqireAuthorization } from "../../middleware/requireAuthorization";
import { User } from "../../@types/Entities/User";
import { getUserCommands, createUserCommand, patchCommand, deleteCommand } from "../../services/entity/Command";

const route = Router();

export default (app: Router) => {
    app.use('/command', route);

    route.get('/list', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await getUserCommands(user.id);
        return res.json(commands).status(200);
    });

    route.post('/create', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await createUserCommand(user.id, req.body.active, req.body.command, req.body.message, req.body.type);
        return res.json(commands).status(200);
    });

    route.patch('/:commandId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await patchCommand(+req.params.commandId, user.id, req.body.active, req.body.command, req.body.message);
        return res.json(commands).status(200);
    });

    route.delete('/:commandId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await deleteCommand(+req.params.commandId, user.id);
        return res.json(commands).status(200);
    });
}