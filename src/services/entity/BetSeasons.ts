import {
  BetSeason,
  BetSeasonInvite,
  BetSeasonToplist,
} from "@streamdota/shared-types";
import { OkPacket, RowDataPacket } from "mysql2";
import { deleteBetRound, getBetSeasonRounds } from "./BetRound";
import { loadUserById, patchUser } from "./User";

import { clearChannelUserChannel } from "../betting/state";
import { createBetCommands } from "./Command";
import { getConn } from "../../loader/db";
import { v4 } from "uuid";

export const rolePrio: { [x: string]: number } = {
  user: 0,
  editor: 1,
  owner: 2,
};

export async function getBetSeason(id: number): Promise<BetSeason | null> {
  const conn = await getConn();
  const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(
    `SELECT id as id, name, description, type FROM bet_seasons WHERE id = ?`,
    [id]
  );
  await conn.end();
  return rows.length > 0 ? rows[0] : null;
}

export async function getUserBetSeasons(userId: number): Promise<BetSeason[]> {
  const conn = await getConn();
  const [rows] = await conn.execute<Array<BetSeason & RowDataPacket>>(
    `
        SELECT bs.id as id, bs.name as name, bs.description as description, bs.type as type, bsu.userRole as userRole, bs.winner_count as winnerCount
          FROM bet_seasons bs 
    INNER JOIN bet_season_users bsu ON bsu.bet_season_id = bs.id AND bsu.user_id = ?`,
    [userId]
  );
  await conn.end();
  return rows.reduce<BetSeason[]>((acc, season) => {
    const addedSeason = acc.find(({ id }) => id === season.id);
    if (addedSeason) {
      if (rolePrio[addedSeason.userRole] < rolePrio[season.userRole]) {
        addedSeason.userRole = season.userRole;
      }
    } else {
      acc.push(season);
    }
    return acc;
  }, []);
}

export async function createUserBetSeason(
  userId: number,
  data: Omit<BetSeason, "id">
): Promise<void> {
  const conn = await getConn();
  const [{ insertId }] = await conn.execute<OkPacket>(
    "INSERT INTO bet_seasons (id, name, description, type) VALUES (NULL, ?, ?, ?)",
    [data.name, "", data?.type ?? "other"]
  );
  await conn.execute(
    "INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)",
    [userId, insertId, "owner"]
  );

  const user = await loadUserById(userId);
  if (!user?.betSeasonId) {
    await patchUser(userId, { betSeasonId: insertId });
    await createBetCommands(userId);
    clearChannelUserChannel(userId);
  }
  await conn.end();
}

export async function patchUserBetSeason(
  seasonId: number,
  data: Partial<BetSeason>
): Promise<void> {
  const conn = await getConn();

  if (data.name) {
    await conn.execute("UPDATE bet_seasons SET name = ? WHERE id = ?", [
      data.name,
      seasonId,
    ]);
  }

  if (data.description) {
    await conn.execute("UPDATE bet_seasons SET description = ? WHERE id = ?", [
      data.description,
      seasonId,
    ]);
  }

  if (data.type) {
    await conn.execute("UPDATE bet_seasons SET type = ? WHERE id = ?", [
      data.type,
      seasonId,
    ]);
  }

  if (data.winnerCount) {
    await conn.execute("UPDATE bet_seasons SET winner_count = ? WHERE id = ?", [
      data.winnerCount,
      seasonId,
    ]);
  }

  await conn.end();
}

export async function deleteBetSeason(
  seasonId: number,
  userId: number
): Promise<void> {
  const userInfo = await loadUserById(userId);
  const conn = await getConn();

  if (userInfo?.betSeasonId === seasonId) {
    const seasons = await getUserBetSeasons(userId);
    const otherId = seasons.find(({ id }) => id !== seasonId);
    const newSeason = otherId ? otherId.id : null;
    await patchUser(userId, { betSeasonId: newSeason });
  }
  await conn.execute("DELETE FROM bet_season_users WHERE bet_season_id = ?", [
    seasonId,
  ]);
  const [rounds] = await conn.execute<Array<{ id: number } & RowDataPacket>>(
    "SELECT id FROM bet_rounds WHERE bet_season_id = ?",
    [seasonId]
  );
  for (const round of rounds) {
    await deleteBetRound(round.id);
  }
  await conn.execute("DELETE FROM bet_seasons WHERE id = ?", [seasonId]);
  await conn.end();
}

