import { isEqual } from 'lodash';
import config from '../../../config';
import { getObj, setObj } from '../../../loader/redis';
import { GsiClient } from '../../../middleware/dotaGsi';
import { sendMessage } from '../../websocket';

//#region <interfaces>
interface DraftData {
    team: number;
    pick: boolean;
    activeteam_time_remaining: number;
    radiant_bonus_time: number;
    dire_bonus_time: number;
    team2: {
        home_team: boolean;
        pick0_id: number;
        pick0_class: string;
        pick1_id: number;
        pick1_class: string;
        pick2_id: number;
        pick2_class: string;
        pick3_id: number;
        pick3_class: string;
        pick4_id: number;
        pick4_class: string;
        ban0_id: number;
        ban0_class: string;
        ban1_id: number;
        ban1_class: string;
        ban2_id: number;
        ban2_class: string;
        ban3_id: number;
        ban3_class: string;
        ban4_id: number;
        ban4_class: string;
        ban5_id: number;
        ban5_class: string;
        ban6_id: number;
        ban6_class: string;
    }
    team3: {
        home_team: boolean;
        pick0_id: number;
        pick0_class: string;
        pick1_id: number;
        pick1_class: string;
        pick2_id: number;
        pick2_class: string;
        pick3_id: number;
        pick3_class: string;
        pick4_id: number;
        pick4_class: string;
        ban0_id: number;
        ban0_class: string;
        ban1_id: number;
        ban1_class: string;
        ban2_id: number;
        ban2_class: string;
        ban3_id: number;
        ban3_class: string;
        ban4_id: number;
        ban4_class: string;
        ban5_id: number;
        ban5_class: string;
        ban6_id: number;
        ban6_class: string;
    }
}
//#endregion

function key(userId: number): string {
    return `gsi_${userId}_draft`;
}

export async function process(client: GsiClient, data: any): Promise<void> {
    const oldData = await getObj<DraftData>(key(client.userId));
    const newData = data?.draft as DraftData | null;

    if(newData) {
        if(!oldData || !isEqual(newData, oldData)) {
            sendMessage(client.userId, 'gsi_draft', newData);
            await setObj(key(client.userId), newData);
        }

    } else if(oldData) {
        await reset(client);
    }
}

export async function reset(client: GsiClient): Promise<void> {
    config.debugGsi && console.log(`[${client.displayName}] Reseting draft state`);
    await setObj(key(client.userId), null);
}

export async function intializeNewConnection(userId: number): Promise<void> {
    const data = await getObj<DraftData>(key(userId));
    if(data) {
        sendMessage(userId, 'gsi_draft', data);
    }
}