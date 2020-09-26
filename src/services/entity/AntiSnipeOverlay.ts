import { getConn } from "../../loader/db";
import { AntiSnipeOverlay } from "@streamdota/shared-types";
import { RowDataPacket } from "mysql2";

async function selctOverlay(userId: number): Promise<AntiSnipeOverlay | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<AntiSnipeOverlay & RowDataPacket>>(`
        SELECT
            user_id as userId,
            type,
            opacity
        FROM anti_snipe_overlay WHERE user_id = ?
    `, [userId]);
    await conn.end();

    return rows.length > 0 ? rows[0] : null;
}

export async function requireAntiSnipeOverlay(userId: number): Promise<AntiSnipeOverlay> {
    const overlay = await selctOverlay(userId);

    if(overlay) {
        return overlay;
    }

    const conn = await getConn();
    conn.execute('INSERT INTO anti_snipe_overlay (user_id, type, opacity) VALUES (?, "normal", "100")', [userId]);
    await conn.end();

    return (await selctOverlay(userId))!;
}

const transformMap: {[x: string]: string} = {
    type: 'type',
    opacity: 'opacity',
}

export async function patchAntiSnipeOverlay(userId: number, data: Partial<Omit<AntiSnipeOverlay, 'userId'>>): Promise<void> {
    const conn = await getConn();

    for(const [key, value] of Object.entries(data)) {
        if(transformMap[key]) {
            await conn.execute(`UPDATE anti_snipe_overlay SET ${transformMap[key]} = ? WHERE user_id = ?`, [value, userId]);
        }
    }

    await conn.end();
}