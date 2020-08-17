import { getConn } from "../../loader/db";
import { RoshOverlay } from "@streamdota/shared-types";
import { RowDataPacket } from "mysql2";

async function selectRoshOverlay(userId: number): Promise<RoshOverlay | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<RoshOverlay & RowDataPacket>>(`
        SELECT
            id as id,
            user_id as userId,
            font as font,
            variant as variant,
            font_size as fontSize,
            aegis_color as aegisColor,
            base_color as baseColor,
            variable_color as variableColor
        FROM rosh_overlays WHERE user_id = ?
    `, [userId]);
    await conn.end();

    return rows.length > 0 ? rows[0] : null;
}

export async function requireRoshOverlay(userId: number): Promise<RoshOverlay> {
    const overlay = await selectRoshOverlay(userId);

    if(overlay) {
        return overlay;
    }

    const conn = await getConn();
    conn.execute('INSERT INTO rosh_overlays (id, user_id, font, variant, font_size, aegis_color, base_color, variable_color) VALUES (NULL, ?, "Roboto", "400", 25, "#FF9900", "#FFF", "F00")', [userId]);
    await conn.end();

    return (await selectRoshOverlay(userId))!;
}

const transformMap: {[x: string]: string} = {
    font: 'font',
    variant: 'variant',
    fontSize: 'font_size',
    aegisColor: 'aegis_color',
    baseColor: 'base_color',
    variableColor: 'variable_color',
}

export async function patchRoshOverlay(userId: number, data: Partial<Omit<RoshOverlay, 'id' | 'userId'>>): Promise<void> {
    const conn = await getConn();

    for(const [key, value] of Object.entries(data)) {
        if(transformMap[key]) {
            await conn.execute(`UPDATE rosh_overlays SET ${transformMap[key]} = ? WHERE user_id = ?`, [value, userId]);
        }
    }

    await conn.end();
}