export async function listInvites(
  seasonId: number
): Promise<BetSeasonInvite[]> {
  const conn = await getConn();
  const [rows] = await conn.execute<
    Array<BetSeasonInvite & RowDataPacket & { invitedBy: string }>
  >(
    "SELECT bsi.invite_key as inviteKey, UNIX_TIMESTAMP(bsi.created) as created, bsi.status, u.display_name as invitedBy FROM bet_season_invites bsi INNER JOIN user u ON u.id = bsi.user_id WHERE bsi.bet_season_id = ?",
    [seasonId]
  );
  await conn.end();
  return rows;
}

interface BetSeasonUser {
  id: number;
  name: string;
  userRole: "owner" | "editor" | "user";
}

export async function listUsers(seasonId: number): Promise<BetSeasonUser[]> {
  const conn = await getConn();
  const [rows] = await conn.execute<Array<BetSeasonUser & RowDataPacket>>(
    "SELECT u.id, u.display_name as displayName, bsu.userRole as userRole FROM bet_season_users bsu INNER JOIN user u ON u.id = bsu.user_id WHERE bsu.bet_season_id = ?",
    [seasonId]
  );
  await conn.end();
  return rows;
}

export async function createSeasonInvite(
  seasonId: number,
  userId: number
): Promise<string> {
  const inviteKey = v4();
  const conn = await getConn();
  await conn.execute(
    "INSERT INTO bet_season_invites (bet_season_id, user_id, invite_key, created, status) VALUES (?, ?, ?, NOW(), ?)",
    [seasonId, userId, inviteKey, "open"]
  );
  await conn.end();
  return inviteKey;
}

type BetInvitePlainRow = Omit<BetSeasonInvite, "betSeason"> & {
  betSeason: BetSeason;
} & RowDataPacket;

export async function getInviteByKey(
  key: string,
  userId: number
): Promise<BetInvitePlainRow | null> {
  const conn = await getConn();
  const [rows] = await conn.execute<BetInvitePlainRow[]>(
    "SELECT bet_season_id as betSeason, user_id as owner, invite_key as inviteKey, UNIX_TIMESTAMP(created) as created, status FROM bet_season_invites WHERE invite_key = ? AND user_id = ?",
    [key, userId]
  );
  await conn.end();

  return rows.length > 0
    ? {
        ...rows[0],
        betSeason: (await getBetSeason(
          rows[0].betSeason as unknown as number
        ))!,
      }
    : null;
}

export async function acceptSeasonInvite(
  key: string,
  userId: number
): Promise<void> {
  const invite = await getInviteByKey(key, userId);
  if (invite && invite.status === "open") {
    const conn = await getConn();
    await conn.execute(
      "UPDATE bet_season_invites SET status=? WHERE bet_season_id=?",
      ["accepted", invite.betSeason.id]
    );
    await conn.execute(
      "INSERT INTO bet_season_users (user_id, bet_season_id, userRole) VALUES (?, ?, ?)",
      [userId, invite.betSeason.id, "user"]
    );
    await conn.end();
  }
}

export async function denySeasonInvite(
  key: string,
  userId: number
): Promise<void> {
  const invite = await getInviteByKey(key, userId);
  if (invite && invite.status === "open") {
    const conn = await getConn();
    await conn.execute(
      "UPDATE bet_season_invites SET status=? WHERE bet_season_id=?",
      ["denied", invite.betSeason.id]
    );
    await conn.end();
  }
}

