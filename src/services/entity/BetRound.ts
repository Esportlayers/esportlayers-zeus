import { loadUserById } from "./User";
import { getConn } from "../../loader/db";
import { RowDataPacket } from "mysql2";
import { requireWatcher } from "./Watcher";

async function getRound(userId: number): Promise<number> {
    const user = await loadUserById(userId);
    if(user && user.seasonId) {
        const conn = await getConn();
        const [roundRows] = await conn.execute<Array<{round: number} & RowDataPacket>>('SELECT round FROM bet_rounds WHERE bet_season_id = ? ORDER BY round DESC LIMIT 1', [user.seasonId]);
        await conn.end();

        return roundRows.length > 0 ? roundRows[0].round : 0;
    }

    return 0;
}

export async function createBetRound(userId: number): Promise<void> {
    const user = await loadUserById(userId);
    if(user && user.seasonId) {
        const conn = await getConn();
        const round = (await getRound(userId)) + 1;
        await conn.execute(
            'INSERT INTO bet_rounds (id, bet_season_id, user_id, round, created, status, result) VALUES (NULL, ?, ?, ?, NOW(), ?, "")', 
            [user.seasonId, userId, round, 'betting']
        );
        await conn.end();
    }
}

interface PatchableData {
    status: 'betting' | 'running' | 'finished';
    result: string;
}

export async function patchBetRound(roundId: number, data: Partial<PatchableData>): Promise<void> {
    const conn = await getConn();

    if(data.result) {
        await conn.execute('UPDATE bet_rounds SET result=? WHERE id=?', [data.result, roundId]);
    }

    if(data.status) {
        await conn.execute('UPDATE bet_rounds SET status=? WHERE id=?', [data.status, roundId]);
    }

    await conn.end();
}

export async function deleteBetRound(roundId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bet_rounds WHERE id=?', [roundId]);
    await conn.end();
}

export async function createBet(userId: number, twitchId: number, displayName: string, username: string, bet: string): Promise<void> {
    const conn = await getConn();
    const watcher = await requireWatcher(twitchId, displayName, username, userId);
    const betRound = await getRound(userId);

    await conn.execute(
        'INSERT INTO bets (id, watcher_id, bet_round_id, created, bet) VALUES (NULL, ?, ?, NOW(), ?)',
        [watcher.id, betRound, bet]
    );
    await conn.end();
}