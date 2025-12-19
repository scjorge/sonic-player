
import { SpotifyCredentials, SpotifyTrack } from '../types';
import { getSpotifyCredentials, saveSpotifyCredentials } from './data'; // Importar saveSpotifyCredentials

class SpotifyService {
  private appAccessToken: string | null = null;
  private appTokenExpiry: number = 0;

  // Propriedades para tokens de usuário
  private userAccessToken: string | null = null;
  private userRefreshToken: string | null = null;
  private userTokenExpiresAt: number = 0; // Unix timestamp in milliseconds

  constructor() {
    this.loadUserTokensFromStorage();
  }

  private loadUserTokensFromStorage() {
    const creds = getSpotifyCredentials();
    if (creds.accessToken && creds.refreshToken && creds.expiresAt) {
      this.userAccessToken = creds.accessToken;
      this.userRefreshToken = creds.refreshToken;
      this.userTokenExpiresAt = creds.expiresAt;
    }
  }

  // Helper para construir a URL de autorização do Spotify
  public getAuthorizationUrl(): string | null {
    const creds = getSpotifyCredentials();
    if (!creds.clientId || !creds.redirectUri) {
      console.error("Client ID ou Redirect URI do Spotify não configurados.");
      return null;
    }

    const scopes = 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public';
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', creds.clientId);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('redirect_uri', creds.redirectUri);
    // authUrl.searchParams.append('state', 'some_random_state_string'); // Opcional: para segurança CSRF

    return authUrl.toString();
  }

  // Troca o código de autorização por tokens
  public async exchangeCodeForTokens(code: string): Promise<boolean> {
    const creds = getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret || !creds.redirectUri) {
      console.error("Credenciais completas do Spotify não configuradas para troca de código.");
      return false;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch('https://accounts.spotify.com/api/token', {
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
      this.setTokens(data.access_token, data.refresh_token, data.expires_in);
      return true;
    } catch (error) {
      console.error("Spotify Token Exchange Error:", error);
      return false;
    }
  }

  // Define e salva os tokens do usuário
  private setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    this.userAccessToken = accessToken;
    this.userRefreshToken = refreshToken;
    this.userTokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; // 1 min buffer

    // Salvar no armazenamento persistente
    const creds = getSpotifyCredentials();
    saveSpotifyCredentials({
      ...creds,
      accessToken: this.userAccessToken,
      refreshToken: this.userRefreshToken,
      expiresAt: this.userTokenExpiresAt,
    });
  }

  // Renova o token de acesso usando o refresh token
  private async refreshAccessToken(): Promise<boolean> {
    const creds = getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret || !this.userRefreshToken) {
      console.error("Credenciais ou Refresh Token ausentes para renovar o token.");
      return false;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch('https://accounts.spotify.com/api/token', {
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
      this.setTokens(data.access_token, data.refresh_token || this.userRefreshToken, data.expires_in);
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
    const creds = getSpotifyCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      console.warn("Credenciais do Spotify não configuradas para app access token.");
      return null;
    }

    if (this.appAccessToken && Date.now() < this.appTokenExpiry) {
      return this.appAccessToken;
    }

    try {
      const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
      const response = await fetch('https://accounts.spotify.com/api/token', {
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
  public logout(): void {
    this.userAccessToken = null;
    this.userRefreshToken = null;
    this.userTokenExpiresAt = 0;

    const creds = getSpotifyCredentials();
    saveSpotifyCredentials({
      ...creds,
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
    });
    console.log("Logout do Spotify realizado.");
  }
  

  async searchTracks(query: string): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha na busca do Spotify:', errorData);
        throw new Error('Falha na busca do Spotify');
      }

      const data = await response.json();
      return data.tracks.items;
    } catch (error) {
      console.error("Spotify Search Error:", error);
      return [];
    }
  }

  async getLikedSongs(): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    if (!token) {
      console.warn("Não há token de acesso do Spotify disponível para buscar músicas curtidas.");
      return [];
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Falha ao buscar músicas curtidas do Spotify:', errorData);
        // Se for um erro de autenticação, o token pode estar inválido/expirado
        if (response.status === 401) {
            this.logout(); // Força o logout para o usuário reautenticar
        }
        return [];
      }

      const data = await response.json();
      return data.items.map((item: any) => item.track);
    } catch (error) {
      console.error("Spotify Get Liked Songs Error:", error);
      return [];
    }
  }
}

export const spotifyService = new SpotifyService();

