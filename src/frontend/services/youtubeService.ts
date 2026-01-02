import { NaviSong } from '../../../types';
import { getYoutubeConfig } from '../repository/youtube';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_MUSIC_BASE_URL = 'https://music.youtube.com/watch?v=';

class YoutubeService {
  private async getApiKey(): Promise<string | null> {
    try {
      const config = await getYoutubeConfig();
      if (!config.apiKey) {
        console.warn('Chave da API do YouTube não configurada.');
        return null;
      }
      return config.apiKey;
    } catch (e) {
      console.warn('Erro ao obter chave da API do YouTube.', e);
      return null;
    }
  }

  public async searchTracks(query: string, limit: number = 25): Promise<{ items: NaviSong[]; total: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return { items: [], total: 0 };
    }

    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { items: [], total: 0 };
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: trimmed,
      maxResults: String(Math.min(limit, 50)),
      videoCategoryId: '10', // música
    });

    try {
      const res = await fetch(`${YOUTUBE_API_BASE}/search?${params.toString()}&key=${encodeURIComponent(apiKey)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('YouTube Music search failed', err);
        return { items: [], total: 0 };
      }

      const json: any = await res.json();
      const items: any[] = json.items || [];

      const mapped: NaviSong[] = items.map((item: any) => {
        const videoId = item.id?.videoId || item.id;
        const snippet = item.snippet || {};
        const thumbs = snippet.thumbnails || {};
        const thumbUrl = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url;

        const song: NaviSong = {
          id: String(videoId),
          title: snippet.title || '',
          artist: snippet.channelTitle || '',
          album: '',
          coverArt: thumbUrl,
          contentType: 'audio/youtube',
          path: videoId ? `${YOUTUBE_MUSIC_BASE_URL}${videoId}` : undefined,
          type: 'music',
          isVideo: true,
        };
        return song;
      });

      const total = typeof json.pageInfo?.totalResults === 'number'
        ? json.pageInfo.totalResults
        : mapped.length;

      return { items: mapped, total };
    } catch (e) {
      console.error('Erro ao buscar no YouTube Music', e);
      return { items: [], total: 0 };
    }
  }
}

export const youtubeService = new YoutubeService();
