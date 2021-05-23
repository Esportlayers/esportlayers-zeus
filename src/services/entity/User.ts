import { Command, SteamConnection, User } from "@streamdota/shared-types";
import { OkPacket, RowDataPacket } from "mysql2";
import { joinChannel, partChannel } from "../twitchChat";

import { clearBettingCommandsCache } from "../betting/chatCommands";
import { clearChannelUserChannel } from "../betting/state";
import dayjs from "dayjs";
import { getConn } from "../../loader/db";
import { getUserCommands } from "./Command";
import { resetKeywordListener } from "../plugins/chat/chatListener";
import { sendMessage } from "../websocket";
import { streamFile } from "../staticFileHandler";
import { v4 } from "uuid";

type UserResponse = User & RowDataPacket & OkPacket;

async function downloadUserAvatar(
  url: string,
  userId: number
): Promise<[string, string, string]> {
  return await streamFile("userAvatar", url, "" + userId);
}

export async function findOrCreateUser(
  twitchId: number,
  displayName: string,
  avatar: string
): Promise<User> {
  const conn = await getConn();
  let user = await loadUserByTwitchId(twitchId);

  if (!user) {
    const frameKey = v4();
    const [original, webp, jp2] = await downloadUserAvatar(avatar, twitchId);
    const profileUrl = "https://twitch.tv/" + displayName;
    conn.execute<OkPacket>(
      "INSERT INTO user (id, twitch_id, display_name, avatar, avatar_webp, avatar_jp2, profile_url, gsi_auth, frame_api_key, dota_stats_from) VALUES (NULL, ?, ?, ?, ?, ?, ?, '', ?, 'session');",
      [twitchId, displayName, original, webp, jp2, profileUrl, frameKey]
    );
    const [userRow] = await conn.query<UserResponse[]>(
      "SELECT * FROM user WHERE twitch_id = ?;",
      [twitchId]
    );
    user = userRow[0];

    joinChannel("#" + displayName.toLowerCase());
  } else {
    user = await loadUserByTwitchId(twitchId);
  }

  await conn.end();
  return user!;
}

const userQry = `
SELECT 
    u.id as id, 
    u.twitch_id as twitchId,
    u.display_name as displayName, 
    u.avatar as avatar, 
    u.avatar_webp as avatarWEBP, 
    u.avatar_jp2 as avatarJP2, 
    u.profile_url as profileUrl, 
    u.gsi_auth as gsiAuth, 
    u.frame_api_key as frameApiKey, 
    u.dota_stats_from as dotaStatsFrom, 
    u.bet_season_id as betSeasonId, 
    u.gsi_connected as gsiConnected, 
    u.use_bets as useBets,
    u.gsi_active as gsiActive,
    u.status as status,
    UNIX_TIMESTAMP(u.created) as created,
    u.dota_stats_pick_hidden as dotaStatsPickHidden,
    u.dota_stats_menu_hidden as dotaStatsMenuHidden,
    u.stream_delay as streamDelay,
    u.team_a_name as teamAName,
    u.team_b_name as teamBName,
    u.use_automatic_voting as useAutomaticVoting,
    u.keyword_listening as keywordListener,
    u.use_keyword_listener as useKeywordListener,
    u.individual_overlay_vote_distribution as individualOverlayVoteDistribution,
    u.individual_overlay_vote_toplist as individualOverlayVoteToplist,
    u.individual_overlay_vote_timer as individualOverlayVoteTimer,
    u.individual_overlay_wl_stats as individualOverlayWLStats,
    u.individual_overlay_minimap as individualOverlayMinimap,
    u.individual_overlay_draft_stats as individualOverlayDraftStats,
    u.individual_overlay_hero_stats as individualOverlayVoteHeroStats,
    u.individual_rosh_timer_overlay as individualOverlayRoshTimer,
    u.use_dota_stats_overlay as useDotaStatsOverlay,
    u.use_minimap_overlay as useMinimapOverlay,
    u.use_roshan_timer_overlay as useRoshanTimerOverlay,
    u.use_draft_stats_overlay as useDraftStatsOverlay,
    u.use_hero_stats_overlay as useHeroStatsOverlay,
    u.use_vote_toplist_overlay as useVoteToplistOverlay,
    u.use_vote_timer_overlay as useVoteTimerOverlay,
    u.use_vote_distribution_overlay as useVoteDistributionOverlay,
    u.casting_stats_source as castingStatsSource,
    u.use_keyword_listener_overlay as useKeywordListenerOverlay,
    u.use_predictions as usePredictions,
    u.prediction_duration as predictionDuration,
    tusa.user_id as hasPredictionAccess,
    u.prediction_playing_title as predictionPlayingTitle,
    u.prediction_playing_option_a as predictionPlayingOptionA,
    u.prediction_playing_option_b as predictionPlayingOptionB,
    u.prediction_observing_title as predictionObservingTitle,
    u.prediction_observing_option_a as predictionObservingOptionA,
    u.prediction_observing_option_b as predictionObservingOptionB
FROM user u
LEFT JOIN twitch_user_scopes_access tusa ON tusa.user_id = u.id`;

