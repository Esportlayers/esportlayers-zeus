import { WebsocketInstance } from "..";

export function sendMessage(userId: number, type: string, value: any): void {
  const connections = [...WebsocketInstance.getWss().clients.values()].filter(
    (c) =>
      //@ts-ignore
      c.user &&
      //@ts-ignore
      c.user.id === userId &&
      //@ts-ignore
      (!type.includes("gsi") || !c.noGsiEvents)
  );
  connections.forEach((client) => client.send(JSON.stringify({ type, value })));
}
