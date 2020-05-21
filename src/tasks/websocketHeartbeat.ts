import { WebsocketInstance } from "..";


function noop() {}

export function heartbeat() {
  //@ts-ignore
  this.isAlive = true;
}

if(process.env.NODE_ENV !== 'test') {
  setInterval(() => {
      WebsocketInstance.getWss().clients.forEach((ws) => {
        //@ts-ignore
        if (ws.isAlive === false) {
            return ws.terminate();
        }
    
        //@ts-ignore
        ws.isAlive = false;
        ws.ping(noop);
      });
  }, 30000);
}