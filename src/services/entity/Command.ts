import { Command } from "../../@types/Entities/User";
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";


export async function getUserCommands(userId: number): Promise<Command[]> {
    const conn = await getConn();
    const [commandRows] = await conn.execute<Array<Command & RowDataPacket>>('SELECT id, command, message, active, type, access FROM bot_commands WHERE user_id = ?', [userId]);
    await conn.end();

    return commandRows;
}

export async function createUserCommand(userId: number, active: boolean, command: string, message: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('INSERT INTO bot_commands (id, user_id, command, message, active, type, access) VALUES (NULL, ?, ?, ?, ?, ?, ?)', [userId, command, message, active, 'default', 'user']);
    await conn.end();
}

export async function patchCommand(commandId: number, userId: number, active: boolean, command: string, message: string): Promise<void> {
    const conn = await getConn();
    await conn.execute('UPDATE bot_commands SET active=?, command=?, message=? WHERE id=? AND user_id=?', [active, command, message, commandId, userId]);
    await conn.end();
}

export async function deleteCommand(commandId: number, userId: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM bot_commands WHERE id=? AND user_id=?', [commandId, userId]);
    await conn.end();
}