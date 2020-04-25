import { User, SteamConnection, BotData, Command } from "../../@types/Entities/User";
import { RowDataPacket, OkPacket } from "mysql2";
import { getConn } from "../../loader/db";
import { streamFile } from '../staticFileHandler';
import {v4} from 'uuid';
import { createInstance, deleteInstance } from "../twitchChat";
import dayjs from 'dayjs';

type UserResponse = User & RowDataPacket & OkPacket;

async function downloadUserAvatar(url: string, userId: number): Promise<[string, string, string]> {
    return await streamFile('userAvatar', url, '' + userId);
}

export async function findOrCreateUser(twitchId: number, displayName: string, avatar: string): Promise<User> {
    const conn = await getConn();
    let user = await loadUserByTwitchId(twitchId);

    if(! user) {
        const frameKey = v4();
        const [original, webp, jp2] = await downloadUserAvatar(avatar, twitchId);
        const profileUrl = 'https://twitch.tv/' + displayName;
        conn.execute<OkPacket>(
            "INSERT INTO user (id, twitch_id, display_name, avatar, avatar_webp, avatar_jp2, profile_url, gsi_auth, frame_api_key, dota_stats_from) VALUES (NULL, ?, ?, ?, ?, ?, ?, '', ?, 'session');",
            [twitchId, displayName, original, webp, jp2, profileUrl, frameKey]
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
    const [userRows] = await conn.query<UserResponse[]>('SELECT id, twitch_id as twitchId, display_name as displayName, avatar, avatar_webp as avatarWEBP, avatar_jp2 as avatarJP2, profile_url as profileUrl, gsi_auth as gsiAuth, frame_api_key as frameApiKey, dota_stats_from as dotaStatsFrom, bet_season_id as seasonId, gsi_connected as gsiConnected FROM user WHERE twitch_id = ?;', [twitchId]);
    let user = null;
    
    if(userRows.length === 1) {
        user = userRows[0];
    }
    await conn.end();

    return user;
}

export async function loadUserById(id: number): Promise<User | null> {
    const conn = await getConn();
    const [userRows] = await conn.query<UserResponse[]>('SELECT id, twitch_id as twitchId, display_name as displayName, avatar, avatar_webp as avatarWEBP, avatar_jp2 as avatarJP2, profile_url as profileUrl, gsi_auth as gsiAuth, frame_api_key as frameApiKey, dota_stats_from as dotaStatsFrom, bet_season_id as seasonId, gsi_connected as gsiConnected FROM user WHERE id = ?;', [id]);
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
    await conn.execute('UPDATE user SET gsi_auth = ?, gsi_connected = FALSE WHERE id = ?;', [auth, userId]);
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

export async function resetDotaGsi(userId: number): Promise<void> {
    const conn = await getConn();
    await conn.query('UPDATE user SET gsi_auth="", gsi_connected=FALSE WHERE id=?;', [userId]);
    await conn.end();

}

export async function getUserByFrameApiKey(key: string): Promise<{id: number; displayName: string} | void> {
    const conn = await getConn();
    const [authRows] = await conn.query<Array<RowDataPacket & {id: number; displayName: string}>>('SELECT id, display_name as displayName FROM user WHERE frame_api_key = ?;', [key]);
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

interface StatsRow extends RowDataPacket {
    date: number;
    won: boolean;
}

export async function getOnlineSince(userId: number): Promise<number | null> {
    const conn = await getConn();
    const [streamStateRows] = await conn.execute<Array<{date: number | null} & RowDataPacket>>('SELECT UNIX_TIMESTAMP(uss.created) as date FROM user_stream_state uss INNER JOIN user u ON u.twitch_id = uss.twitch_id WHERE u.id = ?', [userId])
    await conn.end();

    return streamStateRows.length > 0 ? streamStateRows[0].date : null;
}

export async function loadStats(userId: number, statsFrom: User['dotaStatsFrom']): Promise<StatsRow[]> {
    const conn = await getConn();

    let startTs = dayjs().startOf('day').unix();
    if(statsFrom === 'session') {
        const onlineSince = await getOnlineSince(userId);
        if(onlineSince) {
            startTs = onlineSince;
        } else {
            startTs = dayjs().unix();
        }
    }

    const [rows] = await conn.execute<StatsRow[]>('SELECT UNIX_TIMESTAMP(finished) as date, won FROM dota_games WHERE UNIX_TIMESTAMP(finished) >= ? AND user_id = ?;', [startTs, userId]);
    await conn.end();
    return rows;
}

export async function getDeaultChannels(): Promise<string[]> {
    const conn = await getConn();
    const [channelRows] = await conn.execute<Array<{name: string} & RowDataPacket>>('SELECT display_name as name FROM user WHERE custom_channel_bot_name = ""');
    await conn.end();

    return channelRows.map(({name}) => name);
}

export async function getCustomBots(): Promise<Array<{channel: string; name: string; password: string}>> {
    const conn = await getConn();
    const [channelRows] = await conn.execute<Array<{channel: string; name: string; password: string} & RowDataPacket>>('SELECT display_name as channel, custom_channel_bot_name as name, custom_channel_bot_token as password FROM user WHERE custom_channel_bot_name != "" AND custom_channel_bot_token != ""');
    await conn.end();

    return channelRows;
}

export async function loadBotData(userId: number): Promise <BotData> {
    const conn = await getConn();
    const [cfgRow] = await conn.execute<Array<BotData & RowDataPacket>>('SELECT custom_channel_bot_name as customBotName, custom_channel_bot_token as customBotToken FROM user WHERE id = ?', [userId]);
    await conn.end();

    return cfgRow.length > 0 ? cfgRow[0] : {
        useBot: false,
        customBotName: '',
        customBotToken: '',
        commandTrigger: '!'
    };
}

export async function patchBotData(userId: number, data: Partial<BotData>, channelName: string): Promise <void> {
    const conn = await getConn();

    if(data.customBotName) {
        await conn.execute('UPDATE user SET custom_channel_bot_name = ? WHERE id = ?', [data.customBotName, userId]);
    }

    if(data.customBotToken) {
        await conn.execute('UPDATE user SET custom_channel_bot_token = ? WHERE id = ?', [data.customBotToken, userId]);
    }

    if(data.customBotName || data.customBotToken) {
        await checkChannelBotInstanceComplete(userId, channelName);
    }
    await conn.end();
}

export async function checkChannelBotInstanceComplete(userId: number, channel: string): Promise<void> {
    const data = await loadBotData(userId);
    if(data.customBotToken.length > 0 && data.customBotName.length > 0) {
        await createInstance(channel, data.customBotName, data.customBotToken);
    } else {
        await deleteInstance(channel);
    }
}

export async function getUserByTrustedChannel(channel: string): Promise<{id: number}> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<{id: number} & RowDataPacket>>('SELECT id FROM user WHERE LOWER(display_name) = ?', [channel.substr(1)]);
    await conn.end();
    return rows[0];
}

function replaceTrustedPlaceholder(msg: string, uptime: number | null): string {
    let fullMsg = msg;

    if(uptime) {
        const min = uptime % 60;
        const hrs = Math.floor(uptime / 60);
        const h = hrs > 0 ? (hrs === 1 ? '1 Stunde' : `${hrs} Stunden`) : '';
        const m = min > 0 ? (min === 1 ? '1 Minute' : `${min} Minuten`) : '';
        
        const uptimeStr = (h.length > 0 && m.length > 0) ? `${h} und ${m}` : (h.length > 0 ? h : m);

        fullMsg = fullMsg.replace(/\{UPTIME\}/g, uptimeStr);
    } else {
        fullMsg = fullMsg.replace(/\{UPTIME\}/g, '0 Minuten');
    }

    return fullMsg;
}

export async function getChannelCommands(channel: string): Promise<{[x: string]: string}> {
    const conn = await getConn();
    const user = await getUserByTrustedChannel(channel);
    const [commandRows] = await conn.execute<Array<Command & RowDataPacket>>('SELECT id, command, message FROM bot_commands WHERE user_id = ? AND active = TRUE', [user.id]);
    await conn.end();

    const onlineSince = await getOnlineSince(user.id);
    const uptime = onlineSince && dayjs().unix() - onlineSince;

    return commandRows.reduce<{[x: string]: string}>((acc, {command, message}) => {
        acc[command] = replaceTrustedPlaceholder(message, uptime);
        return acc;
    }, {});
}

export async function patchUser(userId: number, data: Partial<User>): Promise<void> {
    const conn = await getConn();

    if(data.dotaStatsFrom) {
        await conn.execute('UPDATE user SET dota_stats_from=? WHERE id=?', [data.dotaStatsFrom, userId]);
    }

    await conn.end();
}

export async function userConnected(userId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('UPDATE user SET gsi_connected=TRUE WHERE id=?', [userId]);
    await conn.end();
}