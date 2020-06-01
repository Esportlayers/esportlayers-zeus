import { BetOverlay } from "../../@types/Entities/BetOverlay";
import { getConn } from "../../loader/db";
import { RowDataPacket } from "mysql2";


async function selectBetOverlay(userId: number): Promise<BetOverlay | null> {
    const conn = await getConn();
    const [rows] = await conn.execute<Array<BetOverlay & RowDataPacket>>(`
        SELECT
            user_id as userId,
            font_family as fontFamily,
            font_variant as fontVariant,
            distribution_background as distributionBackground,
            distribution_font as distributionFont,
            distribution_font_size as distributionFontSize,
            distribution_color_left as distributionColorLeft,
            distribution_color_right as distributionColorRight,
            timer_background as timerBackground,
            timer_font as timerFont,
            timer_font_size as timerFontSize,
            toplist_background as toplistBackground,
            toplist_font as toplistFont,
            toplist_font_size as toplistFontSize,
            toplist_show_rang as toplistShowRank,
            toplist_show_total_bets as toplistShowTotalBets,
            toplist_show_accuracy as toplistShowAccuracy
        FROM bet_overlays WHERE user_id = ?
    `, [userId]);
    await conn.end();

    return rows.length > 0 ? rows[0] : null;
}

export async function requireBetOverlay(userId: number): Promise<BetOverlay> {
    const overlay = await selectBetOverlay(userId);

    if(overlay) {
        return overlay;
    }

    const conn = await getConn();
    conn.execute('INSERT INTO bet_overlays (user_id) VALUES (?)', [userId]);
    await conn.end();

    return (await selectBetOverlay(userId))!;
}

const transformMap: {[x: string]: string} = {
    fontFamily: 'font_family',
    fontVariant: 'font_variant',
    distributionBackground: 'distribution_background',
    distributionFont: 'distribution_font',
    distributionFontSize: 'distribution_font_size',
    distributionColorLeft: 'distribution_color_left',
    distributionColorRight: 'distribution_color_right',   
    timerBackground: 'timer_background',   
    timerFont: 'timer_font',   
    timerFontSize: 'timer_font_size',   
    toplistBackground: 'toplist_background',   
    toplistFont: 'toplist_font',     
    toplistFontSize: 'toplist_font_size',     
    toplistShowRank: 'toplist_show_rank',     
    toplistShowTotalBets: 'toplist_show_total_bets',     
    toplistShowAccuracy: 'toplist_show_accuracy',   
}

export async function patchBetOverlay(userId: number, data: Partial<Omit<BetOverlay, 'userId'>>): Promise<void> {
    const conn = await getConn();

    for(const [key, value] of Object.entries(data)) {
        if(transformMap[key]) {
            await conn.execute(`UPDATE bet_overlays SET ${transformMap[key]} = ? WHERE user_id = ?`, [value, userId]);
        }
    }

    await conn.end();
}