export async function loadUserByTwitchId(
  twitchId: number
): Promise<User | null> {
  const conn = await getConn();
  const [userRows] = await conn.query<UserResponse[]>(
    `${userQry} WHERE u.twitch_id = ?;`,
    [twitchId]
  );
  let user = null;

  if (userRows.length === 1) {
    user = userRows[0];
  }
  await conn.end();

  return user;
}

export async function loadUserById(id: number): Promise<User | null> {
  const conn = await getConn();
  const [userRows] = await conn.query<UserResponse[]>(
    `${userQry} WHERE u.id = ?;`,
    [id]
  );
  let user = null;

  if (userRows.length === 1) {
    user = userRows[0];
  }
  await conn.end();

  return user;
}

interface SteamConnectionRows extends RowDataPacket {
  id: number;
  userId: number;
  steamId: string;
}

export async function loadSteamConnections(
  userId: number
): Promise<SteamConnection[]> {
  const conn = await getConn();
  const [steamRows] = await conn.query<SteamConnectionRows[]>(
    "SELECT id, user_id as userId, steam_id as steamId FROM steam_connections WHERE user_id = ?;",
    [userId]
  );
  await conn.end();

  return steamRows;
}

export async function createGsiAuthToken(userId: number): Promise<string> {
  const auth = v4();

  const conn = await getConn();
  await conn.execute(
    "UPDATE user SET gsi_auth = ?, gsi_connected = FALSE WHERE id = ?;",
    [auth, userId]
  );
  await conn.end();

  return auth;
}

export async function gsiAuthTokenUnknown(gsiAuthToken: string): Promise<{
  id: number;
  displayName: string;
  status: "active" | "disabled";
} | void> {
  const conn = await getConn();
  const [authRows] = await conn.query<
    Array<
      RowDataPacket & {
        id: number;
        displayName: string;
        status: "active" | "disabled";
      }
    >
  >(
    "SELECT id, display_name as displayName, status FROM user WHERE gsi_auth = ?;",
    [gsiAuthToken]
  );
  await conn.end();

  if (authRows.length > 0) {
    return authRows[0];
  }
}

export async function resetDotaGsi(userId: number): Promise<void> {
  const conn = await getConn();
  await conn.query(
    'UPDATE user SET gsi_auth="", gsi_connected=FALSE WHERE id=?;',
    [userId]
  );
  await conn.end();
}

export async function getUserByFrameApiKey(
  key: string
): Promise<{ id: number; displayName: string } | void> {
  const conn = await getConn();
  const [authRows] = await conn.query<
    Array<RowDataPacket & { id: number; displayName: string }>
  >(
    "SELECT id, display_name as displayName FROM user WHERE frame_api_key = ?;",
    [key]
  );
  await conn.end();

  if (authRows.length > 0) {
    return authRows[0];
  }
}

