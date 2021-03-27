import { getChannels, publish } from "../services/twitchChat";
import { getUserByTrustedChannel, loadUserById } from "../services/entity/User";

import dayjs from "dayjs";
import { getUserTimer } from "../services/entity/Timer";

interface Timer {
  message: string;
  period: number;
  lastPublish: number;
}

const channelTimer = new Map<string, Timer[]>();

async function checkTimerUpdates(): Promise<void> {
  const channelsToCheck = getChannels();
  const currentTS = dayjs().unix();

  for (const channel of channelsToCheck) {
    if (!channelTimer.has(channel)) {
      const { id } = (await getUserByTrustedChannel(channel)) || { id: null };
      if (id) {
        const rawTimer = await getUserTimer(id);
        const timer: Timer[] = rawTimer
          .filter(({ active }) => active)
          .map(({ message, period }) => {
            const min = 0.6 * period;
            return {
              period,
              message,
              lastPublish:
                currentTS + Math.floor(min + Math.random() * (period - min)),
            };
          });

        channelTimer.set(channel, timer);
      }
    }

    const timers = channelTimer.get(channel) || [];
    for (const timer of timers) {
      if (timer.lastPublish <= currentTS) {
        timer.lastPublish = currentTS + timer.period;
        publish(channel, timer.message);
        break;
      }
    }
  }
}

if (process.env.NODE_ENV !== "test") {
  setInterval(checkTimerUpdates, 20000);
}

export async function clearChannelCache(userId: number): Promise<void> {
  const { displayName } = (await loadUserById(userId))!;
  const fullChannel = "#" + displayName.toLowerCase();
  if (channelTimer.has(fullChannel)) {
    channelTimer.delete(fullChannel);
  }
}
