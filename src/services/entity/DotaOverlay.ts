import { OverlayConfig } from "@streamdota/shared-types";
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

type OverlayConfigRow = OverlayConfig & RowDataPacket;

async function requireDotaOverlay(userId: number): Promise<OverlayConfig> {
  const conn = await getConn();
  const [rows] = await conn.execute<OverlayConfigRow[]>(
    `
        SELECT 
            font, 
            variant, 
            font_size as fontSize, 
            win_color as winColor, 
            loss_color as lossColor, 
            show_background as showBackground,
            winX,
            winY,
            lossX,
            lossY,
            always_visible as alwaysVisible,
            no_animation as noAnimation
        FROM dota_overlays WHERE user_id = ?;`,
    [userId]
  );
  if (rows.length > 0) {
    await conn.end();
    return rows[0];
  }

  await conn.execute(
    "INSERT INTO dota_overlays(id, user_id, font, variant, font_size, win_color, loss_color, show_background, winX, winY, lossX, lossY) VALUES (NULL, ?, 'Arial', '400', 50, '#0F0' , '#F00', TRUE, 31, 8, 96, 8);",
    [userId]
  );
  await conn.end();
  return {
    font: "Arial",
    fontSize: 50,
    variant: "400",
    winColor: "#0F0",
    lossColor: "#F00",
    showBackground: true,
    winX: 31,
    winY: 8,
    lossX: 96,
    lossY: 8,
    alwaysVisible: false,
    noAnimation: false,
  };
}

export async function getDotaOverlayByUser(
  userId: number
): Promise<OverlayConfig> {
  return requireDotaOverlay(userId);
}

const transformMap: { [x: string]: string } = {
  font: "font",
  fontSize: "font_size",
  variant: "variant",
  winColor: "win_color",
  lossColor: "loss_color",
  showBackground: "show_background",
  winX: "winX",
  winY: "winY",
  lossX: "lossX",
  lossY: "lossY",
  alwaysVisible: "always_visible",
  noAnimation: "no_animation",
};

export async function updateOverlay(
  userId: number,
  cfg: Partial<OverlayConfig>
): Promise<void> {
  const conn = await getConn();

  for (const [key, value] of Object.entries(cfg)) {
    if (transformMap[key]) {
      await conn.execute(
        `UPDATE dota_overlays SET ${transformMap[key]} = ? WHERE user_id = ?`,
        [value, userId]
      );
    }
  }

  await conn.end();
}
