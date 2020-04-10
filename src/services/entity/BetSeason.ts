import { BetSeason, UserRole, BetSeasonInviteStatus, BetInvite } from "../../@types/Entities/Bets";
import { getConn } from "../../loader/db";
import { RowDataPacket, OkPacket } from "mysql2";
import { v4 } from "uuid";

export async function getBetSeason(id: number): Promise<BetSeason | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(`SELECT id as id, name, description, type FROM bet_seasons WHERE id = ?`, [id]);
    await conn.end();
    return rows.length > 0 ? rows[0] : null;
}

export async function getUserBetSeasons(userId: number): Promise<BetSeason[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(`
        SELECT bs.id as id, bs.name as name, bs.description as description, bs.type as type
          FROM bet_seasons bs 
    INNER JOIN bet_season_users bsu ON bsu.bet_season_id = bs.id AND bsu.user_id = ?`, 
        [userId]
    );
    await conn.end();
    return rows;
}

export async function createUserBetSeason(userId: number, data: BetSeason): Promise<void> {
    const conn = await getConn();
    const [{insertId}] = await conn.execute<OkPacket>('INSERT INTO bet_seasons (id, name, description, type) VALUES (NULL, ?, ?, ?)', [data.name, data.description, data.type]);
    await conn.execute('INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)', [userId, insertId, UserRole.owner]);
    await conn.end();
}

export async function patchUserBetSeason(seasonId: number, data: Partial<BetSeason>): Promise<void> {
    const conn = await getConn();

    if(data.name) {
        await conn.execute('UPDATE bet_seasons SET name = ? WHERE id = ?', [data.name, seasonId]);
    }

    if(data.description) {
        await conn.execute('UPDATE bet_seasons SET description = ? WHERE id = ?', [data.description, seasonId]);
    }

    if(data.type) {
        await conn.execute('UPDATE bet_seasons SET type = ? WHERE id = ?', [data.type, seasonId]);
    }

    await conn.end();
}

export async function deleteUserBetSeason(seasonId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bet_season WHERE id = ?', [seasonId]);
    await conn.end();
}

export async function createSeasonInvite(seasonId: number, userId: number): Promise<string> {
    const inviteKey = v4();
    const conn = await getConn();
    await conn.execute(
        'INSERT INTO bet_season_invites (bet_season_id, user_id, invite_key, created, status) VALUES (?, ?, ?, NOW(), ?)',
        [seasonId, userId, inviteKey, BetSeasonInviteStatus.open],
    );
    await conn.end();
    return inviteKey;
}

type BetInvitePlainRow = Omit<BetInvite, 'betSeason'> & {betSeason: number} & RowDataPacket;

export async function getInviteByKey(key: string): Promise<BetInvite | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<BetInvitePlainRow[]>('SELECT bet_season_id as betSeason, user_id as owner, invite_key as key, FROM_UNIXTIME(created) as created, status FROM bet_season_invites WHERE invite_key = ?', [key]);
    await conn.end();

    return rows.length > 0 ? {
        ...rows[0],
        betSeason: (await getBetSeason(rows[0].betSeason))!
    } : null;
}

export async function acceptSeasonInvite(key: string, userId: number): Promise<void> {
    const invite = await getInviteByKey(key);
    if(invite) {
        const conn = await getConn();
        await conn.execute('UPDATE bet_season_invites SET status=? WHERE bet_season_id=?', [BetSeasonInviteStatus.accepted, invite.betSeason.id]);
        await conn.execute('INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)', [userId, invite.betSeason.id, UserRole.owner]);
        await conn.end();
    }
}

export async function denySeasonInvite(key: string): Promise<void> {
    const invite = await getInviteByKey(key);
    if(invite) {
        const conn = await getConn();
        await conn.execute('UPDATE bet_season_invites SET status=? WHERE bet_season_id=?', [BetSeasonInviteStatus.denied, invite.betSeason.id]);
        await conn.end();
    }
}

export async function deleteInviteByKey(key: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bet_season_invites WHERE invite_key = ?', [key]);
    await conn.end();
}