import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { execFile } from 'child_process';
import { sanitizeQuery } from '../../services/tools';
import { tidalService } from '../../services/tidalService';
import { TIDAL_QUALITY } from '../../components/tidal/tidalConstants';
import { AudioMetadata, DownloadedCover } from '../types';
import { audioTagger } from '../utils/tagger';


class TidalServerService {
    downloads: Map<string, any>;
    download_dir: string

    constructor() {
        this.downloads = new Map();
        this.download_dir = process.env.TIDAL_DOWNLOAD_PATH || path.resolve(process.cwd(), 'downloads');
        if (!fs.existsSync(this.download_dir)) fs.mkdirSync(this.download_dir, { recursive: true });
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

    /**
     * Lista todos os arquivos já baixados na pasta de downloads
     * lendo os metadados via audioTagger.
     */
    private async getDuration(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            execFile(
                'ffprobe',
                [
                    '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    filePath
                ],
                (err, stdout) => {
                    if (err) return reject(err);

                    const duration = parseFloat(stdout.toString());
                    if (isNaN(duration)) {
                        reject(new Error('Duração inválida'));
                    } else {
                        resolve(Math.round(duration));
                    }
                }
            );
        });
    }

    async getCompletedDownloads() {
        if (!fs.existsSync(this.download_dir)) {
            return { items: [] };
        }

        const entries = await fs.promises.readdir(this.download_dir);
        const supportedExts = new Set(['.mp3', '.flac']);

        const items = await Promise.all(entries
            .filter((name) => supportedExts.has(path.extname(name).toLowerCase()))
            .map(async (name) => {
                const fullPath = path.join(this.download_dir, name);
                try {
                    const meta = await audioTagger.read(fullPath);
                    const baseTitle = path.basename(name, path.extname(name));
                    const duration = await this.getDuration(fullPath);

                    return {
                        id: fullPath,
                        title: meta.title || baseTitle,
                        album: meta.album || '',
                        artist: meta.artists || meta.albumArtist || '',
                        year: meta.year,
                        track: meta.trackNumber,
                        discNumber: meta.discNumber,
                        genre: meta.genre,
                        isrc: meta.isrc,
                        comment: meta.comments,
                        path: fullPath,
                        contentType: 'audio/tidal-local',
                        duration: duration,
                    };
                } catch (e) {
                    console.error('Failed to read metadata for downloaded file', fullPath, e);
                    return null;
                }
            }));

        return { items: items.filter((it) => it !== null) };
    }

    resolveDownloadPath(id: string): string | null {
        let filePath = id;
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(this.download_dir, filePath);
        }

        const normalized = path.normalize(filePath);
        if (!normalized.startsWith(path.normalize(this.download_dir))) {
            return null;
        }

        if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
            return null;
        }

        return normalized;
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
        try {
            const id = `${song.artist} - ${song.title}`;
            const filename = sanitizeQuery(`${song.artist} - ${song.title}`);
            const outDir = this.download_dir;
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const item = {
                id: id,
                title: song.title,
                artist: song.artist,
                progress: 0,
                status: 'queued',
                filename: path.basename(path.join(outDir, filename + '.tmp')),
                error: null,
                trackId,
                creds,
                song,
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

    async retryDownload(id: string) {
        const existing = this.downloads.get(id);
        if (!existing) {
            return { error: 'Download not found' };
        }
        if (!existing.trackId || !existing.creds || !existing.song) {
            return { error: 'Missing data to retry download' };
        }

        const trackId = existing.trackId;
        const creds = existing.creds;
        const song = existing.song;

        const filename = sanitizeQuery(`${song.artist} - ${song.title}`);
        const outDir = this.download_dir;
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        existing.progress = 0;
        existing.status = 'queued';
        existing.error = null;
        existing.filename = path.basename(path.join(outDir, filename + '.tmp'));

        // Start retry download asynchronously using the same logic
        (async () => {
            try {
                existing.status = 'starting';
                const manifest = await tidalService.getTidalPlaybackInfo(creds, trackId, TIDAL_QUALITY);
                const url = manifest.urls[0];
                existing.status = 'downloading';

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
                    if (total) existing.progress = Math.round((downloaded / total) * 100);
                    else existing.progress = Math.min(99, existing.progress + Math.round(chunk.length / 100000));
                }

                fileStream.close();
                existing.progress = 100;
                existing.status = 'completed';
                existing.filename = path.basename(destFinal);
                await this.writeMetadata(destFinal, song);
            } catch (err) {
                existing.status = 'failed';
                existing.error = String(err);
                console.error('Retry download failed', err);
            }
        })();

        return { id };
    }
}

export const tidalServerService = new TidalServerService();
