import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { sanitizeQuery } from '../../services/tools';
import { tidalService } from '../../services/tidalService';
import { TIDAL_QUALITY } from '../../components/tidal/tidalConstants';
import { AudioMetadata, DownloadedCover } from '../types';
import { audioTagger } from '../utils/tagger';


class TidalServerService {
    downloads: Map<string, any>;

    constructor() {
        this.downloads = new Map();
    }

    getdownloadsItems() {
        const items = Array.from(this.downloads.values()).map(d => ({
            id: d.id,
            title: d.title,
            artist: d.artist,
            progress: d.progress,
            status: d.status,
            filename: d.filename,
        }));
        return items;
    }

    setdownloadsItems(item: any) {
        this.downloads.set(item.id, item);
    }

    async getdownloads() {
        return { items: this.getdownloadsItems() };
    }

    async downloadCoverFromUrl(url: string): Promise<DownloadedCover> {
        const sizes = [1280, 750, 640, 320, 160, 80];
        const sizeRegex = /\/\d+x\d+\.(jpg|png)$/i;

        for (const size of sizes) {
            let attemptUrl = url;

            if (sizeRegex.test(url)) {
                attemptUrl = url.replace(sizeRegex, `/${size}x${size}.$1`);
            }

            try {
                const response = await fetch(attemptUrl);
                if (!response.ok) continue; 
                const contentType = response.headers.get('content-type');
                if (!contentType || (!contentType.includes('jpeg') && !contentType.includes('png'))) continue
                const buffer = Buffer.from(await response.arrayBuffer());
                const mime = contentType.includes('png') ? 'image/png' : 'image/jpeg';
                return { buffer, mime };
            } catch {
                continue;
            }
        }

        throw new Error('Não foi possível baixar o cover em nenhum tamanho');
    }


    async writeMetadata(destFinal: string, song: any) {
        const metadata: AudioMetadata = {
            title: song.title,
            artists: song.artist,
            album: song.album,
            albumArtist: song.artist.split(',')[0],
            year: song.year,
            trackNumber: song.track,
            isrc: song.isrc,
            cover: await this.downloadCoverFromUrl(song.coverArt),
        };
        await audioTagger.write(destFinal, metadata);
    }

    async downloadTrack(trackId: string, creds: any, song: any) {
        const DOWNLOAD_DIR = process.env.TIDAL_DOWNLOAD_PATH || path.resolve(process.cwd(), 'downloads');
        if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

        try {
            const id = Math.random().toString(36).slice(2, 10);
            const filename = sanitizeQuery(`${song.artist} - ${song.title}`);
            const outDir = DOWNLOAD_DIR;
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const item = {
                id: id,
                title: song.title,
                artist: song.artist,
                progress: 0,
                status: 'queued',
                filename: path.basename(path.join(outDir, filename + '.tmp')),
                error: null,
            };
            this.setdownloadsItems(item);

            // Start download asynchronously
            (async () => {
                try {
                    item.status = 'starting';
                    const manifest = await tidalService.getTidalPlaybackInfo(creds, trackId, TIDAL_QUALITY);
                    const url = manifest.urls[0];
                    item.status = 'downloading';

                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error('Failed to fetch stream: ' + resp.status);

                    const total = Number(resp.headers.get('content-length')) || null;
                    let downloaded = 0;

                    const destFinal = path.join(outDir, filename + path.extname(new URL(url).pathname) || '.bin');
                    const fileStream = fs.createWriteStream(destFinal);

                    const reader = resp.body;
                    for await (const chunk of reader) {
                        fileStream.write(chunk);
                        downloaded += chunk.length;
                        if (total) item.progress = Math.round((downloaded / total) * 100);
                        else item.progress = Math.min(99, item.progress + Math.round(chunk.length / 100000));
                    }

                    fileStream.close();
                    item.progress = 100;
                    item.status = 'completed';
                    item.filename = path.basename(destFinal);
                    await this.writeMetadata(destFinal, song);
                } catch (err) {
                    item.status = 'failed';
                    item.error = String(err);
                    console.error('Download failed', err);
                }
            })();
            return { id };

        } catch (e) {
            console.error(e);
            return { error: String(e) };
        }
    }
}

export const tidalServerService = new TidalServerService();