export async function saveDotaGame(
  userId: number,
  win: boolean
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "INSERT INTO dota_games (id, user_id, finished, won) VALUES (NULL, ?, NOW(), ?);",
    [userId, win]
  );
  await conn.end();
}

interface StatsRow extends RowDataPacket {
  date: number;
  won: boolean;
}

export async function getOnlineSince(userId: number): Promise<number | null> {
  const conn = await getConn();
  const [streamStateRows] = await conn.execute<
    Array<{ date: number | null } & RowDataPacket>
  >(
    "SELECT UNIX_TIMESTAMP(uss.created) as date FROM user_stream_state uss INNER JOIN user u ON u.twitch_id = uss.twitch_id WHERE u.id = ?",
    [userId]
  );
  await conn.end();

  return streamStateRows.length > 0 ? streamStateRows[0].date : null;
}

export async function loadStats(
  userId: number,
  statsFrom?: User["dotaStatsFrom"]
): Promise<StatsRow[]> {
  const conn = await getConn();
  let from = statsFrom;
  if (!from) {
    const { dotaStatsFrom } = (await loadUserById(userId))!;
    from = dotaStatsFrom;
  }

  const startOfDay = dayjs().startOf("day").unix();
  let startTs = statsFrom !== "manual" ? startOfDay : 0;

  if (statsFrom === "session") {
    const onlineSince = await getOnlineSince(userId);
    if (onlineSince) {
      startTs = onlineSince;
    } else {
      startTs = dayjs().unix();
    }
  }

  if (statsFrom !== "manual") {
    await clearUserStats(userId, Math.min(startOfDay, startTs));
  }

  const [rows] = await conn.execute<StatsRow[]>(
    "SELECT UNIX_TIMESTAMP(finished) as date, won FROM dota_games WHERE UNIX_TIMESTAMP(finished) >= ? AND user_id = ?;",
    [startTs, userId]
  );
  await conn.end();
  return rows;
}

export async function clearUserStats(
  userId: number,
  ts: number
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "DELETE FROM dota_games WHERE UNIX_TIMESTAMP(finished) < ? AND user_id = ?",
    [ts, userId]
  );
  await conn.end();
}

export async function removeDotaGames(
  userId: number,
  ts: number
): Promise<void> {
  const conn = await getConn();
  await conn.execute(
    "DELETE FROM dota_games WHERE UNIX_TIMESTAMP(finished) = ? AND user_id = ?",
    [ts, userId]
  );
  await conn.end();
}

export async function getDeaultChannels(): Promise<string[]> {
  const conn = await getConn();
  const [channelRows] = await conn.execute<
    Array<{ name: string } & RowDataPacket>
  >('SELECT display_name as name FROM user WHERE custom_channel_bot_name = ""');
  await conn.end();

  return channelRows.map(({ name }) => name);
}

export async function getCustomBots(): Promise<
  Array<{ channel: string; name: string; password: string }>
> {
  const conn = await getConn();
  const [channelRows] = await conn.execute<
    Array<{ channel: string; name: string; password: string } & RowDataPacket>
  >(
    'SELECT display_name as channel, custom_channel_bot_name as name, custom_channel_bot_token as password FROM user WHERE custom_channel_bot_name != "" AND custom_channel_bot_token != ""'
  );
  await conn.end();

  return channelRows;
}

interface BotData {
  useBot: boolean;
  customBotName: string;
  customBotToken: string;
  commandTrigger: string;
}
export async function loadBotData(userId: number): Promise<BotData> {
  const conn = await getConn();
  const [cfgRow] = await conn.execute<Array<BotData & RowDataPacket>>(
    "SELECT custom_channel_bot_name as customBotName, custom_channel_bot_token as customBotToken FROM user WHERE id = ?",
    [userId]
  );
  await conn.end();

  return cfgRow.length > 0
    ? cfgRow[0]
    : {
        useBot: false,
        customBotName: "",
        customBotToken: "",
        commandTrigger: "!",
      };
}

