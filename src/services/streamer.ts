import { fetchStreamerByNames, fetchUserStream } from "./twitchApi";
import { getObj, setObj } from "../loader/redis";

import dayjs from "dayjs";

interface Streamer {
  id: string;
  name: string;
  online: boolean;
  preview: string | null;
}

let lastUpdate: { [x: number]: null | number } = {};
const key = (len: number): string => "eslm_s3_twitch_streamer_data_" + len;

export default async function getOnlineStatus(
  streamer: string[]
): Promise<Streamer[]> {
  let data: Streamer[] = [];
  if (
    !lastUpdate[streamer.length] ||
    lastUpdate[streamer.length]! + 300 < dayjs().unix()
  ) {
    const streamers = await fetchStreamerByNames(streamer);

    for (const streamer of streamers) {
      const streamData = await fetchUserStream(streamer._id);
      data.push({
        id: streamer._id,
        name: streamer.display_name,
        online: !!streamData.stream,
        preview: !!streamData.stream ? streamData.stream.preview.medium : null,
      });
    }
    await setObj(key(streamer.length), data);
    lastUpdate[streamer.length] = dayjs().unix();
  } else {
    data = (await getObj<Streamer[]>(key(streamer.length))) || [];
  }

  return data;
}
