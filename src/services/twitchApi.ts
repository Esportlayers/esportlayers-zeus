import api from 'twitch-api-v5';
import config from '../config';
import fetch from 'node-fetch';

api.clientID = config.twitch.clientId;


interface ChannelStream {
    _id: number;
    game: string;
    broadcast_platform: 'live' | 'playlist';
    community_id: string;
    community_ids: string[];
    viewers: number;
    video_height: number;
    average_fps: number;
    delay: number;
    created_at: string;
    is_playlist: boolean;
    stream_type: 'live' | 'playlist';
    preview: {
        small: string;
        medium: string;
        large: string;
        template: string;
    },
    channel: {
        mature: boolean;
        status: string;
        broadcaster_language: string;
        broadcaster_software: string;
        display_name: string;
        game: string;
        language: string;
        _id: number;
        name: string;
        created_at: string;
        updated_at: string;
        partner: boolean;
        logo: string;
        video_banner: string;
        profile_banner: string;
        profile_banner_background_color: string;
        url: string;
        views: number;
        followers: number;
        broadcaster_type: string;
        description: string;
        private_video: boolean;
        privacy_options_enabled: boolean;
    }
}

export interface Stream {
    stream: ChannelStream | null;
}

export async function fetchUserStream(channelID: string): Promise<Stream> {
    return new Promise((resolve, reject) => {
        api.streams.channel({channelID}, (err, response) => {
            if(err) {
                reject(err);
            }
            resolve(response);
        });
    });
}

export async function fetchChatterCount(channel: string): Promise<number> {
    const data = await fetch(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
    const {chatter_count} = await data.json();

    return chatter_count ?? 0;
}