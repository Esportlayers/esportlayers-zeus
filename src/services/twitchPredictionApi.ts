import {
  createTwitchPrediction,
  deleteTwitchPrediction,
  getTwitchPrediction,
} from "./entity/TwitchPredictions";
import { get, set } from "../loader/redis";
import needle, { NeedleHttpVerbs, NeedleOptions } from "needle";

import { User } from "@streamdota/shared-types";
import config from "../config";
import { updateTwitchUserOAuthScope } from "./entity/TwitchOAuthScopes";

const BASE_URL = "https://api.twitch.tv/helix";

export class NetworkError extends Error {
  code: number | null = null;

  constructor(code: number, ...params: any[]) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }

    this.code = code;
  }
}

export async function request<T extends object>(
  method: NeedleHttpVerbs,
  path: string,
  data: Record<string, unknown>,
  accessToken: string,
  init: NeedleOptions = {}
): Promise<T> {
  const options = ({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Client-Id": config.twitch.clientId,
      ...init,
    },
  } as unknown) as NeedleOptions;

  try {
    const response = await needle(method, `${BASE_URL}${path}`, data, options);

    if (
      response?.statusCode &&
      response.statusCode >= 200 &&
      response.statusCode < 400
    ) {
      return response.body as T;
    } else {
      throw new NetworkError(
        response?.statusCode || 500,
        response.statusMessage
      );
    }
  } catch (error) {
    if (error?.code === 401) {
      throw new NetworkError(401, "Unauthorized");
    } else if (error?.code === 400) {
      throw new NetworkError(400, "Bad Request");
    }
    throw error;
  }
}

interface TwitchPredictionResponse {
  data: Array<{
    id: string;
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
    title: string;
    winning_outcome_id: null | string;
    outcomes: Array<{
      id: string;
      title: string;
      users: number;
      channel_points: number;
      color: "BLUE" | "PINK";
    }>;
    prediction_window: number;
    status: "ACTIVE" | "RESOLVED" | "CANCELED" | "LOCKED";
    created_at: string;
    ended_at: string | null;
    locked_at: string | null;
  }>;
}

const channelPredictionKey = (twitchId: number) =>
  `user_${twitchId}_twitch_prediction_id`;

export async function createPrediction(
  user: User,
  accessToken: string,
  refreshToken: string,
  title: string = "Will I win?",
  outcomeA: string = "Yes",
  outcomeB: string = "No",
  timeWindow: number = 90,
  retry = false
): Promise<void> {
  const postData = {
    title,
    broadcaster_id: user.twitchId,
    outcomes: [{ title: outcomeA }, { title: outcomeB }],
    prediction_window: timeWindow,
  };

  try {
    const { data } = await request<TwitchPredictionResponse>(
      "post",
      "/predictions",
      postData,
      accessToken
    );

    await createTwitchPrediction(
      data[0].id,
      data[0].outcomes[0].id,
      data[0].outcomes[1].id
    );

    await set(channelPredictionKey(user.twitchId), data[0].id);
  } catch (error) {
    if (error instanceof NetworkError || error?.code) {
      if (error.code === 401 && !retry) {
        const { access_token, refresh_token } = await updateAccessToken(
          user,
          refreshToken
        );
        await createPrediction(
          user,
          access_token,
          refresh_token,
          title,
          outcomeA,
          outcomeB,
          timeWindow,
          true
        );
        return;
      } else if (error.code === 400) {
        //Prediction already active
        return;
      }
    }
    throw error;
  }
}

export async function resolvePrediction(
  user: User,
  accessToken: string,
  refreshToken: string,
  winnerA: boolean,
  retry: boolean = false
): Promise<void> {
  const id = await get(channelPredictionKey(user.twitchId));
  if (!id) {
    return;
  }
  const { outcomeA, outcomeB } = (await getTwitchPrediction(id)) || {};
  if (!outcomeA && !outcomeB) {
    return;
  }

  const patchData = {
    id,
    broadcaster_id: user.twitchId,
    status: "RESOLVED",
    winning_outcome_id: winnerA ? outcomeA : outcomeB,
  };

  try {
    await request<TwitchPredictionResponse>(
      "patch",
      "/predictions",
      patchData,
      accessToken
    );

    await deleteTwitchPrediction(id);
    await set(channelPredictionKey(user.twitchId), undefined);
  } catch (error) {
    if (error instanceof NetworkError || error?.code) {
      if (error.code === 401 && !retry) {
        const { access_token, refresh_token } = await updateAccessToken(
          user,
          refreshToken
        );
        await resolvePrediction(
          user,
          access_token,
          refresh_token,
          winnerA,
          true
        );
        return;
      } else if (error.code === 400) {
        //Remove prediction, bad request means its unknown
        await deleteTwitchPrediction(id);
        await set(channelPredictionKey(user.twitchId), undefined);
        return;
      }
    }
    throw error;
  }
}

export async function updateAccessToken(
  user: User,
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await needle(
    "post",
    `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${config.twitch.clientId}&client_secret=${config.twitch.clientSecret}`,
    null
  );

  if (
    response.statusCode &&
    response.statusCode >= 200 &&
    response.statusCode < 400
  ) {
    await updateTwitchUserOAuthScope(
      user.id,
      "predictions",
      response.body.access_token,
      response.body.refresh_token
    );
    return {
      access_token: response.body.access_token,
      refresh_token: response.body.refresh_token,
    };
  } else {
    throw new NetworkError(
      response.statusCode || 500,
      "Error obtain new access_token " + response.statusMessage
    );
  }
}
