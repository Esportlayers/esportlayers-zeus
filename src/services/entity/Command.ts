import {Command} from '@streamdota/shared-types';
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";
import { clearUserCommandsChache } from "../twitchChat";


export async function getUserCommands(userId: number): Promise<Command[]> {
    const conn = await getConn();
    const [commandRows] = await conn.execute<Array<Command & RowDataPacket>>('SELECT id, command, message, active, type, access, no_response as noResponse, delete_able as deleteAble, internal_identifier as identifier FROM bot_commands WHERE user_id = ?', [userId]);
    await conn.end();

    return commandRows;
}

export async function createUserCommand(userId: number, active: boolean, command: string, message: string, type: string, readonly: boolean = false, deleteAble: boolean = true, identifier: string = ''): Promise<void> {
    const conn = await getConn();
    await conn.execute('INSERT INTO bot_commands (id, user_id, command, message, active, type, access, no_response, delete_able, internal_identifier) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, command, message, active, type, 'user', readonly, deleteAble, identifier]);
    await conn.end();

    await clearUserCommandsChache(userId);
}

export async function patchCommand(commandId: number, userId: number, active: boolean, command: string, message: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('UPDATE bot_commands SET active=?, command=?, message=? WHERE id=? AND user_id=?', [active, command, message, commandId, userId]);
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
        await createUserCommand(userId, true, '!startbet', 'Die Wetten sind offen, es kann nun mit “{BET_COMMAND} a” oder “{BET_COMMAND} b” abgestimmt werden', 'betting_streamer', false, false, 'startbet');
        await createUserCommand(userId, true, '!winner', 'Der Gewinner der Wetter wurde auf Team {WINNER} festgelegt.', 'betting_streamer', false, false, 'betwinner');
        await createUserCommand(userId, true, '!bet', '', 'betting_user', true, false, 'bet');
        await createUserCommand(userId, true, '!toplist', 'Die aktuelle Toplist ist: {TOPLIST_STATS}', 'betting_user');
        await createUserCommand(userId, true, '!betstats', '{USER}, du hast aktuell {USER_BETS_CORRECT} von {USER_BETS_TOTAL} Wetten korrekt.', 'betting_user');
    }

}