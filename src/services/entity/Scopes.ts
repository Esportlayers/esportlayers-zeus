import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

interface UserScope {
  apiKey: string;
  status: string;
  scopeAvatar: string;
  scopeName: string;
  scopeId: string;
}

export async function getUserScopes(userId: number): Promise<UserScope[]> {
  const conn = await getConn();
  const [userScopes] = await conn.execute<Array<UserScope & RowDataPacket>>(
    "SELECT us.api_key as apiKey, us.status as status, u.avatar as scopeAvatar, u.display_name as scopeName, us.scoped_user_id as scopeId FROM user_scopes us INNER JOIN user u ON u.id = us.scoped_user_id WHERE us.user_id = ?",
    [userId]
  );
  await conn.end();

  return userScopes;
}

export async function getScopedUserByApiKey(
  key: string
): Promise<{ id: number; displayName: string; scopedUserId: number } | void> {
  const conn = await getConn();
  const [authRows] = await conn.query<
    Array<
      RowDataPacket & { id: number; displayName: string; scopedUserId: number }
    >
  >(
    "SELECT us.scoped_user_id as scopedUserId, u.id as id, u.display_name as displayName FROM user_scopes us INNER JOIN user u ON u.id = us.user_id WHERE us.api_key = ?;",
    [key]
  );
  await conn.end();

  if (authRows.length > 0) {
    return authRows[0];
  }
}

export async function getScopedUser(
  userId: number
): Promise<{ id: number; displayName: string }[]> {
  const conn = await getConn();
  const [scopes] = await conn.query<
    Array<RowDataPacket & { id: number; displayName: string }>
  >(
    "SELECT us.user_id as id, u.display_name as displayName FROM user_scopes us INNER JOIN user u ON u.id = us.user_id WHERE us.scoped_user_id = ?;",
    [userId]
  );
  await conn.end();

  return scopes;
}
