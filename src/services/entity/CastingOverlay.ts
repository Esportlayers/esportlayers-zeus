import { getConn } from "../../loader/db";
import { CastingOverlay } from "@streamdota/shared-types";
import { RowDataPacket } from "mysql2";

async function selectCastingOverlays(userId: number): Promise<CastingOverlay | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<CastingOverlay & RowDataPacket>>(`
        SELECT
            user_id as userId,
            font_family as font,
            font_variant as variant,
            background as backgroundColor
        FROM caster_overlays WHERE user_id = ?
    `, [userId]);
    await conn.end();

    return rows.length > 0 ? rows[0] : null;
}

export async function requireCastingOverlay(userId: number): Promise<CastingOverlay> {
    const overlay = await selectCastingOverlays(userId);

    if(overlay) {
        return overlay;
    }

    const conn = await getConn();
    conn.execute('INSERT INTO caster_overlays (user_id, font_family, font_variant, background) VALUES (?, "Roboto", "400", "rgba(0,0,0,.3)")', [userId]);
    await conn.end();

    return (await selectCastingOverlays(userId))!;
}

const transformMap: {[x: string]: string} = {
    font: 'font_family',
    variant: 'font_variant',
    backgroundColor: 'background',
}

export async function patchCastingOverlay(userId: number, data: Partial<Omit<CastingOverlay, 'userId'>>): Promise<void> {
    const conn = await getConn();

    for(const [key, value] of Object.entries(data)) {
        if(transformMap[key]) {
            await conn.execute(`UPDATE caster_overlays SET ${transformMap[key]} = ? WHERE user_id = ?`, [value, userId]);
        }
    }

    await conn.end();
}