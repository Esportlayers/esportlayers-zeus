import {Command} from '@streamdota/shared-types';
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";
import { clearUserCommandsChache } from "../twitchChat";

export async function getUserCommands(userId: number): Promise<Command[]> {
    const conn = await getConn();
    const [commandRows] = await conn.execute<Array<Command & RowDataPacket>>(`
        SELECT 
            id, 
            command, 
            message,
            active, 
            type, 
            user_access as userAccess, 
            sub_tier1_access as tier1Access, 
            sub_tier2_access as tier2Access, 
            sub_tier3_access as tier3Access, 
            vip_access as vipAccess, 
            mod_access as modAccess, 
            streamer_access as streamerAccess, 
            no_response as noResponse, 
            delete_able as deleteAble, 
            internal_identifier as identifier 
        FROM bot_commands WHERE user_id = ?`, [userId]);
    await conn.end();

    return commandRows;
}

export async function createUserCommand(
    userId: number,
    active: boolean,
    command: string,
    message: string,
    type: string,
    readonly: boolean = false,
    deleteAble: boolean = true,
    identifier: string = '',
    access?: Set<string>,
): Promise<void> {
    let acc = access ? access : new Set(['userAccess', 'tier1Access', 'tier2Access', 'tier3Access', 'vipAccess', 'modAccess', 'streamerAccess']);
    const conn = await getConn();
    await conn.execute(`INSERT INTO bot_commands 
        (id, user_id, command, message, active, type, no_response, delete_able, internal_identifier, user_access, sub_tier1_access, sub_tier2_access, sub_tier3_access, vip_access, mod_access, streamer_access) 
        VALUES 
        (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [userId, command, message, active, type, readonly, deleteAble, identifier, acc.has('userAccess'), acc.has('tier1Access'), acc.has('tier2Access'), acc.has('tier3Access'), acc.has('vipAccess'), acc.has('modAccess'), acc.has('streamerAccess')]);
    await conn.end();

    await clearUserCommandsChache(userId);
}

const transformMap: {[x: string]: string} = {
    command: 'command',
    message: 'message',
    active: 'active',
    type: 'type',
    userAccess: 'user_access', 
    tier1Access: 'sub_tier1_access', 
    tier2Access: 'sub_tier2_access', 
    tier3Access: 'sub_tier3_access', 
    vipAccess: 'vip_access', 
    modAccess: 'mod_access', 
    streamerAccess: 'streamer_access', 
}

export async function patchCommand(commandId: number, userId: number, data: Partial<Command>): Promise<void> {
    const conn = await getConn();

    for(const [key, value] of Object.entries(data)) {
        if(transformMap[key]) {
            await conn.execute(`UPDATE bot_commands SET ${transformMap[key]} = ? WHERE id=? AND user_id=?`, [value, commandId, userId]);
        }
    }

    await conn.end();
    
    await clearUserCommandsChache(userId);
}

export async function deleteCommand(commandId: number, userId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bot_commands WHERE id=? AND user_id=?', [commandId, userId]);
    await conn.end();

    await clearUserCommandsChache(userId);
}

export async function createBetCommands(userId: number): Promise<void> {
    const userCommands = await getUserCommands(userId);
    const hasBetCommands = userCommands.filter(({type}) => type === 'betting_streamer' || type === 'betting_user').length > 0;

    if(!hasBetCommands) {
        await createUserCommand(userId, true, '!startbet', 'Die Wetten sind offen, es kann nun mit “{BET_COMMAND} a” oder “{BET_COMMAND} b” abgestimmt werden', 'betting_streamer', false, false, 'startbet', new Set(['streamerAccess']));
        await createUserCommand(userId, true, '!winner', 'Der Gewinner der Wetter wurde auf Team {WINNER} festgelegt.', 'betting_streamer', false, false, 'betwinner', new Set(['streamerAccess']));
        await createUserCommand(userId, true, '!bet', '', 'betting_user', true, false, 'bet');
        await createUserCommand(userId, true, '!toplist', 'Die aktuelle Toplist ist: {TOPLIST_STATS}', 'betting_user');
        await createUserCommand(userId, true, '!betstats', '{USER}, du hast aktuell {USER_BETS_CORRECT} von {USER_BETS_TOTAL} Wetten korrekt.', 'betting_user');
    }

}