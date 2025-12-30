import { AppDataSource } from '../utils/db';
import { NavidromeSetting } from '../entities/Navidrome';
import { getTrackByComment } from './navidromeDatabase';


export const navidromeSettingsService = {
  async get() {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    const existing = await repo.find();
    return existing[0] || null;
  },

  async save(baseUrl: string, user: string, password: string) {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    let setting = (await repo.find())[0];
    if (!setting) {
      setting = repo.create({ baseUrl, user, password });
    } else {
      setting.baseUrl = baseUrl;
      setting.user = user;
      setting.password = password;
    }
    return repo.save(setting);
  },

  async clear() {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    await repo.clear();
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

  hashCover(row: any) {
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
            const genres = (tags.genre || []).map((g: any) => ({name: g.value}));
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
              coverArt: `mf-${row.id}_${this.hashCover(row)}`,
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

  get(comments: string[], limit: number = 50, offset: number = 0) {
    const rows = getTrackByComment(comments, limit, offset);
    return this.toSubsonicSearchResult(rows);
  }
}