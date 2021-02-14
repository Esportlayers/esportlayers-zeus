import { Word, WordGroup, WordMessage } from "@streamdota/shared-types";
import { RowDataPacket } from "mysql2";
import { getConn } from "../../loader/db";

interface WordGroupWithWords extends WordGroup {
    words: Word[];
}

export async function getUserWordGroups(userId: number): Promise<WordGroupWithWords[]> {
    const conn = await getConn();
    const [wordGroups] = await conn.execute<Array<WordGroup & RowDataPacket>>('SELECT id, active, name FROM word_groups WHERE user_id = ?', [userId]);
    await conn.end();

    const data = [];

    for(const group of wordGroups) {
        const words = await getUserWordsForGroup(group.id);
        data.push({
            ...group,
            words
        });
    }

    return data;
}

export async function createWordGroup(userId: number, name: string): Promise<void> {
    const conn = await getConn();

    await conn.execute(
        'INSERT INTO word_groups (id, user_id, active, name) VALUES (NULL, ?, TRUE, ?)',
        [userId, name]
    );
    await conn.end();
}

export async function updateWordGroup(id: number, data: Partial<Omit<WordGroup, 'id'>>): Promise<void> {
    const conn = await getConn();

    if(data.active) {
        await conn.execute('UPDATE word_groups SET active = ? WHERE id = ?', [data.active, id]);
    }

    if(data.name) {
        await conn.execute('UPDATE word_groups SET name = ? WHERE id = ?', [data.name, id]);
    }

    await conn.end();

}

export async function deleteWordGroup(id: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM word_groups WHERE id = ?', [id]);
    await conn.end();
}

export async function getUserWordsForGroup(wordGroupId: number): Promise<Word[]> {
    const conn = await getConn();
    const [words] = await conn.execute<Array<Word & RowDataPacket>>('SELECT id, word_group_id as wordGroup, word, use_sentiment_analysis as useSentimentAnalysis FROM words WHERE word_group_id = ?', [wordGroupId]);
    await conn.end();
    return words;
}

export async function createWordForGroup(wordGroup: number, name: string): Promise<void> {
    const conn = await getConn();

    await conn.execute(
        'INSERT INTO words (id, word_group_id, word, use_sentiment_analysis) VALUES (NULL, ?, ?, TRUE)',
        [wordGroup, name]
    );
    await conn.end();
}

export async function updateWordForGroup(id: number, data: Partial<Omit<Word, 'id'>>): Promise<void> {
    const conn = await getConn();

    if(data.word) {
        await conn.execute('UPDATE word_groups SET word = ? WHERE id = ?', [data.word, id]);
    }

    if(data.useSentimentAnalysis) {
        await conn.execute('UPDATE use_sentiment_analysis SET name = ? WHERE id = ?', [data.useSentimentAnalysis, id]);
    }

    await conn.end();
}

export async function deleteWordForGroup(id: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM words WHERE id = ?', [id]);
    await conn.end();
}

export async function createWordMessage(word: number, message: string, chatters: number, sentimentScore = 0, sentimentMagnitude = 0): Promise<void> {
    const conn = await getConn();

    await conn.execute(
        'INSERT INTO word_messages (id, word_id, message, chatter, visibility, sentiment_score, sentiment_magnitude) VALUES (NULL, ?, ?, ?, 0, ?, ?)',
        [word, message, chatters, sentimentScore, sentimentMagnitude]
    );
    await conn.end();
}

export async function updateWordMessage(id: number, data: Partial<Pick<WordMessage, 'visibility' | 'sentimentScore' | 'sentimentMagnitude'>>): Promise<void> {
    const conn = await getConn();

    if(data.visibility) {
        await conn.execute('UPDATE word_messages SET visibility = ? WHERE id = ?', [data.visibility, id]);
    }

    if(data.sentimentScore) {
        await conn.execute('UPDATE word_messages SET sentiment_score = ? WHERE id = ?', [data.sentimentScore, id]);
    }

    if(data.sentimentMagnitude) {
        await conn.execute('UPDATE word_messages SET sentiment_magnitude = ? WHERE id = ?', [data.sentimentMagnitude, id]);
    }

    await conn.end();
}

export async function deleteWordMessage(id: number): Promise<void> {
    const conn = await getConn();
    await conn.execute('DELETE FROM word_messages WHERE id = ?', [id]);
    await conn.end();
}