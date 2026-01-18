import { AppDataSource } from '../utils/db';
import { NavidromeSetting } from '../entities/Navidrome';
import { search4, getByIds, getPathById } from './navidromeDatabase';
import { NAVIDROME_MEDIA_PATH } from '../config';
import * as fs from 'fs';
import * as path from 'path';


export const navidromeSettingsService = {
  async get(userId: string) {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    const existing = await repo.findOne({ where: { userId } });
    return existing || null;
  },

  async save(userId: string, baseUrl: string, user: string, password: string) {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    let setting = await repo.findOne({ where: { userId } });

    if (!setting) {
      setting = repo.create({ userId, baseUrl, user, password });
    } else {
      setting.baseUrl = baseUrl;
      setting.user = user;
      setting.password = password;
    }
    return repo.save(setting);
  },

  async clear(userId: string) {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    await repo.delete({ userId });
  },
};


export const navidromeTrackService = {
  safeJson(value: string) {
    try {
      return JSON.parse(value || '{}');
    } catch {
      return {};
    }
  },

  toIsoZ(date: string) {
    return new Date(date).toISOString();
  },

  normalizePath(path: string) {
    return path
      .replace(/^.*?Artists\//, '')
      .replace(/\\/g, '/');
  },

  hashCover() {
    return '693eecc3';
  },


  toSubsonicSearchResult(rows: any[]) {
    return {
      "subsonic-response": {
        status: "ok",
        version: "1.16.1",
        type: "navidrome",
        serverVersion: "0.59.0 (cc3cca60)",
        openSubsonic: true,
        searchResult2: {
          song: rows.map(row => {
            const tags = this.safeJson(row.tags);
            const participants = this.safeJson(row.participants);
            const genres = (tags.genre || []).map((g: any) => ({ name: g.value }));
            return {
              id: row.id,
              parent: row.album_id,
              isDir: false,
              title: row.title,
              album: row.album,
              artist: row.artist,
              track: row.track_number,
              year: row.year || row.release_year,
              genre: genres[0]?.name ?? "",
              coverArt: `mf-${row.id}_${this.hashCover()}`,
              size: row.size,
              contentType: `audio/${row.suffix}`,
              suffix: row.suffix,
              duration: Math.floor(row.duration),
              bitRate: row.bit_rate,
              path: this.normalizePath(row.path),
              discNumber: row.disc_number,
              created: this.toIsoZ(row.birth_time),
              albumId: row.album_id,
              artistId: row.artist_id,
              type: "music",
              isVideo: false,
              bpm: row.bpm,
              comment: row.comment,
              sortName: row.order_title,
              mediaType: "song",
              musicBrainzId: row.mbz_recording_id || "",
              isrc: (tags.isrc || []).map((i: any) => i.value),
              genres,
              replayGain: {
                trackGain: row.rg_track_gain,
                albumGain: row.rg_album_gain,
                trackPeak: row.rg_track_peak,
                albumPeak: row.rg_album_peak
              },
              channelCount: row.channels,
              samplingRate: row.sample_rate,
              bitDepth: row.bit_depth,
              moods: (tags.mood || []).map((m: any) => m.value),
              artists: participants.artist || [],
              displayArtist: row.artist,
              albumArtists: participants.albumartist || [],
              displayAlbumArtist: row.album_artist,
              contributors: [],
              displayComposer: "",
              explicitStatus: row.explicit_status || ""
            };
          })
        }
      }
    };
  },

  get(comments: string[], genreList: string[], artistList: string[], yearList: string[], limit: number = 50, offset: number = 0, musicFolderId: string | number) {
    const rows = search4(comments, genreList, artistList, yearList, limit, offset, musicFolderId);
    return this.toSubsonicSearchResult(rows);
  },

  async copyToUserDirectory(username: string, songIds: string[]) {
    const userDirectory = path.join(NAVIDROME_MEDIA_PATH, username);

    // Create user directory if it doesn't exist
    if (!fs.existsSync(userDirectory)) {
      fs.mkdirSync(userDirectory, { recursive: true });
    }

    let copiedCount = 0;
    const errors: string[] = [];

    // Get song paths from database
    for (const songId of songIds) {
      try {
        const tracks = getByIds([songId]);

        if (tracks.length === 0) {
          errors.push(`Música não encontrada: ${songId}`);
          continue;
        }

        const track = tracks[0];

        const sourcePath = await getPathById(track.id);

        if (!fs.existsSync(sourcePath)) {
          errors.push(`Arquivo não encontrado: ${path.basename(sourcePath)}`);
          continue;
        }

        const fileName = path.basename(sourcePath);
        const destPath = path.join(userDirectory, fileName);

        // Check if file already exists
        if (fs.existsSync(destPath)) {
          console.log(`Arquivo já existe, pulando: ${fileName}`);
          continue;
        }

        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        copiedCount++;
        console.log(`Arquivo copiado: ${fileName}`);
      } catch (err: any) {
        console.error(`Erro ao copiar música ${songId}:`, err);
        errors.push(`Erro ao copiar: ${err.message}`);
      }
    }

    return {
      copied: copiedCount,
      total: songIds.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

}