export async function patchBotData(
  userId: number,
  data: Partial<BotData>,
  channelName: string
): Promise<void> {
  const conn = await getConn();

  if (data.customBotName) {
    await conn.execute(
      "UPDATE user SET custom_channel_bot_name = ? WHERE id = ?",
      [data.customBotName, userId]
    );
  }

  if (data.customBotToken) {
    await conn.execute(
      "UPDATE user SET custom_channel_bot_token = ? WHERE id = ?",
      [data.customBotToken, userId]
    );
  }

  await conn.end();
}

export async function getUserByTrustedChannel(
  channel: string
): Promise<{ id: number }> {
  const conn = await getConn();
  const [rows] = await conn.execute<Array<{ id: number } & RowDataPacket>>(
    "SELECT id FROM user WHERE LOWER(display_name) = ?",
    [channel.substr(1)]
  );
  await conn.end();
  return rows[0];
}
/*
function replaceTrustedPlaceholder(msg: string, uptime: number | null): string {
    let fullMsg = msg;

    if(uptime) {
        const min = uptime % 60;
        const hrs = Math.floor(uptime / 60);
        const h = hrs > 0 ? (hrs === 1 ? '1 Stunde' : `${hrs} Stunden`) : '';
        const m = min > 0 ? (min === 1 ? '1 Minute' : `${min} Minuten`) : '';
        
        const uptimeStr = (h.length > 0 && m.length > 0) ? `${h} und ${m}` : (h.length > 0 ? h : m);

        fullMsg = fullMsg.replace(/\{UPTIME\}/g, uptimeStr);
    } else {
        fullMsg = fullMsg.replace(/\{UPTIME\}/g, '0 Minuten');
    }

    return fullMsg;
}
*/

export async function getChannelCommands(
  channel: string,
  types: Set<Command["type"]>
): Promise<Command[]> {
  const conn = await getConn();
  const user = await getUserByTrustedChannel(channel);
  const commands = await getUserCommands(user.id);
  await conn.end();

  return commands.filter(({ type }) => types.has(type));
}

