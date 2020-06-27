import { getConn } from "../../loader/db";
import { RowDataPacket, OkPacket } from "mysql2";
import { v4 } from "uuid";
import {BetSeasonInvite, BetSeason, BetSeasonToplist} from '@streamdota/shared-types';

export const rolePrio: {[x: string]: number} = {
    user: 0,
    editor: 1,
    owner: 2,
}

export async function getBetSeason(id: number): Promise<BetSeason | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(`SELECT id as id, name, description, type FROM bet_seasons WHERE id = ?`, [id]);
    await conn.end();
    return rows.length > 0 ? rows[0] : null;
}

export async function getUserBetSeasons(userId: number): Promise<BetSeason[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(`
        SELECT bs.id as id, bs.name as name, bs.description as description, bs.type as type, bsu.userRole as userRole
          FROM bet_seasons bs 
    INNER JOIN bet_season_users bsu ON bsu.bet_season_id = bs.id AND bsu.user_id = ?`, 
        [userId]
    );
    await conn.end();
    return rows.reduce<BetSeason[]>((acc, season) => {
        const addedSeason = acc.find(({id}) => id === season.id);
        if(addedSeason) {
            if(rolePrio[addedSeason.userRole] < rolePrio[season.userRole]) {
                addedSeason.userRole = season.userRole;
            }
        } else {
            acc.push(season);
        }
        return acc;
    }, []);
}

export async function createUserBetSeason(userId: number, data: Omit<BetSeason, 'id'>): Promise<void> {
    const conn = await getConn();
    const [{insertId}] = await conn.execute<OkPacket>('INSERT INTO bet_seasons (id, name, description, type) VALUES (NULL, ?, ?, ?)', [data.name, data.description, data.type]);
    await conn.execute('INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)', [userId, insertId, 'owner']);
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

export async function deleteBetSeason(seasonId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bet_season_users WHERE bet_season_id = ?', [seasonId]);
    await conn.execute('DELETE FROM bet_rounds WHERE bet_season_id = ?', [seasonId]);
    await conn.execute('DELETE FROM bet_seasons WHERE id = ?', [seasonId]);
    await conn.end();
}

export async function listInvites(seasonId: number): Promise<BetSeasonInvite[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeasonInvite & RowDataPacket & {invitedBy: string}>>('SELECT bsi.invite_key as inviteKey, UNIX_TIMESTAMP(bsi.created) as created, bsi.status, u.display_name as invitedBy FROM bet_season_invites bsi INNER JOIN user u ON u.id = bsi.user_id WHERE bsi.bet_season_id = ?', [seasonId]);
    await conn.end();
    return rows;
}

interface BetSeasonUser {
    id: number;
    name: string;
    userRole: 'owner' | 'editor' | 'user';
}

export async function listUsers(seasonId: number): Promise<BetSeasonUser[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetSeasonUser & RowDataPacket>>('SELECT u.id, u.display_name as displayName, bsu.userRole as userRole FROM bet_season_users bsu INNER JOIN user u ON u.id = bsu.user_id WHERE bsu.bet_season_id = ?', [seasonId]);
    await conn.end();
    return rows;
}

export async function createSeasonInvite(seasonId: number, userId: number): Promise<string> {
    const inviteKey = v4();
    const conn = await getConn();
    await conn.execute(
        'INSERT INTO bet_season_invites (bet_season_id, user_id, invite_key, created, status) VALUES (?, ?, ?, NOW(), ?)',
        [seasonId, userId, inviteKey, 'open'],
    );
    await conn.end();
    return inviteKey;
}

type BetInvitePlainRow = Omit<BetSeasonInvite, 'betSeason'> & {betSeason: BetSeason} & RowDataPacket;

export async function getInviteByKey(key: string, userId: number): Promise<BetInvitePlainRow | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<BetInvitePlainRow[]>('SELECT bet_season_id as betSeason, user_id as owner, invite_key as inviteKey, UNIX_TIMESTAMP(created) as created, status FROM bet_season_invites WHERE invite_key = ? AND user_id = ?', [key, userId]);
    await conn.end();

    return rows.length > 0 ? {
        ...rows[0],
        betSeason: (await getBetSeason(rows[0].betSeason as unknown as number))!
    } : null;
}

export async function acceptSeasonInvite(key: string, userId: number): Promise<void> {
    const invite = await getInviteByKey(key, userId);
    if(invite && invite.status === 'open') {
        const conn = await getConn();
        await conn.execute('UPDATE bet_season_invites SET status=? WHERE bet_season_id=?', ['accepted', invite.betSeason.id]);
        await conn.execute('INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)', [userId, invite.betSeason.id, 'user']);
        await conn.end();
    }
}

export async function denySeasonInvite(key: string, userId: number): Promise<void> {
    const invite = await getInviteByKey(key, userId);
    if(invite && invite.status === 'open') {
        const conn = await getConn();
        await conn.execute('UPDATE bet_season_invites SET status=? WHERE bet_season_id=?', ['denied', invite.betSeason.id]);
        await conn.end();
    }
}

export async function deleteInviteByKey(key: string, betSeasonId: number, userId: number): Promise<void> {
    const invite = await getInviteByKey(key, userId);
    if(invite && invite.betSeason.id === betSeasonId) {
        const conn = await getConn();
        await conn.execute('DELETE FROM bet_season_invites WHERE invite_key = ?', [key]);
        await conn.end();
    }
}

export async function getUserBetSeasonRole(userId: number, betSeasonId: number): Promise<string | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<{userRole: string} & RowDataPacket>>('SELECT userRole FROM bet_season_users WHERE bet_season_id=? AND user_id=?', [betSeasonId, userId]);
    await conn.end();
    return rows.length > 0 ? rows[0].userRole : null;
}

export async function patchUserBetSeasonRole(betSeasonId: number, userId: number, userRole: 'owner' | 'editor' | 'user'): Promise<void> {
    const conn = await getConn();
    await conn.execute('UPDATE bet_season_invites SET userRole=? WHERE user_id=? AND bet_season_id=?', [userRole, userId, betSeasonId]);
    await conn.end();
}

export async function deleteUserBetSeason(betSeasonId: number, userId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bet_season_invites WHERE user_id=? AND bet_season_id=?', [userId, betSeasonId]);
    await conn.end();

}

export async function seasonTopList(betSeasonId: number): Promise<BetSeasonToplist[]> {
    const conn = await getConn();
    const [toplist] = await conn.execute<Array<BetSeasonToplist & RowDataPacket>>(`
        SELECT 
            w.id as id,
            w.display_name as name,
            w.username as username,
            SUM(IF(b.bet = br.result, 1, 0)) as won,
            COUNT(b.id) as total,
            br.bet_season_id as betSeason
       FROM bets b
 INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND br.status = 'finished'
 INNER JOIN watchers w on b.watcher_id = w.id
   GROUP BY b.watcher_id
   ORDER BY won DESC, total
`, [betSeasonId]);
    await conn.end();

    return toplist;
}

export async function getUserSeasonStats(username: string, betSeasonId: number): Promise<{won: number; total: number;}> {
    const conn = await getConn();
    const [toplist] = await conn.execute<Array<BetSeasonToplist & RowDataPacket>>(`
        SELECT 
            SUM(IF(b.bet = br.result, 1, 0)) as won,
            COUNT(b.id) as total
       FROM bets b
 INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND br.status = 'finished'
 INNER JOIN watchers w on b.watcher_id = w.id AND w.username = ?
`, [betSeasonId, username]);
    await conn.end();

    return toplist.length > 0 ? {won: toplist[0].won ?? 0, total: toplist[0].total} : {won: 0, total: 0};

}