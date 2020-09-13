import { get, set } from '../../../loader/redis';
import { GsiClient } from '../../../middleware/dotaGsi';
import { sendMessage } from '../../websocket';

const aegis_item_name = 'item_aegis';

export function key(userId: number): string {
    return `gsi_${userId}_aegis`;
}

export async function process(client: GsiClient, data: any): Promise<void> {
    const oldData = Boolean(+(await get(key(client.userId)) || 0));
    const newData = JSON.stringify(data.items || {}).indexOf(aegis_item_name) !== -1;

    if(oldData !== newData) {
        sendMessage(client.userId, 'gsi_aegis_available', newData);
        await set(key(client.userId), '' + (+newData));
    }
}

export async function reset(client: GsiClient): Promise<void> {
    await set(key(client.userId), '0');
    sendMessage(client.userId, 'gsi_aegis_available', false);
}

export async function intializeNewConnection(userId: number): Promise<void> {
    const aegisAlive = Boolean(+(await get(key(userId)) || 0));
    sendMessage(userId, 'gsi_aegis_available', aegisAlive);
}