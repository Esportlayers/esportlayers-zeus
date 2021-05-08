import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

export type TwitchScopes = "predictions";

interface UserScopeAccess {
  accessToken: string;
  refreshToken: string;
}

export async function getUserScopeAccess(
  userId: number,
  scope: TwitchScopes
): Promise<UserScopeAccess | null> {
  const conn = await getConn();
  const [rows] = await conn.execute<
    Array<{ access_token: string; refresh_token: string } & RowDataPacket>
  >(
    `SELECT access_token, refresh_token FROM twitch_user_scopes_access WHERE  user_id = ? AND scope = ?`,
    [userId, scope]
  );
  await conn.end();

  if (!rows.length) {
    return null;
  }

  return {
    accessToken: rows[0].access_token,
    refreshToken: rows[0].refresh_token,
  };
}

export async function putUserOAuthScope(
  userId: number,
  scope: TwitchScopes,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const hasScopes = !!(await getUserScopeAccess(userId, scope));

  if (!hasScopes) {
    await createTwitchUserOAuthScope(userId, scope, accessToken, refreshToken);
  } else {
    await updateTwitchUserOAuthScope(userId, scope, accessToken, refreshToken);
  }
}

export async function createTwitchUserOAuthScope(
  userId: number,
  scope: TwitchScopes,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "INSERT INTO twitch_user_scopes_access (id, user_id, scope, access_token, refresh_token) VALUES (NULL, ?, ?, ?, ?)",
    [userId, scope, accessToken, refreshToken]
  );
  await conn.end();
}

export async function updateTwitchUserOAuthScope(
  userId: number,
  scope: TwitchScopes,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "UPDATE twitch_user_scopes_access SET access_token=?, refresh_token=? WHERE user_id = ? AND scope =?",
    [accessToken, refreshToken, userId, scope]
  );
  await conn.end();
}
