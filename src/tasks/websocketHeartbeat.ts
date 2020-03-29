import { WebsocketInstance } from "..";


function noop() {}

export function heartbeat() {
  //@ts-ignore
  this.isAlive = true;
  console.log('Recieved pong');
}

const interval = setInterval(() => {
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