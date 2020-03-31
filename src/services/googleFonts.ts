import fetch from 'node-fetch';
import config from '../config';

interface Font {
    family: string;
    subSets: string[];
}

const url = 'https://www.googleapis.com/webfonts/v1/webfonts?key=' + config.googleFontApiKey;
let fonts: Font[] = [];

export async function getGoogleFonts(): Promise<Font[]> {
    if(fonts.length === 0) {
        const response = await fetch(url);
        const fontFamilies: {items: Array<{family: string; files: {[x: string]: string}}>} = await response.json();
        fonts = fontFamilies.items.map(({family, files}) => ({family, subSets: Object.keys(files)}))
    }
    return fonts;
}