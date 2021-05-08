import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

interface TwitchOutcomeIds {
  outcomeA: string;
  outcomeB: string;
}

export async function getTwitchPrediction(
  id: string
): Promise<TwitchOutcomeIds | null> {
  const conn = await getConn();
  const [rows] = await conn.execute<Array<TwitchOutcomeIds & RowDataPacket>>(
    "SELECT outcome_a as outcomeA, outcome_b as outcomeB FROM twitch_predictions WHERE id = ?",
    [id]
  );
  await conn.end();

  if (rows.length > 0) {
    return {
      outcomeA: rows[0].outcomeA,
      outcomeB: rows[0].outcomeB,
    };
  }

  return null;
}

export async function createTwitchPrediction(
  id: string,
  outcomeA: string,
  outcomeB: string
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "INSERT INTO twitch_predictions (id, outcome_a, outcome_b) VALUES (?, ?, ?)",
    [id, outcomeA, outcomeB]
  );
  await conn.end();
}

export async function deleteTwitchPrediction(id: string): Promise<void> {
  const conn = await getConn();
  await conn.execute("DELETE FROM twitch_predictions WHERE id = ?", [id]);
  await conn.end();
}
