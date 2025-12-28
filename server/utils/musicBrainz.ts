import axios from 'axios';
import { AudioMetadata, DownloadedCover } from '../types.ts';

export class MusicBrainzClient {
  private readonly mbBase = 'https://musicbrainz.org/ws/2';
  private readonly userAgent = 'YourApp/1.0 (your@email.com)';

  constructor() {
    //axios.defaults.headers.common['User-Agent'] = this.userAgent;
  }

  async getMetadataFromISRC(isrc: string): Promise<AudioMetadata | null> {
    const recordingRes = await axios.get(`${this.mbBase}/recording`, {
      params: {
        query: `isrc:${isrc}`,
        fmt: 'json',
        limit: 1
      }
    });

    const recording = recordingRes.data.recordings?.[0];
    if (!recording) return null;


    const title = recording.title;
    const artists = recording['artist-credit']?.map((a: any) => a.name);
    const release = recording.releases?.[0];
    if (!release) {
      return { title, artists, isrc };
    }
    const album = release.title;
    const year = release.date ? parseInt(release.date.substring(0, 4)) : undefined;
    const label = release['label-info']?.[0]?.label?.name;

    let trackNumber: number | undefined;
    let discNumber: number | undefined;

    if (release.media?.length) {
      for (const medium of release.media) {
        const track = medium.tracks?.find(
          (t: any) => t.recording?.id === recording.id
        );
        if (track) {
          trackNumber = parseInt(track.position);
          discNumber = parseInt(medium.position);
          break;
        }
      }
    }

    const albumArtist = release['artist-credit']?.map((a: any) => a.name).join(', ');
    const cover = await this.fetchCover(release.id);

    return {
      title,
      artists,
      album,
      albumArtist,
      year,
      trackNumber,
      discNumber,
      label,
      isrc,
      cover
    };
  }


  private async fetchCover(releaseMBID: string): Promise<DownloadedCover | undefined> {
    try {
      const url = `https://coverartarchive.org/release/${releaseMBID}/front`;

      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        validateStatus: s => s === 200
      });

      const mime = res.headers['content-type'];

      if (mime !== 'image/jpeg' && mime !== 'image/png') {
        return undefined;
      }

      return {
        buffer: Buffer.from(res.data),
        mime
      };
    } catch {
      return undefined;
    }
  }
}

export const musicBrainzClient = new MusicBrainzClient();
