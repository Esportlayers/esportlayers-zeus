import { GsiClient } from '../../../middleware/dotaGsi';

//#region <interfaces>
//#endregion
/*
function key(userId: number): string {
    return `gsi_${userId}_wards`;
}
*/
export async function process(client: GsiClient, data: any): Promise<void> {
    console.log(data?.player);
}

export async function reset(client: GsiClient): Promise<void> {
}

export async function intializeNewConnection(userId: number): Promise<void> {
}