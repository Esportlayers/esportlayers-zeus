import { User, SteamConnection } from "../../@types/Entities/User";
import { RowDataPacket, OkPacket } from "mysql2";
import { getConn } from "../../loader/db";
import { streamFile } from '../staticFileHandler';
import {v4} from 'uuid';

type UserResponse = User & RowDataPacket & OkPacket;

async function downloadUserAvatar(url: string, userId: number): Promise<[string, string, string]> {
    return await streamFile('userAvatar', url, '' + userId);
}

export async function findOrCreateUser(twitchId: number, displayName: string, avatar: string): Promise<User> {
    const conn = await getConn();
    let user = await loadUserByTwitchId(twitchId);

    if(! user) {
        const [original, webp, jp2] = await downloadUserAvatar(avatar, twitchId);
        const profileUrl = 'https://twitch.tv/' + displayName;
        conn.execute<OkPacket>(
            "INSERT INTO user (id, twitch_id, display_name, avatar, avatar_webp, avatar_jp2, profile_url, gsi_auth) VALUES (NULL, ?, ?, ?, ?, ?, ?, '');",
            [twitchId, displayName, original, webp, jp2, profileUrl]
        );
        const [userRow] = await conn.query<UserResponse[]>('SELECT * FROM user WHERE twitch_id = ?;', [twitchId]);
        user = userRow[0];
    } else {
        user = await loadUserByTwitchId(twitchId);
    }

    await conn.end();
    return user!;
}

export async function loadUserByTwitchId(twitchId: number): Promise<User | null> {
    const conn = await getConn();
    const [userRows] = await conn.query<UserResponse[]>('SELECT id, twitch_id as twitchId, display_name as displayName, avatar, avatar_webp as avatarWEBP, avatar_jp2 as avatarJP2, profile_url as profileUrl, gsi_auth as gsiAuth FROM user WHERE twitch_id = ?;', [twitchId]);
    let user = null;
    
    if(userRows.length === 1) {
        user = userRows[0];
    }
    await conn.end();

    return user;
}

export async function loadUserById(id: number): Promise<User | null> {
    const conn = await getConn();
    const [userRows] = await conn.query<UserResponse[]>('SELECT id, twitch_id as twitchId, display_name as displayName, avatar, avatar_webp as avatarWEBP, avatar_jp2 as avatarJP2, profile_url as profileUrl, gsi_auth as gsiAuth FROM user WHERE id = ?;', [id]);
    let user = null;
    
    if(userRows.length === 1) {
        user = userRows[0];
    }
    await conn.end();

    return user;
}

interface SteamConnectionRows extends RowDataPacket {
    id: number;
    userId: number;
    steamId: string;
}

export async function loadSteamConnections(userId: number): Promise<SteamConnection[]> {
    const conn = await getConn();
    const [steamRows] = await conn.query<SteamConnectionRows[]>('SELECT id, user_id as userId, steam_id as steamId FROM steam_connections WHERE user_id = ?;', [userId]);
    await conn.end();

    return steamRows;
}

export async function createGsiAuthToken(userId: number): Promise<string> {
    const auth = v4();

    const conn = await getConn();
    await conn.execute('UPDATE user SET gsi_auth = ? WHERE id = ?;', [auth, userId]);
    await conn.end();

    return auth;
}

export async function gsiAuthTokenUnknown(gsiAuthToken: string): Promise<{id: number; displayName: string} | void> {
    const conn = await getConn();
    const [authRows] = await conn.query<Array<RowDataPacket & {id: number; displayName: string}>>('SELECT id, display_name as displayName FROM user WHERE gsi_auth = ?;', [gsiAuthToken]);
    await conn.end();

    if(authRows.length > 0) {
        return authRows[0];
    }
}

export async function saveDotaGame(userId: number, win: boolean): Promise<void> {
    const conn = await getConn();
    await conn.execute('INSERT INTO dota_games (id, user_id, finished, won) VALUES (NULL, ?, NOW(), ?);', [userId, win]);
    await conn.end();
}