import config from '../../../config';
import { get, getObj, setObj } from '../../../loader/redis';
import { GsiClient } from '../../../middleware/dotaGsi';
import { sendMessage } from '../../websocket';
import { GsiMapData } from './game';
import { key as aegisKey } from './aegis'

//#region <interfaces>
interface RoshanState {
    state: 'aegis' | 'alive' | 'respawn_base' | 'respawn_variable';
    respawnTime: number;
}
//#endregion

function key(userId: number): string {
    return `gsi_${userId}_roshan`;
}

export async function process(client: GsiClient, data: any): Promise<void> {
    const oldData = await getObj<RoshanState>(key(client.userId));
    const newData = data?.map as GsiMapData | null;
    const aegisAlive = Boolean(+(await get(aegisKey(client.userId)) || 0));
    const state = (aegisAlive ? 'aegis' : newData?.roshan_state) || 'alive';

    if(newData) {
        if(oldData?.state !== state || oldData.respawnTime !== newData.roshan_state_end_seconds) {
            sendMessage(client.userId, 'gsi_roshan', {state, respawnTime: newData.roshan_state_end_seconds});
            await setObj(key(client.userId), {state, respawnTime: newData.roshan_state_end_seconds});
        }
    } else if(oldData) {
        await reset(client);
    }
}

export async function reset(client: GsiClient): Promise<void> {
    config.debugGsi && console.log(`[${client.displayName}] Reseting game state`);
    await setObj(key(client.userId), null);
    sendMessage(client.userId, 'gsi_roshan', {state: 'alive', respawnTime: 0});
}

export async function intializeNewConnection(userId: number): Promise<void> {
    const data = await getObj<RoshanState>(key(userId));
    if(data) {
        sendMessage(userId, 'gsi_roshan', data);
    }
}