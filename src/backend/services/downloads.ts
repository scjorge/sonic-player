import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { execFile } from 'child_process';
import { sanitizeQuery } from '../../commons/tools';
import { tidalService } from '../../frontend/services/tidalService';
import { NAVIDROME_BASE_PATH, NAVIDROME_SAVE_FORMAT, TIDAL_QUALITY, TIDAL_DOWNLOAD_PATH } from '../../core/config';
import { AudioMetadata, DownloadedCover } from '../types';
import { audioTagger } from '../utils/tagger';
import { getPathById } from './navidromeDatabase';

import { pipeline } from 'stream/promises';
import util from 'util';

class DownloadService {
  downloads: Map<string, any>;
  download_dir: string

  constructor() {
    this.downloads = new Map();
    this.download_dir = TIDAL_DOWNLOAD_PATH;
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
      coverArt: d.coverArt,
      contentType: d.contentType,
    }));
    return items;
  }

  setdownloadsItems(item: any): void {
    this.downloads.set(item.id, item);
  }

  deleteDownloadItem(id: string): void {
    this.downloads.delete(id);
  }

  clearAllDownloads(): void {
    this.downloads.clear();
  }

  async getdownloads() {
    return { items: this.getdownloadsItems() };
  }

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
            //cover: meta.cover, // TODO
            path: fullPath,
            contentType: 'audio/tidal-local',
            duration: duration,
            suffix: path.extname(name).toLowerCase().slice(1),
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

  async getFullPathNavidrome(id: string): Promise<string> {
    const trackPath = await getPathById(id);

    if (!trackPath) {
      throw new Error('Media file path not found in Navidrome database');
    }

    const fullPath = path.join(NAVIDROME_BASE_PATH, trackPath);
    return fullPath;
  }

  async writeMetadataParts(id: string, destFinal: string, source: "navidrome" | "download", metadata: AudioMetadata) {
    if (source === "navidrome") {
      destFinal = await this.getFullPathNavidrome(id);
    }
    await audioTagger.write(destFinal, metadata);
    return { status: 'updated', metadata: metadata };
  }

  async writeMetadata(destFinal: string, song: any) {
    try {
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
    } catch (e) {
      throw new Error('Failed to write metadata: ' + e.message);
    }
  }

  private buildNavidromeTargetPath(meta: AudioMetadata, sourcePath: string) {
    const ext = (path.extname(sourcePath).toLowerCase().replace('.', '') || 'mp3');

    const genre = meta.genre || 'Unknown';
    const artist = meta.albumArtist || 'Unknown Artist';
    const album = meta.album || 'Unknown Album';
    const trackNumber = meta.trackNumber || 0;
    const year = meta.year || 'Unknown Year';
    const title = meta.title || path.basename(sourcePath, path.extname(sourcePath));
    const trackStr = trackNumber ? String(trackNumber).padStart(2, '0') : '00';

    const safe = (value: string) => sanitizeQuery(value || '').replace(/^\.+$/, '') || 'Unknown';

    let relative = NAVIDROME_SAVE_FORMAT;
    relative = relative.replace(/{genre}/g, safe(genre));
    relative = relative.replace(/{artist}/g, safe(artist));
    relative = relative.replace(/{album}/g, safe(album));
    relative = relative.replace(/{track}/g, safe(trackStr));
    relative = relative.replace(/{title}/g, safe(title));
    relative = relative.replace(/{year}/g, safe(year.toString()));
    relative = relative.replace(/{ext}/g, ext || 'mp3');

    return path.join(NAVIDROME_BASE_PATH, relative);
  }

  async finalizeDownload(filePath: string) {
    try {
      const resolved = this.resolveDownloadPath(filePath);
      if (!resolved) {
        throw new Error('Caminho de download inválido');
      }

      const meta = await audioTagger.read(resolved);
      if (!meta.genre) {
        throw new Error('Gênero é obrigatório para finalizar o download');
      }

      let target = this.buildNavidromeTargetPath(meta, resolved);
      const targetDir = path.dirname(target);
      await fs.promises.mkdir(targetDir, { recursive: true });

      // Evita sobrescrever arquivos existentes
      if (fs.existsSync(target)) {
        const parsed = path.parse(target);
        let counter = 1;
        while (fs.existsSync(target)) {
          target = path.join(parsed.dir, `${parsed.name} (${counter})${parsed.ext}`);
          counter++;
        }
      }

      await fs.promises.rename(resolved, target);

      return {
        status: 'moved',
        from: resolved,
        to: target,
        relativePath: path.relative(NAVIDROME_BASE_PATH, target),
      };
    } catch (error) {
      console.error('Failed to finalize download', error);
    }
  }

  async downloadTrackFromTidal(trackId: string, creds: any, song: any) {
    let item: any;
    let destFinal!: string;

    try {
      const filename = sanitizeQuery(`${song.artist} - ${song.title}`);
      const outDir = this.download_dir;

      // garante que o diretório existe
      await fs.promises.mkdir(outDir, { recursive: true });

      item = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        coverArt: song.coverArt,
        progress: 0,
        status: 'queued',
        filename: `${filename}.tmp`,
        error: null,
        trackId,
        creds,
        song,
        contentType: 'audio/tidal-local',
      };

      this.setdownloadsItems(item);

      item.status = 'starting';

      // 1️⃣ Playback info
      const manifest = await tidalService.getTidalPlaybackInfo(creds, trackId, TIDAL_QUALITY);

      const url = manifest.urls?.[0];
      if (!url) {
        throw new Error('URL de stream não encontrada');
      }

      item.status = 'downloading';

      // 2️⃣ Download
      const resp = await fetch(url);
      if (!resp.ok || !resp.body) {
        throw new Error(`Falha no fetch: ${resp.status}`);
      }

      const total = Number(resp.headers.get('content-length')) || null;

      const ext = path.extname(new URL(url).pathname) || '.bin';

      destFinal = path.join(outDir, filename + ext);

      let downloaded = 0;

      const fileStream = fs.createWriteStream(destFinal);

      // atualiza progresso
      resp.body.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total) {
          item.progress = Math.round((downloaded / total) * 100);
        } else {
          item.progress = Math.min(
            99,
            item.progress + Math.round(chunk.length / 100000)
          );
        }
      });

      // 3️⃣ Pipeline garante flush + close
      await pipeline(resp.body, fileStream);

      // 4️⃣ Validação final
      const stat = await fs.promises.stat(destFinal);
      if (!stat.size) {
        throw new Error('Arquivo final criado mas está vazio');
      }

      item.progress = 100;
      item.status = 'completed';
      item.filename = path.basename(destFinal);

      return {
        id: song.id,
        path: destFinal,
        size: stat.size,
      };
    } catch (err) {
      if (item) {
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : String(err);
      }

      console.error('Download failed:', err);
      return { error: String(err) };
    }
  }
}

export const downloadService = new DownloadService();
