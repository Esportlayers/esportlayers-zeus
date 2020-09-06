import {green} from 'chalk';
import interval from 'interval-promise';
import { fetchUserStream } from '../services/twitchApi';
import { updateStreamerStatus, getStreamerIds } from '../services/entity/StreamerState';
import config from '../config';

async function fetchWatchingStreamer(): Promise<string[]> {
    return await getStreamerIds();
}

async function updateStreamer(channelID: string): Promise<void> {
    try {
        const streamData = await fetchUserStream(channelID);
        if(streamData.stream) {
            //console.log(grey(`🔴 ${channelID} | ${streamData.stream.channel.name} is live. [🎮${streamData.stream.game} | 👤${streamData.stream.viewers} | 📃${streamData.stream.channel.status}]`));
            const created = (new Date(streamData.stream.created_at)).getTime() / 1000;
            await updateStreamerStatus(channelID, true, streamData.stream.channel.status, streamData.stream.channel.game, streamData.stream.viewers, streamData.stream.preview.medium, created);
        } else {
            //console.log(grey(`💤 ${channelID} is offline`));
            await updateStreamerStatus(channelID, false, '', '', 0, '');
        }
    } catch(err) {
        //console.log(grey(`❌ ${channelID} error updating`));
    }
}

async function startUpdate(): Promise<void> {
    if(config.updateStreamerState) {
        const users = await fetchWatchingStreamer();
        if(users.length > 0) {
            //console.log(grey('- Updating stream state -'));
            for(let channelID of users) {
                await updateStreamer(channelID);
            }
            //console.log(grey('- Finished stream state -'));
        } 
    }
}


if(process.env.NODE_ENV !== 'test') {
    console.log(green('📝 Registered streamer task'));
    
    interval(async () => startUpdate(), 60000);
    
    startUpdate();
}
