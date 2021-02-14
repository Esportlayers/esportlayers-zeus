import fetch from 'node-fetch';
import config from '../config';

const apiUrl = 'https://naix.streamdota.com/';


export async function fetchSentimentScore(message: string): Promise<{score: number, magnitude: number}> {
    const response = await fetch(
        apiUrl + `?apiKey=${config.naixApiKey}`, 
        {
            method: 'POST',
            body:    JSON.stringify({message}),
            headers: { 'Content-Type': 'application/json' },
        },
    );

    console.log(response.status, response.statusText)
    if(response.ok) {
        return await response.json();
    }

    return {score: 0, magnitude: 0};
}