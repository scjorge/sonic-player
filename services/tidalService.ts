import { getTidalCredentials, saveTidalCredentials } from './data';

const AUTH_BASE = 'https://auth.tidal.com/v1/oauth2';

class TidalService {
  async startDeviceAuth(scope = 'r_usr+w_usr+w_sub') {
    const creds: any = getTidalCredentials();
    if (!creds.clientId) throw new Error('Client ID não configurado');

    const body = new URLSearchParams();
    body.append('client_id', creds.clientId);
    body.append('scope', scope);

    const res = await fetch(`${AUTH_BASE}/device_authorization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('Falha ao iniciar device auth: ' + JSON.stringify(err));
    }

    return res.json();
  }

  async pollDeviceToken(device_code: string, intervalSec = 5, timeoutSec = 60) {
    const creds: any = getTidalCredentials();
    if (!creds.clientId || !creds.clientSecret) throw new Error('Client ID/Secret não configurados');

    const start = Date.now();
    while ((Date.now() - start) / 1000 < timeoutSec) {
      const body = new URLSearchParams();
      body.append('client_id', creds.clientId);
      body.append('device_code', device_code);
      body.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
      body.append('scope', 'r_usr+w_usr+w_sub');

      const res = await fetch(`${AUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${creds.clientId}:${creds.clientSecret}`),
        },
        body: body.toString(),
      });

      let json: any = {};
      try { json = await res.json(); } catch (e) { json = {}; }

      if (res.ok) {
        const expiresAt = Date.now() + (json.expires_in * 1000);
        // Save tokens
        saveTidalCredentials({ clientId: creds.clientId, clientSecret: creds.clientSecret, accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt });
        return json;
      }

      // Handle known pending response
      if (json.error === 'authorization_pending') {
        await new Promise(r => setTimeout(r, intervalSec * 1000));
        continue;
      }

      // other errors -> stop
      throw new Error('Erro ao trocar device code: ' + JSON.stringify(json));
    }

    throw new Error('Timeout aguardando autorização do dispositivo');
  }

  async searchTracks(query: string, limit = 50, offset = 0) {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not authenticated with TIDAL');

    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('types', 'TRACKS');
    params.append('countryCode', 'BR');

    const res = await fetch(`https://api.tidal.com/v1/search?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error('Tidal search failed: ' + JSON.stringify(json));
    }

    const json = await res.json();
    // Try to map known structure: { tracks: { items: [...], total: N } }
    const tracks = (json.tracks && json.tracks.items) ? json.tracks.items : (json.items || []);
    const total = (json.tracks && json.tracks.total) ? json.tracks.total : (json.total || tracks.length);

    // Map to NaviSong minimal shape
    const mapped = tracks.map((t: any) => {
      const artist = (t.artists && t.artists.length > 0) ? t.artists.map((a: any) => a.name).join(', ') : (t.artistName || '');
      const albumName = t.album ? (t.album.title || t.album.name) : (t.albumName || '');
      const year = t.album ? (t.album.releaseDate.split('-')[0] || undefined) : undefined;
      const cover = t.album && t.album.cover ? t.album.cover : (t.image || undefined);
      const path = t.url || undefined;
      const isrc = t.isrc || undefined;

      return {
        id: String(t.id || t.trackId || `${artist}-${t.title}`),
        title: t.title || t.name || '',
        artist: artist,
        album: albumName,
        coverArt: `https://resources.tidal.com/images/${cover.replace(/-/g, "/")}/80x80.jpg`, // pass the cover URL/id directly
        url: path,
        year: year,
        isrc: isrc,
        contentType: 'audio/tidal', // ensure UI uses this cover link directly
      } as any;
    });

    return { items: mapped, total };
  }

  getCredentials() {
    return getTidalCredentials();
  }

  clearCredentials() {
    saveTidalCredentials({ clientId: '', clientSecret: '' });
  }

  isAuthenticated() {
    const creds: any = getTidalCredentials();
    return !!creds.accessToken && creds.expiresAt && creds.expiresAt > Date.now();
  }

  getAccessToken() {
    const creds: any = getTidalCredentials();
    if (creds.accessToken && creds.expiresAt && creds.expiresAt > Date.now()) return creds.accessToken;
    return null;
  }

  // Logout: remove only auth tokens (keep clientId/secret)
  logout() {
    const creds: any = getTidalCredentials();
    saveTidalCredentials({ clientId: creds.clientId || '', clientSecret: creds.clientSecret || '' });
  }
}

export const tidalService = new TidalService();
