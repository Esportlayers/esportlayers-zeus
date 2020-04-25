import { WebsocketInstance } from "..";

export function sendMessage(userId: number, type: string, value: any): void {
    //@ts-ignore
    const connections = [...WebsocketInstance.getWss().clients.values()].filter((c) => c.user && c.user.id === userId);
    connections.forEach((client) => client.send(JSON.stringify({type, value })));
}