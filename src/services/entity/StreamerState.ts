import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";
import {Streamer} from '@streamdota/shared-types/Entities/Streamer';
import { streamFile, removeFile } from "../staticFileHandler";

interface StreamerIdResponse extends RowDataPacket {
    twitchId: string;
}

export async function getStreamerIds(): Promise<string[]> {
    const conn = await getConn();
    const [rows] = await conn.execute<StreamerIdResponse[]>('SELECT twitch_id FROM user');
    await conn.end();

    return rows.map(({twitch_id}) => twitch_id);
}

type ImageRow = Pick<Streamer, 'preview' | 'previewWEBP' | 'previewJP2'> & RowDataPacket;

export async function updateStreamerStatus(twitchId: string, online: Boolean, title: string, game: string, viewer: number, previewUrl: string, streamDate: number | null = null): Promise<void> {
    const conn = await getConn();
    let orig = '', webp = '', jp2 = '';
    const [rows] = await conn.execute<ImageRow[]>('SELECT preview, preview_webp as previewWEBP, preview_jp2 as previewJP2 FROM user_stream_state WHERE twitch_id = ?;', [twitchId]);
    if(online) {
        [orig, webp, jp2] = await streamFile('streamPreview', previewUrl, twitchId + '');
    }
    if(rows.length > 0) {
        await conn.execute('UPDATE user_stream_state SET online=?,title=?,viewer=?,preview=?,preview_webp=?,preview_jp2=?,game=?,created=FROM_UNIXTIME(?) WHERE twitch_id = ?', [online, title, viewer, orig, webp, jp2, game, streamDate, twitchId]);
    } else {
        await conn.execute(
            'INSERT INTO user_stream_state (twitch_id, online, viewer, title, preview, preview_webp, preview_jp2, game, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?));',
            [twitchId, online, viewer, title, orig, webp, jp2, game, streamDate]
        );
    }
    await conn.end();

    if(rows.length > 0) {
        const streamer = rows[0];
        streamer.preview.length > 0 && removeFile(streamer.preview);
        streamer.previewWEBP.length > 0 && removeFile(streamer.previewWEBP);
        streamer.previewJP2.length > 0 && removeFile(streamer.previewJP2);
    }
}