export async function patchUser(
  userId: number,
  data: Partial<User>
): Promise<void> {
  const conn = await getConn();

  if (data.dotaStatsFrom) {
    await conn.execute("UPDATE user SET dota_stats_from=? WHERE id=?", [
      data.dotaStatsFrom,
      userId,
    ]);
  }

  if (data.hasOwnProperty("useBets")) {
    await conn.execute("UPDATE user SET use_bets=? WHERE id=?", [
      data.useBets,
      userId,
    ]);
  }

  if (data.hasOwnProperty("gsiActive")) {
    await conn.execute("UPDATE user SET gsi_active=? WHERE id=?", [
      data.gsiActive,
      userId,
    ]);
  }

  if (data.hasOwnProperty("betSeasonId")) {
    await conn.execute("UPDATE user SET bet_season_id=? WHERE id=?", [
      data.betSeasonId,
      userId,
    ]);
    clearChannelUserChannel(userId);
  }

  if (data.hasOwnProperty("dotaStatsPickHidden")) {
    await conn.execute("UPDATE user SET dota_stats_pick_hidden=? WHERE id=?", [
      data.dotaStatsPickHidden,
      userId,
    ]);
  }

  if (data.hasOwnProperty("dotaStatsMenuHidden")) {
    await conn.execute("UPDATE user SET dota_stats_menu_hidden=? WHERE id=?", [
      data.dotaStatsMenuHidden,
      userId,
    ]);
  }

  if (data.hasOwnProperty("useAutomaticVoting")) {
    await conn.execute("UPDATE user SET use_automatic_voting=? WHERE id=?", [
      data.useAutomaticVoting,
      userId,
    ]);
  }

  if (data.hasOwnProperty("useKeywordListener")) {
    await conn.execute("UPDATE user SET use_keyword_listener=? WHERE id=?", [
      data.useKeywordListener,
      userId,
    ]);
    await resetKeywordListener(userId);
  }

  if (data.hasOwnProperty("keywordListener")) {
    await conn.execute("UPDATE user SET keyword_listening=? WHERE id=?", [
      data.keywordListener,
      userId,
    ]);
    await resetKeywordListener(userId);
  }

  if (data.hasOwnProperty("streamDelay")) {
    await conn.execute("UPDATE user SET stream_delay=? WHERE id=?", [
      data.streamDelay,
      userId,
    ]);
    clearChannelUserChannel(userId);
    const user = await loadUserById(userId);
    await clearBettingCommandsCache("#" + user?.displayName.toLowerCase());
    sendMessage(userId, "overlay", true);
    clearChannelUserChannel(userId);
  }

  if (data.hasOwnProperty("teamAName")) {
    await conn.execute("UPDATE user SET team_a_name=? WHERE id=?", [
      data.teamAName,
      userId,
    ]);
    const user = await loadUserById(userId);
    await clearBettingCommandsCache("#" + user?.displayName.toLowerCase());
    sendMessage(userId, "overlay", true);
    clearChannelUserChannel(userId);
  }

  if (data.hasOwnProperty("teamBName")) {
    await conn.execute("UPDATE user SET team_b_name=? WHERE id=?", [
      data.teamBName,
      userId,
    ]);
    const user = await loadUserById(userId);
    await clearBettingCommandsCache("#" + user?.displayName.toLowerCase());
    sendMessage(userId, "overlay", true);
    clearChannelUserChannel(userId);
  }

  if (data.hasOwnProperty("individualOverlayVoteDistribution")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_vote_distribution=? WHERE id=?",
      [data.individualOverlayVoteDistribution, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayVoteToplist")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_vote_toplist=? WHERE id=?",
      [data.individualOverlayVoteToplist, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayVoteTimer")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_vote_timer=? WHERE id=?",
      [data.individualOverlayVoteTimer, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayWLStats")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_wl_stats=? WHERE id=?",
      [data.individualOverlayWLStats, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayMinimap")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_minimap=? WHERE id=?",
      [data.individualOverlayMinimap, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayDraftStats")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_draft_stats=? WHERE id=?",
      [data.individualOverlayDraftStats, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayVoteHeroStats")) {
    await conn.execute(
      "UPDATE user SET individual_overlay_hero_stats=? WHERE id=?",
      [data.individualOverlayVoteHeroStats, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("individualOverlayRoshTimer")) {
    await conn.execute(
      "UPDATE user SET individual_rosh_timer_overlay=? WHERE id=?",
      [data.individualOverlayRoshTimer, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useDotaStatsOverlay")) {
    await conn.execute("UPDATE user SET use_dota_stats_overlay=? WHERE id=?", [
      data.useDotaStatsOverlay,
      userId,
    ]);
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useMinimapOverlay")) {
    await conn.execute("UPDATE user SET use_minimap_overlay=? WHERE id=?", [
      data.useMinimapOverlay,
      userId,
    ]);
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useRoshanTimerOverlay")) {
    await conn.execute(
      "UPDATE user SET use_roshan_timer_overlay=? WHERE id=?",
      [data.useRoshanTimerOverlay, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useDraftStatsOverlay")) {
    await conn.execute("UPDATE user SET use_draft_stats_overlay=? WHERE id=?", [
      data.useDraftStatsOverlay,
      userId,
    ]);
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useHeroStatsOverlay")) {
    await conn.execute("UPDATE user SET use_hero_stats_overlay=? WHERE id=?", [
      data.useHeroStatsOverlay,
      userId,
    ]);
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useVoteToplistOverlay")) {
    await conn.execute(
      "UPDATE user SET use_vote_toplist_overlay=? WHERE id=?",
      [data.useVoteToplistOverlay, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useVoteTimerOverlay")) {
    await conn.execute("UPDATE user SET use_vote_timer_overlay=? WHERE id=?", [
      data.useVoteTimerOverlay,
      userId,
    ]);
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useVoteDistributionOverlay")) {
    await conn.execute(
      "UPDATE user SET use_vote_distribution_overlay=? WHERE id=?",
      [data.useVoteDistributionOverlay, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("useKeywordListenerOverlay")) {
    await conn.execute(
      "UPDATE user SET use_keyword_listener_overlay=? WHERE id=?",
      [data.useKeywordListenerOverlay, userId]
    );
    sendMessage(userId, "overlay", true);
  }

  if (data.hasOwnProperty("usePredictions")) {
    await conn.execute("UPDATE user SET use_predictions=? WHERE id=?", [
      data.usePredictions,
      userId,
    ]);
  }

  if (data.hasOwnProperty("predictionDuration")) {
    await conn.execute("UPDATE user SET prediction_duration=? WHERE id=?", [
      data.predictionDuration,
      userId,
    ]);
  }

  if (data.hasOwnProperty("predictionPlayingTitle")) {
    await conn.execute(
      "UPDATE user SET prediction_playing_title=? WHERE id=?",
      [data.predictionPlayingTitle, userId]
    );
  }

  if (data.hasOwnProperty("predictionPlayingOptionA")) {
    await conn.execute(
      "UPDATE user SET prediction_playing_option_a=? WHERE id=?",
      [data.predictionPlayingOptionA, userId]
    );
  }

  if (data.hasOwnProperty("predictionPlayingOptionB")) {
    await conn.execute(
      "UPDATE user SET prediction_playing_option_b=? WHERE id=?",
      [data.predictionPlayingOptionB, userId]
    );
  }

  if (data.hasOwnProperty("predictionObservingTitle")) {
    await conn.execute(
      "UPDATE user SET prediction_observing_title=? WHERE id=?",
      [data.predictionObservingTitle, userId]
    );
  }

  if (data.hasOwnProperty("predictionObservingOptionA")) {
    await conn.execute(
      "UPDATE user SET prediction_observing_option_a=? WHERE id=?",
      [data.predictionObservingOptionA, userId]
    );
  }

  if (data.hasOwnProperty("predictionObservingOptionB")) {
    await conn.execute(
      "UPDATE user SET prediction_observing_option_b=? WHERE id=?",
      [data.predictionObservingOptionB, userId]
    );
  }

  await conn.end();
}

export async function userConnected(userId: number): Promise<void> {
  const conn = await getConn();
  await conn.execute("UPDATE user SET gsi_connected=TRUE WHERE id=?", [userId]);
  await conn.end();
}

export async function removeUser(userId: number): Promise<void> {
  const user = await loadUserById(userId);
  const conn = await getConn();
  await conn.execute("DELETE from user_stream_state WHERE twitch_id = ?", [
    user?.twitchId,
  ]);
  await conn.execute("DELETE from caster_overlays WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from anti_snipe_overlay WHERE user_id = ?", [
    userId,
  ]);
  await conn.execute("DELETE from dota_overlays WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from rosh_overlays WHERE user_id = ?", [userId]);
  await conn.execute(
    "DELETE from bets WHERE bet_round_id IN (SELECT id FROM bet_rounds WHERE user_id = ?)",
    [userId]
  );
  await conn.execute("DELETE from watchers WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from bet_season_users WHERE user_id = ?", [
    userId,
  ]);
  await conn.execute("DELETE from bet_rounds WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from dota_games WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from bot_commands WHERE user_id = ?", [userId]);
  await conn.execute("DELETE from bet_overlays WHERE user_id = ?", [userId]);
  await conn.execute(
    "DELETE from words WHERE word_group_id IN (SELECT id from word_groups WHERE user_id = ?)",
    [userId]
  );
  await conn.execute("DELETE from word_groups WHERE user_id = ?", [userId]);
  await conn.execute(
    "DELETE from twitch_user_scopes_access WHERE user_id = ?",
    [userId]
  );
  await conn.execute("DELETE from user WHERE id = ?", [userId]);
  await conn.end();

  await partChannel("#" + user?.displayName.toLowerCase());
}
