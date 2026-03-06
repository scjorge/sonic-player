import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import NodeID3 from 'node-id3';
import { AudioMetadata, DownloadedCover } from '../types';
import { sleep } from '../../commons/tools';


const DJ_STREAM = 'dj-stream';

class AudioTagger {
  public async write(filePath: string, metadata: AudioMetadata): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado -> ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    metadata.comments = metadata.comments || 'DJ()';

    switch (ext) {
      case '.mp3':
        return this.writeMP3(filePath, metadata);
      case '.flac':
        return this.writeFLAC(filePath, metadata);
      default:
        throw new Error(`Formato não suportado: ${ext}`);
    }
  }

  public async read(filePath: string): Promise<AudioMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado -> ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.mp3':
        return this.readMP3(filePath);
      case '.flac':
        return this.readFLAC(filePath);
      default:
        throw new Error(`Formato não suportado: ${ext}`);
    }
  }

  // ======================================================
  // MP3 — ID3v2
  // ======================================================
  private async writeMP3(filePath: string, metadata: AudioMetadata): Promise<void> {
    const current = NodeID3.read(filePath) || {};
    const tags: NodeID3.Tags = { ...current };

    tags.mediaType = DJ_STREAM;
    if (metadata.title) tags.title = metadata.title;
    if (metadata.artists) tags.artist = metadata.artists;
    if (metadata.album) tags.album = metadata.album;
    if (metadata.albumArtist) tags.performerInfo = metadata.albumArtist;
    if (metadata.year) tags.year = metadata.year.toString();
    if (metadata.trackNumber) tags.trackNumber = metadata.trackNumber.toString();
    if (metadata.discNumber) tags.partOfSet = metadata.discNumber.toString();
    if (metadata.genre) tags.genre = metadata.genre;
    if (metadata.label) tags.publisher = metadata.label;
    if (metadata.isrc) tags.ISRC = metadata.isrc;
    if (metadata.comments) {
      tags.comment = {
        language: 'eng',
        text: metadata.comments
      };
    }
    if (metadata.cover) {
      tags.image = {
        mime: metadata.cover.mime,
        type: { id: 3, name: 'front cover' },
        description: 'Cover',
        imageBuffer: metadata.cover.buffer
      };
    }

    const success = NodeID3.write(tags, filePath);
    if (!success) {
      throw new Error(`Falha ao escrever tags MP3 -> ${filePath}`);
    }
  }

  private async readMP3(filePath: string): Promise<AudioMetadata> {
    const tags = NodeID3.read(filePath) || {};
    const metadata: AudioMetadata = {};

    if (tags.title) metadata.title = tags.title;
    if (tags.artist) metadata.artists = tags.artist;
    if (tags.artist) metadata.albumArtist = tags.artist.split(',')[0 || ''];
    if (tags.album) metadata.album = tags.album;
    if (tags.year) metadata.year = parseInt(tags.year, 10);
    if (tags.trackNumber) metadata.trackNumber = parseInt(tags.trackNumber, 10);
    if (tags.partOfSet) metadata.discNumber = parseInt(tags.partOfSet, 10);
    if (tags.genre) metadata.genre = tags.genre;
    if (tags.publisher) metadata.label = tags.publisher;
    if (tags.ISRC) metadata.isrc = tags.ISRC;
    if (tags.comment && typeof tags.comment === 'object' && 'text' in tags.comment) {
      metadata.comments = tags.comment.text;
    }
    if (tags.image && typeof tags.image === 'object' && 'imageBuffer' in tags.image) {
      metadata.cover = {
        mime: tags.image.mime,
        buffer: tags.image.imageBuffer
      };
    }

    return metadata;
  }

  // ======================================================
  // FLAC — Vorbis Comments
  // ======================================================
  private execMetaflac(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('metaflac', args, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  private async writeFLAC(filePath: string, metadata: AudioMetadata): Promise<void> {
    const updateTag = async (key: string, value?: string | number) => {
      try {
        await this.execMetaflac([`--remove-tag=${key}`, filePath]);
        await this.execMetaflac([`--set-tag=${key}=${value}`, filePath]);
        await sleep(100);
      } catch (e) {
        throw new Error(`Falha ao escrever tags FLAC -> ${filePath} | ${e}`);
      }
    };

    const updateCover = async (cover: AudioMetadata['cover']) => {
      try {
        await this.execMetaflac(['--remove', '--block-type=PICTURE,PADDING', '--dont-use-padding', filePath]);
        const coverPath = `${filePath}.cover`;
        fs.writeFileSync(coverPath, cover.buffer);
        await this.execMetaflac([`--import-picture-from=${coverPath}`, filePath]);
        fs.unlinkSync(coverPath);
      } catch (e) {
        throw new Error(`Falha ao escrever capa FLAC -> ${filePath}`);
      }
    }

    await updateTag('MEDIA', DJ_STREAM);
    if (metadata.title) await updateTag('TITLE', metadata.title);
    if (metadata.artists) await updateTag('ARTIST', metadata.artists);
    if (metadata.album) await updateTag('ALBUM', metadata.album);
    if (metadata.albumArtist) await updateTag('ALBUMARTIST', metadata.albumArtist);
    if (metadata.year) await updateTag('DATE', metadata.year);
    if (metadata.trackNumber) await updateTag('TRACKNUMBER', metadata.trackNumber);
    if (metadata.discNumber) await updateTag('DISCNUMBER', metadata.discNumber);
    if (metadata.genre) await updateTag('GENRE', metadata.genre);
    if (metadata.label) await updateTag('LABEL', metadata.label);
    if (metadata.isrc) await updateTag('ISRC', metadata.isrc);
    if (metadata.comments) await updateTag('COMMENT', metadata.comments);
    if (metadata.cover) await updateCover(metadata.cover);
  }

  private async readFLAC(filePath: string): Promise<AudioMetadata> {
    const tags = await this.readFlacTags(filePath);
    const cover = await this.readFlacCover(filePath);

    if (!tags) {
      throw new Error(`Falha ao Ler tags FLAC -> ${filePath}`);
    }

    return {
      title: tags.TITLE,
      artists: tags.ARTIST,
      album: tags.ALBUM,
      albumArtist: tags.ALBUMARTIST,
      year: tags.DATE ? parseInt(tags.DATE) : undefined,
      trackNumber: tags.TRACKNUMBER ? parseInt(tags.TRACKNUMBER) : undefined,
      discNumber: tags.DISCNUMBER ? parseInt(tags.DISCNUMBER) : undefined,
      genre: tags.GENRE,
      label: tags.LABEL,
      isrc: tags.ISRC,
      comments: tags.COMMENT,
      cover
    };
  }

  private async readFlacTags(filePath: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      execFile('metaflac', ['--export-tags-to=-', filePath], (err, stdout) => {
        if (err) return reject(err);

        const tags: Record<string, string> = {};

        stdout
          .toString()
          .split('\n')
          .forEach(line => {
            const idx = line.indexOf('=');
            if (idx === -1) return;

            const key = line.slice(0, idx);
            const value = line.slice(idx + 1);

            if (key && value) {
              tags[key] = value;
            }
          });

        resolve(tags);
      }
      );
    });
  }

  private async readFlacCover(filePath: string): Promise<DownloadedCover | undefined> {
    const tmpCover = `${filePath}.cover`;

    try {
      await this.execMetaflac([`--export-picture-to=${tmpCover}`, filePath]);
      const buffer = fs.readFileSync(tmpCover);
      const mime = buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
      return { buffer, mime };
    } catch {
      return undefined;
    } finally {
      if (fs.existsSync(tmpCover)) {
        fs.unlinkSync(tmpCover);
      }
    }
  }
}

export const audioTagger = new AudioTagger();