export async function deleteInviteByKey(
  key: string,
  betSeasonId: number,
  userId: number
): Promise<void> {
  const invite = await getInviteByKey(key, userId);
  if (invite && invite.betSeason.id === betSeasonId) {
    const conn = await getConn();
    await conn.execute("DELETE FROM bet_season_invites WHERE invite_key = ?", [
      key,
    ]);
    await conn.end();
  }
}

export async function getUserBetSeasonRole(
  userId: number,
  betSeasonId: number
): Promise<string | null> {
  const conn = await getConn();
  const [rows] = await conn.execute<
    Array<{ userRole: string } & RowDataPacket>
  >(
    "SELECT userRole FROM bet_season_users WHERE bet_season_id=? AND user_id=?",
    [betSeasonId, userId]
  );
  await conn.end();
  return rows.length > 0 ? rows[0].userRole : null;
}

export async function patchUserBetSeasonRole(
  betSeasonId: number,
  userId: number,
  userRole: "owner" | "editor" | "user"
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "UPDATE bet_season_invites SET userRole=? WHERE user_id=? AND bet_season_id=?",
    [userRole, userId, betSeasonId]
  );
  await conn.end();
}

export async function deleteUserBetSeason(
  betSeasonId: number,
  userId: number
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "DELETE FROM bet_season_invites WHERE user_id=? AND bet_season_id=?",
    [userId, betSeasonId]
  );
  await conn.end();
}

export async function seasonTopList(
  betSeasonId: number
): Promise<BetSeasonToplist[]> {
  const conn = await getConn();
  const [toplist] = await conn.execute<Array<BetSeasonToplist & RowDataPacket>>(
    `
        SELECT 
            w.id as id,
            w.display_name as name,
            w.username as username,
            SUM(IF(b.bet = br.result, 1, 0)) as won,
            COUNT(b.id) as total,
            br.bet_season_id as betSeason
       FROM bets b
 INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND br.status = 'finished'
 INNER JOIN watchers w on b.watcher_id = w.id
   GROUP BY w.twitch_id
   ORDER BY won DESC, total
`,
    [betSeasonId]
  );
  await conn.end();

  return toplist;
}

export async function getUserSeasonStats(
  username: string,
  betSeasonId: number
): Promise<{ won: number; total: number }> {
  const conn = await getConn();
  const [toplist] = await conn.execute<Array<BetSeasonToplist & RowDataPacket>>(
    `
        SELECT 
            SUM(IF(b.bet = br.result, 1, 0)) as won,
            COUNT(b.id) as total
       FROM bets b
 INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND br.status = 'finished'
 INNER JOIN watchers w on b.watcher_id = w.id AND w.username = ?
`,
    [betSeasonId, username]
  );
  await conn.end();

  return toplist.length > 0
    ? { won: toplist[0].won ?? 0, total: toplist[0].total }
    : { won: 0, total: 0 };
}

async function getSeasonParticipants(betSeasonId: number): Promise<number> {
  const conn = await getConn();
  const [users] = await conn.execute<Array<{ count: number } & RowDataPacket>>(
    `SELECT COUNT(b.id) as count FROM bets b INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ?;`,
    [betSeasonId]
  );
  await conn.end();

  return users.length ? users[0].count : 0;
}

async function getSeasonUniqueParticipants(
  betSeasonId: number
): Promise<number> {
  const conn = await getConn();
  const [users] = await conn.execute<Array<{ count: number } & RowDataPacket>>(
    `SELECT COUNT(b.id) FROM bets b INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? GROUP BY b.watcher_id;`,
    [betSeasonId]
  );
  await conn.end();

  return users.length ?? 0;
}

async function getCorrectVotes(betSeasonId: number): Promise<number> {
  const conn = await getConn();
  const [users] = await conn.execute<Array<{ count: number } & RowDataPacket>>(
    `SELECT COUNT(b.id) as count FROM bets b INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND b.bet = br.result;`,
    [betSeasonId]
  );
  await conn.end();

  return users.length ? users[0].count : 0;
}

