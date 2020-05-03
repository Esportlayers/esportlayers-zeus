import { loadUserById } from "./User";
import { getConn } from "../../loader/db";
import { RowDataPacket } from "mysql2";
import { requireWatcher } from "./Watcher";
import { BetRound, BetRoundStats } from "../../@types/Entities/BetRound";

async function getRound(userId: number): Promise<number> {
    const user = await loadUserById(userId);
    if(user && user.betSeasonId) {
        const conn = await getConn();
        const [roundRows] = await conn.execute<Array<{round: number} & RowDataPacket>>('SELECT round FROM bet_rounds WHERE bet_season_id = ? ORDER BY round DESC LIMIT 1', [user.betSeasonId]);
        await conn.end();

        return roundRows.length > 0 ? roundRows[0].round : 0;
    }

    return 0;
}

async function getRoundId(userId: number): Promise<number> {
    const user = await loadUserById(userId);
    if(user && user.betSeasonId) {
        const conn = await getConn();
        const [roundRows] = await conn.execute<Array<{id: number} & RowDataPacket>>('SELECT id FROM bet_rounds WHERE bet_season_id = ? ORDER BY round DESC LIMIT 1', [user.betSeasonId]);
        await conn.end();

        return roundRows.length > 0 ? roundRows[0].id : 0;
    }

    return 0;
}

export async function getRoundById(roundId: number): Promise<BetRound | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetRound & RowDataPacket>>('SELECT id, bet_season_id as betSeason, round, status, result FROM bet_rounds WHERE id = ?', [roundId]);
    await conn.end();

    return rows.length > 0 ? rows[0] : null;
}


export async function getBetSeasonRounds(seasonId: number): Promise<BetRoundStats[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetRoundStats & RowDataPacket>>(`
        SELECT 
            br.id, 
            br.round, 
            br.status, 
            br.result, 
            br.user_id as userId,
            u.display_name as displayName,
            UNIX_TIMESTAMP(br.created) as created,
            COUNT(b.id) as total,
            SUM(IF(b.bet = 'a', 1, 0)) as aBets,
            SUM(IF(b.bet = 'b', 1, 0)) as bBets
       FROM bet_rounds br
  LEFT JOIN bets b ON b.bet_round_id = br.id
 INNER JOIN user u ON u.id = br.user_id
      WHERE br.bet_season_id = ?
   GROUP BY br.id
   ORDER BY br.created DESC
`, 
        [seasonId]
    );
    await conn.end();

    return rows;
}

export async function createBetRound(userId: number, seasonId: number | null): Promise<void> {
    if(seasonId) {
        const conn = await getConn();
        const round = (await getRound(userId)) + 1;
        await conn.execute(
            'INSERT INTO bet_rounds (id, bet_season_id, user_id, round, created, status, result) VALUES (NULL, ?, ?, ?, NOW(), ?, "")', 
            [seasonId, userId, round, 'betting']
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
    await conn.execute('DELETE FROM bets WHERE bet_round_id=?', [roundId]);
    await conn.execute('DELETE FROM bet_rounds WHERE id=?', [roundId]);
    await conn.end();
}

export async function createBet(userId: number, twitchId: number, displayName: string, username: string, bet: string): Promise<void> {
    const conn = await getConn();
    const watcher = await requireWatcher(twitchId, displayName, username, userId);
    const betRound = await getRoundId(userId);

    await conn.execute(
        'INSERT INTO bets (id, watcher_id, bet_round_id, created, bet) VALUES (NULL, ?, ?, NOW(), ?)',
        [watcher.id, betRound, bet]
    );
    await conn.end();
}