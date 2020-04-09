import { Router, Request, Response } from 'express';
import { loadSteamConnections, loadStats, loadBotData, patchBotData, getUserCommands, createUserCommand, patchCommand, deleteCommand } from '../../services/entity/User';
import { User } from '../../@types/Entities/User';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey, checkUserFrameWebsocketApiKey } from '../../middleware/frameApi';
import ws from 'ws';
import { heartbeat } from '../../tasks/websocketHeartbeat';

const route = Router();

export default (app: Router) => {
    app.use('/user', route);

    route.get('/baseData', reuqireAuthorization, (req: Request, res: Response) => {
        return res.json(req.user).status(200);
    });

    route.get('/steam', reuqireAuthorization, async (req: Request, res: Response) => {
        const connections = await loadSteamConnections((req.user as User).id);
        return res.json(connections).status(200);
    });

    route.get('/dotaStats/:frameApiKey', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const stats = await loadStats((req.user as User).id);
        return res.json(stats).status(200);
    });

    route.get('/bot', reuqireAuthorization, async(req: Request, res: Response) => {
        const data = await loadBotData((req.user as User).id);
        return res.json(data).status(200);
    });

    route.patch('/bot', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await patchBotData(user.id, req.body, '#' + user.displayName.toLowerCase());
        return res.json(undefined).status(200);
    });

    route.get('/commands', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await getUserCommands(user.id);
        return res.json(commands).status(200);
    });

    route.post('/command', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await createUserCommand(user.id, req.body.command, req.body.message);
        return res.json(commands).status(200);
    });

    route.patch('/command/:commandId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await patchCommand(+req.params.commandId, user.id, req.body.command, req.body.message);
        return res.json(commands).status(200);
    });

    route.delete('/command/:commandId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await deleteCommand(+req.params.commandId, user.id);
        return res.json(commands).status(200);
    });

    route.ws('/bot/live/:frameApiKey', checkUserFrameWebsocketApiKey, (ws: ws, req: Request) => {
      //@ts-ignore
      ws.isAlive = true;
      ws.on('pong', heartbeat);
    });
};