async function getSeasonChattersParticipations(
  betSeasonId: number
): Promise<{ min: number; max: number; avg: number }> {
  const conn = await getConn();
  const [result] = await conn.execute<
    Array<{ min: number; max: number; avg: number } & RowDataPacket>
  >(
    "SELECT MIN((SELECT COUNT(b.id) FROM bets b WHERE b.bet_round_id = br.id) / br.chatters) * 100 as `min`, MAX((SELECT COUNT(b.id) FROM bets b WHERE b.bet_round_id = br.id) / br.chatters) * 100 as `max`, AVG((SELECT COUNT(b.id) FROM bets b WHERE b.bet_round_id = br.id) / br.chatters) * 100 as `avg` FROM bet_rounds br WHERE br.bet_season_id = ?;",
    [betSeasonId]
  );
  await conn.end();

  return result.length ? result[0] : { min: 0, max: 0, avg: 0 };
}

interface VoteSeasonRoundStats {
  round: number;
  chatters: number;
  participants: number;
}

async function getSeasonRounds(
  betSeasonId: number
): Promise<VoteSeasonRoundStats[]> {
  const conn = await getConn();
  const [result] = await conn.execute<
    Array<VoteSeasonRoundStats & RowDataPacket>
  >(
    "SELECT round, chatters, (SELECT COUNT(b.id) FROM bets b WHERE b.bet_round_id = br.id) as participants FROM bet_rounds br WHERE br.bet_season_id = ?;",
    [betSeasonId]
  );
  await conn.end();

  return result;
}

interface BetSeasonStats {
  id: number;
  rounds: number;
  roundsData: VoteSeasonRoundStats[];
  votes: number;
  uniqueVoters: number;
  correct: number;
  wrong: number;
  chatParticipation: {
    avg: number;
    max: number;
    min: number;
  };
}

export async function seasonStats(
  betSeasonId: number
): Promise<BetSeasonStats> {
  const rounds = (await getBetSeasonRounds(betSeasonId)).length;
  const participants = await getSeasonParticipants(betSeasonId);
  const uniqueParticipants = await getSeasonUniqueParticipants(betSeasonId);
  const correctVotes = await getCorrectVotes(betSeasonId);
  const wrongVotes = participants - correctVotes;
  const chatterParticipations = await getSeasonChattersParticipations(
    betSeasonId
  );
  const roundsData = await getSeasonRounds(betSeasonId);

  return {
    id: betSeasonId,
    rounds,
    roundsData,
    votes: participants,
    uniqueVoters: uniqueParticipants,
    correct: correctVotes,
    wrong: wrongVotes,
    chatParticipation: chatterParticipations,
  };
}

export async function getProvablyFairList(
  betSeasonId: number
): Promise<string[]> {
  const conn = await getConn();
  const [result] = await conn.execute<Array<{ name: string } & RowDataPacket>>(
    `
        SELECT w.display_name as name 
            FROM bets b 
        INNER JOIN watchers w ON b.watcher_id = w.id
        INNER JOIN bet_rounds br ON br.id = b.bet_round_id AND br.bet_season_id = ? AND b.bet = br.result
        ORDER BY w.display_name
        ;`,
    [betSeasonId]
  );
  await conn.end();
  return (result || []).map(({ name }) => name);
}

export async function getWinner(seasonId: number): Promise<BetSeasonToplist[]> {
  const season = await getBetSeason(seasonId);
  const toplist = await seasonTopList(seasonId);
  return toplist.slice(0, season?.winnerCount || 3);
}

export async function getProvablyFairListWithoutWinner(
  seasonId: number
): Promise<string[]> {
  const winner = await getWinner(seasonId);
  const wonNames = new Set([...winner?.map(({ name }) => name)]);
  const allWinnerList = await getProvablyFairList(seasonId);
  return allWinnerList.filter((name) => !wonNames.has(name));
}
