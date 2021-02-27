import { createWordMessage, getUserWordGroups } from "./entity/ChatKeyWords";
import { getObj, setObj } from "../loader/redis";

import { Word } from "@streamdota/shared-types";
import { fetchChatterCount } from "./twitchApi";
import { fetchSentimentScore } from "./naixApi";
import { getUserByTrustedChannel } from "./entity/User";

const getKeywordListKey = (id: number) => `user_${id}_word_listening_list`;
const getWordByName = (name: string, id: number) => `user_${id}_word_${name}`;

async function getUserKeyWords(id: number): Promise<string[]> {
  let keywords = await getObj<string[]>(getKeywordListKey(id));
  if (!keywords) {
    const wordGroups = await getUserWordGroups(id);
    const list: string[] = [];

    for (const group of wordGroups) {
      if (group.active) {
        for (const word of group.words) {
          const lower = word.word.toLowerCase();
          list.push(lower);
          await setObj(getWordByName(lower, id), word);
        }
      }
    }

    await setObj(getKeywordListKey(id), list);
    keywords = list;
  }

  return keywords;
}

async function saveMessageForKeyword(
  keyword: string,
  message: string,
  streamerName: string,
  id: number,
  ignoreAnalyses?: boolean
): Promise<void> {
  const chatters = await fetchChatterCount(streamerName);
  const word = await getObj<Word>(getWordByName(keyword, id));
  if (word) {
    let score = 0,
      magnitude = 0;
    if (!ignoreAnalyses && Boolean(word.useSentimentAnalysis)) {
      const data = await fetchSentimentScore(message);
      score = data.score;
      magnitude = data.magnitude;
    }
    await createWordMessage(word.id, message, chatters, score, magnitude);
  }
}

const ignoredAnalysesUsernames = new Set(["streamelements"]);
export default async function processChatMessage(
  channel: string,
  message: string,
  username: string
): Promise<void> {
  const { id } = await getUserByTrustedChannel(channel);
  const channelKeyWords = await getUserKeyWords(id);
  const messageLower = message.toLowerCase();
  const matches = channelKeyWords.filter(
    (keyword) => messageLower.indexOf(keyword) !== -1
  );
  if (matches.length > 0) {
    for (const match of matches) {
      await saveMessageForKeyword(
        match,
        message,
        channel.substr(1),
        id,
        ignoredAnalysesUsernames.has(username)
      );
    }
  }
}

export async function resetUserStorage(id: number): Promise<void> {
  await setObj(getKeywordListKey(id), null);
}

export async function resetWordStorage(
  id: number,
  name: string
): Promise<void> {
  await setObj(getWordByName(name.toLowerCase(), id), null);
}
