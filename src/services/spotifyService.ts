
import { SpotifyTrack, PaginatedSpotifyTracks, NaviSong } from '../../types';
import { getSpotifyCredentials, saveSpotifyCredentials } from './data';
import { SPOTIFY_API_BASE_V1, SPOTIFY_API_BASE_ACCOUNTS } from '../core/config';


class SpotifyService {
  private appAccessToken: string | null = null;
  private appTokenExpiry: number = 0;

  // Propriedades para tokens de usuário
  private userAccessToken: string | null = null;
  private userRefreshToken: string | null = null;
  private userTokenExpiresAt: number = 0; // Unix timestamp in milliseconds

  private onAuthenticationRequiredCallback: (() => void) | null = null;

  constructor() {
    this.loadUserTokensFromStorage();
  }

  public setOnAuthenticationRequiredCallback(callback: () => void): void {
    this.onAuthenticationRequiredCallback = callback;
  }

  private async loadUserTokensFromStorage() {
    const creds = await getSpotifyCredentials();
    if (creds.accessToken && creds.refreshToken && creds.expiresAt) {
      this.userAccessToken = creds.accessToken;
      this.userRefreshToken = creds.refreshToken;
      this.userTokenExpiresAt = creds.expiresAt;
    }
  }

  async getSpotifyMappedTracks(items: any[]): Promise<NaviSong[] > {
    const mappedSongs: NaviSong[] = await Promise.all(items.map(async (track: any) => {
      const naviSong: NaviSong = {
        contentType: 'audio/spotify',
        id: track.id,
        title: track.name,
        artist: track.artists ? track.artists.map((a: any) => a.name).join(', ') : undefined,
        album: track.album.name,
        year: track.album.release_date ? parseInt(track.album.release_date.substring(0, 4)) : undefined,
        coverArt: track.album.images && track.album.images.length > 0 ? track.album.images[0].url : undefined,
        duration: Math.floor(track.duration_ms / 1000),
        track: track.track_number,
        isrc: track.external_ids ? track.external_ids.isrc : undefined,
        uri: track.uri,
        path: track.external_urls ? track.external_urls.spotify : undefined,
        type: 'music',
      };
      return naviSong;
    }));
    return mappedSongs
  }

  // Helper para construir a URL de autorização do Spotify
  public async getAuthorizationUrl() {
    const creds = await getSpotifyCredentials();
    if (!creds.clientId || !creds.redirectUri) {
      console.error("Client ID ou Redirect URI do Spotify não configurados.");
      return null;
    }

    const scopes = 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-modify-playback-state user-read-playback-state user-read-currently-playing';
    const authUrl = new URL(`${SPOTIFY_API_BASE_ACCOUNTS}/authorize`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', creds.clientId);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('redirect_uri', creds.redirectUri);
    // authUrl.searchParams.append('state', 'some_random_state_string'); // Opcional: para segurança CSRF

    return authUrl.toString();
  }

  // Troca o código de autorização por tokens
  public async exchangeCodeForTokens(code: string): Promise<boolean> {
    const creds = await getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret || !creds.redirectUri) {
      console.error("Credenciais completas do Spotify não configuradas para troca de código.");
      return false;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch(`${SPOTIFY_API_BASE_ACCOUNTS}/api/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: creds.redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Falha ao trocar código por tokens:", errorData);
        throw new Error('Falha ao trocar código por tokens com Spotify');
      }

      const data = await response.json();
      await this.setTokens(data.access_token, data.refresh_token, data.expires_in);
      return true;
    } catch (error) {
      console.error("Spotify Token Exchange Error:", error);
      return false;
    }
  }

  // Define e salva os tokens do usuário
  private async setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    this.userAccessToken = accessToken;
    this.userRefreshToken = refreshToken;
    this.userTokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; // 1 min buffer

    // Salvar no armazenamento persistente
    const creds = await getSpotifyCredentials();
    await saveSpotifyCredentials({
      ...creds,
      accessToken: this.userAccessToken,
      refreshToken: this.userRefreshToken,
      expiresAt: this.userTokenExpiresAt,
    });
  }

  // Renova o token de acesso usando o refresh token
  private async refreshAccessToken(): Promise<boolean> {
    const creds = await getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret || !this.userRefreshToken) {
      console.error("Credenciais ou Refresh Token ausentes para renovar o token.");
      return false;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch(`${SPOTIFY_API_BASE_ACCOUNTS}/api/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.userRefreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Falha ao renovar token:", errorData);
        throw new Error('Falha ao renovar token com Spotify');
      }

      const data = await response.json();
      // O refresh token pode ou não ser retornado. Se for, use-o.
      await this.setTokens(data.access_token, data.refresh_token || this.userRefreshToken, data.expires_in);
      return true;
    } catch (error) {
      console.error("Spotify Refresh Token Error:", error);
      return false;
    }
  }

