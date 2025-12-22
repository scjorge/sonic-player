import { NaviSong, NaviAlbum, NaviArtist, NaviPlaylist, SubsonicResponse } from '../types';
import { MD5 } from './tools.ts';
import { getNavidromeCredentials } from './data';

const CLIENT = 'SonicTagPlayer';
const VERSION = '1.16.1';


class NavidromeService {
  private getAuthParams() {
    const creds = getNavidromeCredentials();
    const salt = Math.random().toString(36).substring(2);
    const token = MD5((creds.password || '') + salt);
    const user = creds.user || '';
    return `u=${encodeURIComponent(user)}&t=${token}&s=${salt}&v=${VERSION}&c=${CLIENT}&f=json`;
  }

  private sanitizeQuery(text: string): string {
    return (text || '').replace(/[<>:\"/\\|?*-]/g, ' ').replace(/\s+/g, ' ').trim();
  }


  private getUrl(endpoint: string) {
    const creds = getNavidromeCredentials();
    const base = (creds.baseUrl || '').replace(/\/$/, '');
    return `${base}/rest/${endpoint}?${this.getAuthParams()}`;
  }

  // Método auxiliar para realizar fetch via proxy (Backend Execution)
  private async fetchData(endpoint: string, params: string = '') {
    const originalUrl = this.getUrl(endpoint) + params;
    
    // Tenta usar o proxy para evitar problemas de CORS
    try {
        const res = await fetch(originalUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
        return res.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint} via proxy:`, error);
        throw error;
    }
  }

  // URLs de mídia (stream/capa) geralmente funcionam melhor diretamente
  // pois tags <audio> e <img> lidam melhor com cross-origin do que fetch/XHR
  public getStreamUrl(id: string) {
    return this.getUrl('stream') + `&id=${id}`;
  }

  public getCoverArtUrl(id: string) {
    return this.getUrl('getCoverArt') + `&id=${id}&size=300`;
  }

  async ping(): Promise<{ ok: boolean; message?: string }> {
    try {
      const data: SubsonicResponse<any> = await this.fetchData('ping.view');
      const status = data['subsonic-response'].status === 'ok';
      const msg = status ? undefined : (data['subsonic-response'].error?.message || 'Unknown error');
      return { ok: status, message: msg };
    } catch (e: any) {
      console.error("Ping failed:", e);
      // Try to extract message from error response if available
      const message = e?.message || String(e);
      return { ok: false, message };
    }
  }

  async getRandomSongs(size: number = 20): Promise<NaviSong[]> {
    const data = await this.fetchData('getRandomSongs.view', `&size=${size}`);
    const songs = data['subsonic-response'].randomSongs?.song || [];
    return songs;
  }

  async getAlbums(type: 'newest' | 'random' | 'frequent' | 'recent' | 'highest' = 'newest', size: number = 20, offset: number = 0): Promise<NaviAlbum[]> {
    const data = await this.fetchData('getAlbumList.view', `&type=${type}&size=${size}&offset=${offset}`);
    const albums = data['subsonic-response'].albumList?.album || [];
    return albums;
  }
  
  async getAlbum(id: string): Promise<{ songs: NaviSong[] }> {
    const data = await this.fetchData('getAlbum.view', `&id=${id}`);
    const songs = data['subsonic-response'].album?.song || [];
    return { songs };
  }

  async getArtists(): Promise<NaviArtist[]> {
    const data = await this.fetchData('getArtists.view');
    // Subsonic returns artists grouped by index usually
    const indexes = data['subsonic-response'].artists?.index || [];
    let allArtists: NaviArtist[] = [];
    indexes.forEach((idx: any) => {
        if(idx.artist) allArtists = [...allArtists, ...idx.artist];
    });
    return allArtists;
  }

  async getGenres(): Promise<string[]> {
    try {
        const data = await this.fetchData('getGenres.view');
        const genres = data['subsonic-response'].genres?.genre || [];
        // Navidrome returns array of objects {value: "Rock", songCount: 10...} or sometimes just strings depending on version/server
        return genres.map((g: any) => g.value || g.name || g).sort();
    } catch (e) {
        console.error("Failed to get genres", e);
        return [];
    }
  }

  async getPlaylists(): Promise<NaviPlaylist[]> {
      const data = await this.fetchData('getPlaylists.view');
      return data['subsonic-response'].playlists?.playlist || [];
  }

  async getPlaylist(id: string): Promise<NaviSong[]> {
      const data = await this.fetchData('getPlaylist.view', `&id=${id}`);
      return data['subsonic-response'].playlist?.entry || [];
  }

  async createPlaylist(name: string, isPublic: boolean): Promise<boolean> {
      try {
          // 1. Cria a playlist
          const data = await this.fetchData('createPlaylist.view', `&name=${encodeURIComponent(name)}`);
          
          let playlistId = data['subsonic-response'].playlist?.id;
          
          if (!playlistId && data['subsonic-response'].playlists?.playlist) {
             const arr = data['subsonic-response'].playlists.playlist;
             if (Array.isArray(arr) && arr.length > 0) playlistId = arr[0].id;
          }

          if (isPublic && playlistId) {
              await this.fetchData('updatePlaylist.view', `&playlistId=${playlistId}&public=true`);
          }
          
          return true;
      } catch (e) {
          console.error("Failed to create playlist", e);
          return false;
      }
  }

  async deletePlaylist(id: string): Promise<boolean> {
      try {
          const data = await this.fetchData('deletePlaylist.view', `&id=${id}`);
          if (data['subsonic-response'] && data['subsonic-response'].status === 'failed') {
               console.error("Delete playlist failed:", data['subsonic-response'].error);
               return false;
          }
          return true;
      } catch (e) {
          console.error("Failed to delete playlist", e);
          return false;
      }
  }

  async addSongsToPlaylist(playlistId: string, songIds: string[]): Promise<boolean> {
    try {
        // Subsonic updatePlaylist aceita múltiplos parâmetros songIdToAdd
        const params = songIds.map(id => `&songIdToAdd=${id}`).join('');
        await this.fetchData('updatePlaylist.view', `&playlistId=${playlistId}${params}`);
        return true;
    } catch (e) {
        console.error("Failed to add songs to playlist", e);
        return false;
    }
  }

  async removeSongsFromPlaylist(playlistId: string, songIds: string[]): Promise<boolean> {
    try {
        // Para remover, precisamos dos ÍNDICES das músicas na playlist, não dos IDs.
        // 1. Busca a playlist atual
        const currentSongs = await this.getPlaylist(playlistId);
        
        // 2. Encontra os índices que correspondem aos IDs selecionados
        // Importante: remover de trás para frente para não alterar os índices durante o processo se fosse sequencial,
        // mas o updatePlaylist aceita múltiplos songIndexToRemove de uma vez baseados no estado inicial.
        
        const indexesToRemove: number[] = [];
        currentSongs.forEach((song, index) => {
            if (songIds.includes(song.id)) {
                indexesToRemove.push(index);
            }
        });

        if (indexesToRemove.length === 0) return true; // Nada a remover

        const params = indexesToRemove.map(idx => `&songIndexToRemove=${idx}`).join('');
        await this.fetchData('updatePlaylist.view', `&playlistId=${playlistId}${params}`);
        return true;
    } catch (e) {
        console.error("Failed to remove songs from playlist", e);
        return false;
    }
  }

  async toggleStar(id: string, isStarred: boolean): Promise<boolean> {
      try {
          const endpoint = isStarred ? 'unstar.view' : 'star.view';
          await this.fetchData(endpoint, `&id=${id}`);
          return true;
      } catch (e) {
          console.error("Failed to toggle star", e);
          return false;
      }
  }

  async setRating(id: string, rating: number): Promise<boolean> {
      try {
          // rating deve ser entre 0 e 5
          await this.fetchData('setRating.view', `&id=${id}&rating=${rating}`);
          return true;
      } catch (e) {
          console.error("Failed to set rating", e);
          return false;
      }
  }

  async getStarredSongs(): Promise<NaviSong[]> {
    try {
        const data = await this.fetchData('getStarred.view');
        // getStarred retorna objetos { song: [], album: [], artist: [] }
        const songs = data['subsonic-response'].starred?.song || [];
        return songs;
    } catch (e) {
        console.error("Failed to fetch starred songs", e);
        return [];
    }
  }

  async searchSongs(query: string, size: number = 100, offset: number = 0): Promise<{ songs: NaviSong[], total: number }> {
     // Usa search2.view como solicitado
     const data = await this.fetchData('search2.view', `&query=${encodeURIComponent(query)}&songCount=${size}&songOffset=${offset}&artistCount=0&albumCount=0`);
     const songs = data['subsonic-response'].searchResult2?.song || [];
     // A resposta de searchResult2 geralmente não inclui 'totalHits' confiável para paginação na API Subsonic padrão,
     // mas retornamos o array de músicas. Se for vazio, acabou.
     return { songs, total: 0 }; 
  }

  async checkIfSongExists(artist: string, title: string): Promise<boolean> {
    try {
      const sanitizedArtist = this.sanitizeQuery(artist).split(',')[0];
      const sanitizedTitle = this.sanitizeQuery(title);
      // Search for the song by combining artist and title.
      // Set songCount to 1 as we only need to know if at least one exists.
      const query = `${sanitizedArtist} ${sanitizedTitle}`;
      console.log(`Checking existence of song: ${query}`);
      const data = await this.fetchData('search2.view', `&query=${encodeURIComponent(query)}&songCount=1&songOffset=0&artistCount=0&albumCount=0`);
      const songs = data['subsonic-response'].searchResult2?.song || [];
      return songs.length > 0;
    } catch (e) {
      console.error(`Error checking if song exists: ${artist} - ${title}`, e);
      return false;
    }
  }


  async getSongsByFilter(artist?: string, genre?: string, year?: string, size: number = 100, offset: number = 0, quickListType?: 'newest' | 'recent' | 'frequent' | 'highest'): Promise<{ songs: NaviSong[], total: number }> {
    // Strategy:
    // 1. If QuickList (Newest, Recent, Frequent, Highest): Get albums -> fetch their songs
    // 2. If Artist is present: Use search3
    // 3. If Only Genre: Use getSongsByGenre
    // 4. Fallback: getRandomSongs
    
    if (quickListType) {
        const estimatedAlbumsToFetch = Math.max(5, Math.ceil(size / 10));
        const albumOffset = Math.floor(offset / 10);
        
        const albums = await this.getAlbums(quickListType, estimatedAlbumsToFetch, albumOffset);
        
        // Parallel fetch of songs for these albums
        const detailPromises = albums.map(a => this.getAlbum(a.id));
        const details = await Promise.all(detailPromises);
        
        const songs = details.flatMap(d => d.songs);
        
        // Filter year locally if provided with quicklist
        if (year) {
             const y = parseInt(year);
             if (!isNaN(y)) {
                 const filtered = songs.filter(s => s.year === y);
                 return { songs: filtered.slice(0, size), total: 2000 };
             }
        }

        return { songs: songs.slice(0, size), total: 2000 }; 
    }

    if (artist) {
        const data = await this.fetchData('search3.view', `&query=${encodeURIComponent(artist)}&songCount=${size}&songOffset=${offset}&artistCount=0&albumCount=0`);
        let songs: NaviSong[] = data['subsonic-response'].searchResult3?.song || [];
        const total = data['subsonic-response'].searchResult3?.totalHits || 0;
        
        if (genre) {
            songs = songs.filter(s => s.genre?.toLowerCase() === genre.toLowerCase());
        }
        if (year) {
            const y = parseInt(year);
            if (!isNaN(y)) songs = songs.filter(s => s.year === y);
        }
        return { songs, total: Number(total) };
    } 
    
    if (genre) {
        const data = await this.fetchData('getSongsByGenre.view', `&genre=${encodeURIComponent(genre)}&count=${size}&offset=${offset}`);
        let songs = data['subsonic-response'].songsByGenre?.song || [];
        const total = data['subsonic-response'].songsByGenre?.songCount || 0;
        
        if (year) {
            const y = parseInt(year);
            if (!isNaN(y)) songs = songs.filter((s: any) => s.year === y);
        }
        return { songs, total: Number(total) };
    }

    let songs = await this.getRandomSongs(size);
    if (year) {
        const y = parseInt(year);
        if (!isNaN(y)) songs = songs.filter(s => s.year === y);
    }
    return { songs, total: 0 }; 
  }
}

export const navidromeService = new NavidromeService();