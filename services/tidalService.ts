import { TidalCredentials } from '../types';
import { getTidalCredentials, saveTidalCredentials } from './data';

const AUTH_ENDPOINT = 'https://login.tidal.com/authorize';
const TOKEN_ENDPOINT = 'https://auth.tidal.com/v1/oauth2/token';

class TidalService {
  private userAccessToken: string | null = null;
  private userRefreshToken: string | null = null;
  private userTokenExpiresAt: number = 0;

  constructor() {
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    const creds: any = getTidalCredentials();
    if (creds.accessToken && creds.refreshToken && creds.expiresAt) {
      this.userAccessToken = creds.accessToken;
      this.userRefreshToken = creds.refreshToken;
      this.userTokenExpiresAt = creds.expiresAt;
    }
  }

  // PKCE helpers
  private generateCodeVerifier(): string {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hash = new Uint8Array(digest);
    return this.base64UrlEncode(hash);
  }

  private base64UrlEncode(buffer: Uint8Array) {
    let base64 = btoa(String.fromCharCode(...Array.from(buffer)));
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
  }

  public async getAuthorizationUrl(scopes: string = ''): Promise<string | null> {
    const creds: any = getTidalCredentials();
    if (!creds.clientId || !creds.redirectUri) return null;

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Save verifier to localStorage for exchange step
    localStorage.setItem('tidal_code_verifier', codeVerifier);

    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', creds.clientId);
    url.searchParams.append('redirect_uri', creds.redirectUri);
    if (scopes) url.searchParams.append('scope', scopes);
    url.searchParams.append('code_challenge_method', 'S256');
    url.searchParams.append('code_challenge', codeChallenge);
    url.searchParams.append('state', 'tidal');

    return url.toString();
  }

  public async exchangeCodeForTokens(code: string): Promise<boolean> {
    const creds: any = getTidalCredentials();
    const verifier = localStorage.getItem('tidal_code_verifier');
    if (!creds.clientId || !creds.redirectUri || !verifier) {
      console.error('Tidal credentials ou code_verifier ausentes.');
      return false;
    }

    try {
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('client_id', creds.clientId);
      body.append('code', code);
      body.append('redirect_uri', creds.redirectUri);
      body.append('code_verifier', verifier);

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Falha ao trocar código por tokens (Tidal):', err);
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token, data.expires_in);
      // Clean up verifier
      localStorage.removeItem('tidal_code_verifier');
      return true;
    } catch (e) {
      console.error('Tidal token exchange error', e);
      return false;
    }
  }

  private setTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number) {
    this.userAccessToken = accessToken;
    this.userRefreshToken = refreshToken || null;
    this.userTokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;

    const creds: any = getTidalCredentials();
    saveTidalCredentials({
      ...creds,
      accessToken: this.userAccessToken,
      refreshToken: this.userRefreshToken,
      expiresAt: this.userTokenExpiresAt,
    });
  }

  public async refreshAccessToken(): Promise<boolean> {
    if (!this.userRefreshToken) return false;

    try {
      const body = new URLSearchParams();
      body.append('grant_type', 'refresh_token');
      body.append('refresh_token', this.userRefreshToken);

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Falha ao renovar token Tidal:', err);
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, this.userRefreshToken || data.refresh_token, data.expires_in);
      return true;
    } catch (e) {
      console.error('Tidal refresh token error', e);
      return false;
    }
  }

  public isAuthenticated(): boolean {
    return !!this.userAccessToken && this.userTokenExpiresAt > Date.now();
  }

  public logout() {
    this.userAccessToken = null;
    this.userRefreshToken = null;
    this.userTokenExpiresAt = 0;
    const creds: any = getTidalCredentials();
    saveTidalCredentials({ ...creds, accessToken: undefined, refreshToken: undefined, expiresAt: undefined });
  }

  public async getAccessToken(): Promise<string | null> {
    if (this.userAccessToken && this.userTokenExpiresAt > Date.now()) return this.userAccessToken;
    if (this.userRefreshToken && this.userTokenExpiresAt <= Date.now()) {
      const ok = await this.refreshAccessToken();
      if (ok) return this.userAccessToken;
    }
    return null;
  }
}

export const tidalService = new TidalService();
