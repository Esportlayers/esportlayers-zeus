import { Timer } from "../../@types/Entities/User";
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";
import { clearChannelCache } from "../../tasks/twitchChatTimer";


export async function getUserTimer(userId: number): Promise<Timer[]> {
    const conn = await getConn();
    const [commandRows] = await conn.execute<Array<Timer & RowDataPacket>>('SELECT id, period, message, active FROM bot_timer WHERE user_id = ?', [userId]);
    await conn.end();

    return commandRows;
}

export async function createTimer(userId: number, active: boolean, interval: number, message: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('INSERT INTO bot_timer (id, user_id, period, message, active) VALUES (NULL, ?, ?, ?, ?)', [userId, interval, message, active]);
    await conn.end();
    await clearChannelCache(userId);
}

export async function patchTimer(timerId: number, userId: number, active: boolean, interval: number, message: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('UPDATE bot_timer SET active=?, period=?, message=? WHERE id=? AND user_id=?', [active, interval, message, timerId, userId]);
    await conn.end();
    await clearChannelCache(userId);
}

export async function deleteTimer(timerId: number, userId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bot_timer WHERE id=? AND user_id=?', [timerId, userId]);
    await conn.end();
    await clearChannelCache(userId);
}