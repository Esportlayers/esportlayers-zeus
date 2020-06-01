import {OverlayConfig} from '@streamdota/shared-types/Entities/DotOverlay';
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

type OverlayConfigRow = OverlayConfig & RowDataPacket; 

async function requireDotaOverlay(userId: number): Promise<OverlayConfig> {
    const conn = await getConn();
    const [rows] = await conn.execute<OverlayConfigRow[]>(`
        SELECT 
            font, 
            variant, 
            font_size as fontSize, 
            win_color as winColor, 
            divider_color as dividerColor, 
            loss_color as lossColor, 
            show_background as showBackground,
            winX,
            winY,
            lossX,
            lossY,
            dividerX,
            dividerY
        FROM dota_overlays WHERE user_id = ?;`, [userId]);
    if(rows.length > 0) {
        await conn.end();
        return rows[0];
    }

    await conn.execute("INSERT INTO dota_overlays(id, user_id, font, variant, font_size, win_color, divider_color, loss_color, show_background, winX, winY, lossX, lossY, dividerX, dividerY) VALUES (NULL, ?, 'Arial', '400', 50, '#0F0', '#CCC' , '#F00', TRUE, 35, 5, 107, 5, 80, 1);", [userId]);
    await conn.end();
    return {
        font: 'Arial',
        fontSize: 50,
        variant: '400',
        winColor: '#0F0',
        dividerColor: '#CCC',
        lossColor: '#F00',
        showBackground: true,
        winX: 35,
        winY: 5,
        dividerX: 80,
        dividerY: 1,
        lossX: 107,
        lossY: 5,
    };
}

export async function getDotaOverlayByUser(userId: number): Promise<OverlayConfig> {
    return requireDotaOverlay(userId);
}

export async function updateOverlay(userId: number, cfg: OverlayConfig): Promise<void> {
    const conn = await getConn();
    await conn.execute(
        "UPDATE dota_overlays SET font=?, variant=?, font_size=?, win_color=?, divider_color=?, loss_color=?, show_background =?, winX=?, winY=?, lossX=?, lossY=?, dividerX=?, dividerY=? WHERE user_id=?", 
        [cfg.font, cfg.variant, cfg.fontSize, cfg.winColor, cfg.dividerColor, cfg.lossColor, cfg.showBackground, cfg.winX, cfg.winY, cfg.lossX, cfg.lossY, cfg.dividerX, cfg.dividerY, userId]
    );
    await conn.end();
}