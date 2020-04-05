import {v5} from 'uuid';
import fs from 'fs';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { UploadedFile } from 'express-fileupload';
import imagemagick from 'imagemagick';

type FileTypes = 'userAvatar' | 'streamPreview';

function buildPathWithType(type: FileTypes, identifier: string, name: string): string {
    return `${buildPath(type, identifier)}${getFileType(name)}`;
}
function buildPath(type: FileTypes, identifier: string): string {
    const bonusHash = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10); ;
    const imgHash = v5(identifier + bonusHash, v5.URL);
    return `/static/${type}/${imgHash}`;
}

function getFileType(name: string): string {
    return name.substring(name.lastIndexOf('.'));
}

export async function streamFile(type: FileTypes = 'userAvatar', url: string, identifier: string, ): Promise<[string, string, string]> {
    const relativePath = buildPathWithType(type, identifier, url);
    const path = __dirname + `/../..${relativePath}`;
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', (err: string) => reject(err));
        fileStream.on('finish', () => resolve());
    });

    const image = sharp(path);
    const fileHash = relativePath.substring(0, relativePath.lastIndexOf('.'));
    if(!relativePath.endsWith('.webp')) {
        await image.webp().toFile(__dirname + '/../..' + fileHash + '.webp');
    }
    if(!relativePath.endsWith('.jp2')) {
        await new Promise((resolve) => {
            imagemagick.convert([path, '-quality', '0', __dirname + '/../..' + fileHash + '.jp2'], () => resolve());
        });
    }

    return [fileHash + getFileType(url), fileHash + '.webp', fileHash + '.jp2'];
}

interface Dimensions {
    width?: number;
    height?: number;
}

export async function saveFormFile(type: FileTypes, identifier: string, file: UploadedFile, dimenstions: Dimensions = { width: 512, height: 288 }, transparency = false): Promise<[string, string, string]> {
    const webPPath = buildPath(type, identifier) + '.webp';
    const jp2Path = buildPath(type, identifier) + '.jp2';
    const jpegPath = buildPath(type, identifier) + (transparency ? '.png' : '.jpeg');

    await sharp(file.data)
            .webp()
            .resize(dimenstions)
            .toFile(__dirname + `/../..${webPPath}`);

    if(transparency) {
        await sharp(file.data)
                .png()
                .resize(dimenstions)
                .toFile(__dirname + `/../..${jpegPath}`);
    } else {
        await sharp(file.data)
                .jpeg()
                .resize(dimenstions)
                .toFile(__dirname + `/../..${jpegPath}`);
    }


    await new Promise((resolve) => {
        imagemagick.convert([__dirname + `/../..${jpegPath}`, '-quality', '0', __dirname + `/../..${jp2Path}`], () => resolve());
    });

    return [jpegPath, webPPath, jp2Path];
}

export async function removeFile(path: string): Promise<void> {
    fs.unlinkSync(__dirname + `/../..${path}`);
}
