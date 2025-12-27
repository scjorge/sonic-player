import { getTidalCredentials, saveTidalCredentials } from './data';
import { TidalPlayback } from '../types';

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
        saveTidalCredentials({
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
            expiresAt: expiresAt,
            countryCode: json.user.countryCode,
            userId: json.user.userId,
        });
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
    const getMappepTracks = (tracks: any[]) => {
      const mapped = tracks.map((t: any) => {
        const artist = (t.artists && t.artists.length > 0) ? t.artists.map((a: any) => a.name).join(', ') : (t.artistName || '');
        const albumName = t.album ? (t.album.title || t.album.name) : (t.albumName || '');
        const year = t.album && t.album.releaseDate ? (t.album.releaseDate.split('-')[0] || undefined) : undefined;
        const cover = t.album && t.album.cover ? t.album.cover : (t.image || undefined);

        return {
          id: String(t.id || t.trackId || `${artist}-${t.title}`),
          title: t.title || t.name || '',
          artist: artist,
          album: albumName,
          coverArt: `https://resources.tidal.com/images/${cover.replace(/-/g, '/')}/80x80.jpg`,
          url: t.url || t.playUrl || undefined,
          year: year,
          isrc: t.isrc || undefined,
          contentType: 'audio/tidal',
          duration: t.duration || undefined,
        } as any;
      });
      return mapped
    }

    const token = this.getAccessToken();
    const countryCode = this.getCredentials().countryCode;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const q = (query || '').trim();
    const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i;

    // If the query matches ISRC format, prefer the v2 tracks lookup
    if (isrcRegex.test(q)) {
      const params = new URLSearchParams();
      params.append('filter[isrc]', q);
      params.append('countryCode', countryCode);

      const url = `https://openapi.tidal.com/v2/tracks?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.api+json'
        }
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error('Tidal ISRC lookup failed: ' + JSON.stringify(body));
      }

      const json = await res.json();

      // Econtra pelo ID
      const paramsID = new URLSearchParams();
      paramsID.append('countryCode', countryCode);

      const urlTracks = `https://api.tidal.com/v1/tracks/${json.data[0].id}?${params.toString()}`;
      const resTracks = await fetch(urlTracks, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!resTracks.ok) {
        const body = await resTracks.json().catch(() => ({}));
        throw new Error('Tidal ID lookup failed: ' + JSON.stringify(body));
      }

      const track = await resTracks.json();
      const total = 1;

      const tracks = [track];
      const mapped = getMappepTracks(tracks);
      return { items: mapped, total };
    }

    // Regular search (v1)
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('types', 'TRACKS');
    if (countryCode) params.append('countryCode', countryCode);

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
    const mapped = getMappepTracks(tracks);
    return { items: mapped, total };
  }

  async getFavoriteTracks(limit = 50, offset = 0) {
    const token = this.getAccessToken();
    const countryCode = this.getCredentials().countryCode;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('countryCode', countryCode);

    const endpoints = [
      // Try v2 endpoints first
      `https://api.tidal.com/v2/me/favorites/tracks?${params.toString()}`,
      `https://api.tidal.com/v2/users/me/favorites/tracks?${params.toString()}`,
      `https://api.tidal.com/v2/favorites/tracks?${params.toString()}`,
      // Fallback to v1 endpoints
      `https://api.tidal.com/v1/my/favorites/tracks?${params.toString()}`,
      `https://api.tidal.com/v1/me/favorites/tracks?${params.toString()}`,
      `https://api.tidal.com/v1/users/me/favorites/tracks?${params.toString()}`,
    ];

    let json: any = null;
    let lastErr: any = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // If 404 try next endpoint, if 401/403 raise immediately
          if (res.status === 404) {
            lastErr = { status: res.status, body };
            continue;
          }
          throw new Error('Tidal favorites fetch failed: ' + JSON.stringify(body));
        }

        json = await res.json();
        break;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    if (!json) {
      throw new Error('Tidal favorites fetch failed: ' + JSON.stringify(lastErr));
    }
    // v2 may return { data: [...] } or { items: [...] } or { tracks: { items: [...] } }
    const tracks = json?.data || json?.items || (json.tracks && json.tracks.items) || [];
    const total = json?.total || json?.meta?.total || (json.tracks && json.tracks.total) || tracks.length;

    const mapped = tracks.map((t: any) => {
      const artist = (t.artists && t.artists.length > 0) ? t.artists.map((a: any) => a.name).join(', ') : (t.artistName || '');
      const albumName = t.album ? (t.album.title || t.album.name) : (t.albumName || '');
      const year = t.album && t.album.releaseDate ? (t.album.releaseDate.split('-')[0] || undefined) : undefined;
      const cover = t.album && t.album.cover ? t.album.cover : (t.image || undefined);

      return {
        id: String(t.id || t.trackId || `${artist}-${t.title}`),
        title: t.title || t.name || '',
        artist: artist,
        album: albumName,
        coverArt: cover ? `https://resources.tidal.com/images/${cover.replace(/-/g, '/')}/80x80.jpg` : undefined,
        path: t.url || t.playUrl || undefined,
        year: year,
        isrc: t.isrc || undefined,
        contentType: 'audio/tidal',
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

  async getTidalPlaybackInfo(trackId: string, audioQuality: TidalPlayback['audioQuality']): Promise<TidalPlayback> {
    const parseBTSManifest = (manifestText: any, data: any) => {
        const manifest = JSON.parse(manifestText);

        return {
            trackId: data.trackId,
            audioQuality: data.audioQuality,
            mimeType: manifest.mimeType || null,
            codecs: manifest.codecs || null,
            encryptionType: manifest.encryptionType || null,
            urls: Array.isArray(manifest.urls) ? manifest.urls : []
        };
    }

    const parseDASHManifest = (manifestText: any, data: any) => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(manifestText, "application/xml");

        const adaptationSet = xml.querySelector("AdaptationSet");
        const representation = xml.querySelector("Representation");
        const segmentTemplate = xml.querySelector("SegmentTemplate");

        const mimeType =
            adaptationSet?.getAttribute("mimeType") || null;

        const codecs =
            representation?.getAttribute("codecs") || null;

        const baseUrls = [...xml.querySelectorAll("BaseURL")]
            .map(el => el.textContent)
            .filter(Boolean);

        // DASH normalmente não expõe uma URL única,
        // mas sim segmentos. Aqui padronizamos
        // retornando os BaseURL disponíveis.
        return {
            trackId: data.trackId,
            audioQuality: data.audioQuality,
            mimeType,
            codecs,
            encryptionType: "DASH",
            urls: baseUrls
        };
    }


    const token = this.getAccessToken();
    const countryCode = this.getCredentials().countryCode;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const url =
        `https://api.tidal.com/v1/tracks/${trackId}/playbackinfopostpaywall` +
        `?playbackmode=STREAM` +
        `&assetpresentation=FULL` +
        `&audioquality=${audioQuality}` +
        `&countryCode=${countryCode}`;

    const res = await fetch(url, {
        headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.tidal.v1+json"
        }
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`TIDAL error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Decodifica o manifest Base64
    const manifestText = atob(data.manifest);
    const mimeType = data.manifestMimeType;

    if (mimeType === "application/vnd.tidal.bts") {
        return parseBTSManifest(manifestText, data);
    }

    if (mimeType === "application/dash+xml") {
        return parseDASHManifest(manifestText, data);
    }

    throw new Error(`Unsupported manifest type: ${mimeType}`);
  }
}

export const tidalService = new TidalService();
