import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import NodeID3 from 'node-id3';
import { AudioMetadata } from '../types';


class AudioTagger {
    public async write(filePath: string, metadata: AudioMetadata): Promise<void> {
        if (!fs.existsSync(filePath)) {
            throw new Error('Arquivo não encontrado');
        }

        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.mp3':
                return this.writeMP3(filePath, metadata);
            case '.flac':
                return this.writeFLAC(filePath, metadata);
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
            throw new Error('Falha ao escrever tags MP3');
        }
    }

    // ======================================================
    // FLAC — Vorbis Comments
    // ======================================================
    private async writeFLAC(filePath: string, metadata: AudioMetadata): Promise<void> {
        const updateTag = async (key: string, value?: string | number) => {
            await this.execMetaflac([`--remove-tag=${key}`, filePath]);
            await this.execMetaflac([`--set-tag=${key}=${value}`, filePath]);
        };

        const updateCover = async (cover: AudioMetadata['cover']) => {
            await this.execMetaflac(['--remove', '--block-type=PICTURE,PADDING', '--dont-use-padding', filePath]);
            const coverPath = `${filePath}.cover`;
            fs.writeFileSync(coverPath, cover.buffer);
            await this.execMetaflac([`--import-picture-from=${coverPath}`, filePath]);
            fs.unlinkSync(coverPath);
        }

        if (metadata.title)       await updateTag('TITLE', metadata.title);
        if (metadata.artists)     await updateTag('ARTIST', metadata.artists);
        if (metadata.album)       await updateTag('ALBUM', metadata.album);
        if (metadata.albumArtist) await updateTag('ALBUMARTIST', metadata.albumArtist);
        if (metadata.year)        await updateTag('DATE', metadata.year);
        if (metadata.trackNumber) await updateTag('TRACKNUMBER', metadata.trackNumber);
        if (metadata.discNumber)  await updateTag('DISCNUMBER', metadata.discNumber);
        if (metadata.genre)       await updateTag('GENRE', metadata.genre);
        if (metadata.label)       await updateTag('LABEL', metadata.label);
        if (metadata.isrc)        await updateTag('ISRC', metadata.isrc);
        if (metadata.comments)    await updateTag('COMMENT', metadata.comments);
        if (metadata.cover)       await updateCover(metadata.cover);
    }

    private  execMetaflac(args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            execFile('metaflac', args, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    }
}

export const audioTagger = new AudioTagger();