  // Retorna o token de acesso, priorizando o do usuário
  private async getAccessToken(): Promise<string | null> {
    // 1. Tentar usar o token de acesso do usuário
    if (this.userAccessToken && this.userTokenExpiresAt > Date.now()) {
      return this.userAccessToken;
    }

    // 2. Se o token do usuário expirou, tentar renová-lo
    if (this.userRefreshToken && this.userTokenExpiresAt <= Date.now()) {
      console.log("Token de usuário expirado, tentando renovar...");
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.userAccessToken) {
        return this.userAccessToken;
      }
    }

    // 3. Se não há token de usuário válido ou renovável, obter um app access token (client_credentials)
    const creds = await getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      console.warn("Credenciais do Spotify não configuradas para app access token.");
      return null;
    }

    if (this.appAccessToken && Date.now() < this.appTokenExpiry) {
      return this.appAccessToken;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch(`${SPOTIFY_API_BASE_ACCOUNTS}/api/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha na autenticação com Spotify (Client Credentials):', errorData);
        throw new Error('Falha na autenticação com Spotify (Client Credentials)');
      }

      const data = await response.json();
      this.appAccessToken = data.access_token;
      this.appTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
      return this.appAccessToken;
    } catch (error) {
      console.error("Spotify App Auth Error:", error);
      return null;
    }
  }

  // Método para verificar se o usuário está autenticado
  public isAuthenticated(): boolean {
    return !!this.userAccessToken && this.userTokenExpiresAt > Date.now();
  }

  // Método para fazer logout (limpar tokens de usuário)
  public async logout(): Promise<void> {
    this.userAccessToken = null;
    this.userRefreshToken = null;
    this.userTokenExpiresAt = 0;

    const creds = await getSpotifyCredentials();
    await saveSpotifyCredentials({
      ...creds,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
    });
    console.log("Logout do Spotify realizado.");

    if (this.onAuthenticationRequiredCallback) {
      this.onAuthenticationRequiredCallback();
    }
  }

  async searchTracks(query: string, limit: number = 20, offset: number = 0): Promise<PaginatedSpotifyTracks> {
    const token = await this.getAccessToken();
    if (!token) return { items: [], total: 0 };

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha na busca do Spotify:', errorData);
        throw new Error('Falha na busca do Spotify');
      }

      const data = await response.json();
      return {
        items: data.tracks.items,
        total: data.tracks.total
      };
    } catch (error) {
      console.error("Spotify Search Error:", error);
      return { items: [], total: 0 };
    }
  }

  async getNewReleases(limit: number = 20, offset: number = 0): Promise<PaginatedSpotifyTracks> {
    const token = await this.getAccessToken();
    if (!token) return { items: [], total: 0 };

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/browse/new-releases?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha ao buscar novos lançamentos do Spotify:', errorData);
        if (response.status === 401) {
          await this.logout();
        }
        return { items: [], total: 0 };
      }
      const data = await response.json();

      let allTracks: SpotifyTrack[] = [];
      // Fetch all tracks for each album and combine them
      // This can be slow if there are many albums and many tracks per album
      // A more optimized approach might be needed for very large 'limit' values
      for (const album of data.albums.items) {
        const albumTracksResponse = await fetch(`${SPOTIFY_API_BASE_V1}/albums/${album.id}/tracks`, { // Fetch all tracks from the album
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (albumTracksResponse.ok) {
          const albumTracksData = await albumTracksResponse.json();
          for (const track of albumTracksData.items) {
            track.album = { // Enrich track with album details
              id: album.id,
              name: album.name,
              images: album.images,
              release_date: album.release_date
            };
            allTracks.push(track);
          }
        }
      }
      // Spotify's New Releases API returns total albums, not total tracks.
      // We are fetching tracks from each album.
      // For 'total', we can use the length of allTracks, or the total of albums (less accurate for tracks).
      // Let's use the actual number of tracks fetched for `total` for now,
      // which means pagination will only work for this current batch of tracks.
      // A more robust solution would involve fetching all pages of albums and their tracks.
      return {
        items: allTracks,
        total: allTracks.length // Total tracks fetched in this request
      };
    } catch (e) {
      console.error("Spotify Get New Releases Error:", e);
      return { items: [], total: 0 };
    }
  }

  async getLikedSongs(offset: number = 0, limit: number = 50): Promise<PaginatedSpotifyTracks> {
    const token = await this.getAccessToken();
    if (!token) {
      console.warn("Não há token de acesso do Spotify disponível para buscar músicas curtidas.");
      return { items: [], total: 0 };
    }

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/me/tracks?offset=${offset}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha ao buscar músicas curtidas do Spotify:', errorData);
        // Se for um erro de autenticação, o token pode estar inválido/expirado
        if (response.status === 401) {
          await this.logout(); // Força o logout para o usuário reautenticar
        }
        return { items: [], total: 0 };
      }

      const data = await response.json();
      return {
        items: data.items.map((item: any) => item.track),
        total: data.total
      };
    } catch (error) {
      console.error("Spotify Get Liked Songs Error:", error);
      return { items: [], total: 0 };
    }
  }

  async getUserPlaylists(): Promise<any[]> { // Should create a type for this
    const token = await this.getAccessToken();
    if (!token) {
      console.warn("No access token available for fetching user playlists.");
      return [];
    }

    let allPlaylists: any[] = [];
    let nextUrl: string | null = `${SPOTIFY_API_BASE_V1}/me/playlists?limit=50`;

    try {
      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to fetch user playlists:', errorData);
          if (response.status === 401) {
            await this.logout();
          }
          break;
        }

        const data = await response.json();
        allPlaylists = [...allPlaylists, ...data.items];
        nextUrl = data.next;
      }
      return allPlaylists;
    } catch (error) {
      console.error("Spotify Get User Playlists Error:", error);
      return [];
    }
  }

  async getPlaylistTracks(playlistId: string, offset: number = 0, limit: number = 50): Promise<PaginatedSpotifyTracks> { // Should create a type for this
    const token = await this.getAccessToken();
    if (!token) {
      console.warn("No access token available for fetching playlist tracks.");
      return { items: [], total: 0 };
    }

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch playlist tracks:', errorData);
        if (response.status === 401) {
          await this.logout();
        }
        return { items: [], total: 0 };
      }

      const data = await response.json();
      return {
        items: data.items.map((item: any) => item.track),
        total: data.total
      };
    } catch (error) {
      console.error("Spotify Get Playlist Tracks Error:", error);
      return { items: [], total: 0 };
    }
  }

  public async getActiveDevice(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/me/player/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;

      const { devices } = await response.json();
      if (devices && devices.length > 0) {
        const activeDevice = devices.find((d: any) => d.is_active);
        return activeDevice ? activeDevice.id : devices[0].id;
      }
      return null;
    } catch (error) {
      console.error("Spotify Get Devices Error:", error);
      return null;
    }
  }

  // Public: retorna a lista de dispositivos disponíveis ao usuário (Spotify Connect)
  public async getDevices(): Promise<any[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/me/player/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch Spotify devices:', errorData);
        return [];
      }

      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error("Spotify Get Devices Error:", error);
      return [];
    }
  }

  // Public: transfere a reprodução para o device especificado (Spotify Connect)
  public async transferPlayback(deviceId: string, play: boolean = true): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/me/player`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [deviceId], play })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Failed to transfer playback:', err);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Spotify Transfer Playback Error:', error);
      return false;
    }
  }

  async playTrack(trackUri: string) {
    const token = await this.getAccessToken();
    if (!token) return;

    const deviceId = await this.getActiveDevice();
    if (!deviceId) {
      console.warn("Nenhum dispositivo Spotify ativo encontrado.");
      return;
    }

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [trackUri] })
      });
    } catch (error) {
      console.error("Spotify Play Track Error:", error);
    }
  }
  async getPlaybackState(): Promise<any | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${SPOTIFY_API_BASE_V1}/me/player`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 204) { // No content, means no active playback
        return null;
      }
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get Spotify playback state:', errorData);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Spotify Get Playback State Error:", error);
      return null;
    }
  }

  async seek(position_ms: number) {
    const token = await this.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/seek?position_ms=${position_ms}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Seek Error:", error);
    }
  }
  async togglePlayPause() {
    const playbackState = await this.getPlaybackState();
    if (playbackState && playbackState.is_playing) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async play() {
    const token = await this.getAccessToken();
    if (!token) return;

    const deviceId = await this.getActiveDevice();
    if (!deviceId) {
      console.warn("Nenhum dispositivo Spotify ativo encontrado para iniciar a reprodução.");
      return;
    }

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Play Error:", error);
    }
  }

  async pause() {
    const token = await this.getAccessToken();
    if (!token) return;

    const deviceId = await this.getActiveDevice();
    if (!deviceId) {
      console.warn("Nenhum dispositivo Spotify ativo encontrado para pausar.");
      return;
    }

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Pause Error:", error);
    }
  }
  async skipToNext() {
    const token = await this.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/next`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Skip To Next Error:", error);
    }
  }

  async skipToPrevious() {
    const token = await this.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/previous`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Skip To Previous Error:", error);
    }
  }

  async setVolume(volume_percent: number) {
    const token = await this.getAccessToken();
    if (!token) return;

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/volume?volume_percent=${volume_percent}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Set Volume Error:", error);
    }
  }

  async stop() {
    const token = await this.getAccessToken();
    if (!token) return;

    const deviceId = await this.getActiveDevice();
    if (!deviceId) {
      console.warn("Nenhum dispositivo Spotify ativo encontrado para parar.");
      return;
    }

    try {
      await fetch(`${SPOTIFY_API_BASE_V1}/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Spotify Stop Error:", error);
    }
  }
}

export const spotifyService = new SpotifyService();
