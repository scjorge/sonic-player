import { getTidalCredentials, saveTidalCredentials } from '../repository/tidal';
import { TidalPlayback } from '../../../types';
import { TIDAL_AUTH_BASE } from '../../core/config';
import { TIDAL_API_BASE_V1, TIDAL_API_BASE_V2, TIDAL_API_BASE_RESOURCES } from '../../core/config';

class TidalService {
  async startDeviceAuth(scope = 'r_usr+w_usr+w_sub') {
    const creds: any = getTidalCredentials();
    if (!creds.clientId) throw new Error('Client ID não configurado');

    const body = new URLSearchParams();
    body.append('client_id', creds.clientId);
    body.append('scope', scope);

    const res = await fetch(`${TIDAL_AUTH_BASE}/device_authorization`, {
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

      const res = await fetch(`${TIDAL_AUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${creds.clientId}:${creds.clientSecret}`),
        },
        body: body.toString(),
      });

      let json: any = {};
      try { json = await res.json(); } catch { json = {}; }

      if (res.ok) {
        const expiresAt = Date.now() + (json.expires_in * 1000);
        // Save tokens
        saveTidalCredentials({
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

  private async getTidalMappedTracks(tracks: any[]) {
    const mapped = await Promise.all(tracks.map(async (t: any) => {
      const artist = (t.artists && t.artists.length > 0) ? t.artists.map((a: any) => a.name).join(', ') : (t.artistName || '');
      const albumName = t.album ? (t.album.title || t.album.name) : (t.albumName || '');
      const year = t.album && t.album.releaseDate ? t.album.releaseDate.split('-')[0] : await this.getAlbumYears(t.album.id);
      const cover = t.album && t.album.cover ? t.album.cover : (t.image || undefined);

      return {
        contentType: 'audio/tidal',
        id: String(t.id || t.trackId || `${artist}-${t.title}`),
        title: t.title || t.name || '',
        artist: artist,
        album: albumName,
        year: year,
        coverArt: `${TIDAL_API_BASE_RESOURCES}/images/${cover.replace(/-/g, '/')}/1280x1280.jpg`,
        duration: t.duration || undefined,
        track: t.trackNumber || undefined,
        isrc: t.isrc || undefined,
        url: t.url || t.playUrl || undefined,
      };
    }));
    return mapped
  }

  async getAlbumYears(albumId: string[]) {
    const token = this.getAccessToken();
    const countryCode = this.getCredentials().countryCode;

    if (!token) throw new Error('Not authenticated with TIDAL');
    const url = `${TIDAL_API_BASE_V2}/albums/${albumId}?countryCode=${countryCode}&include=artists`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json'
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error('Tidal Album Year lookup failed: ' + JSON.stringify(body));
    }

    const json = await res.json();
    const year = json.data.attributes.releaseDate.split('-')[0];
    return year;
  }

  async searchTracks(query: string, limit = 50, offset = 0) {
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

      const url = `${TIDAL_API_BASE_V2}/tracks?${params.toString()}`;
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

      const urlTracks = `${TIDAL_API_BASE_V1}/tracks/${json.data[0].id}?${params.toString()}`;
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
      const mapped = await this.getTidalMappedTracks(tracks);
      return { items: mapped, total };
    }

    // Regular search (v1)
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('types', 'TRACKS');
    if (countryCode) params.append('countryCode', countryCode);

    const res = await fetch(`${TIDAL_API_BASE_V1}/search?${params.toString()}`, {
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
    const mapped = await this.getTidalMappedTracks(tracks);
    return { items: mapped, total };
  }

  async getFavoriteTracks(limit = 50, offset = 0) {
    const creds = this.getCredentials();
    const token = this.getAccessToken();
    const countryCode = creds.countryCode;
    const userID = creds.userId;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('countryCode', countryCode);

    const res = await fetch(`${TIDAL_API_BASE_V1}/users/${userID}/favorites/tracks?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error('Tidal favorites fetch failed: ' + JSON.stringify(body));
    }

    const json = await res.json();
    const tracks = json.items.map((t: any) => { return t.item });
    const total = json.totalNumberOfItems;
    const mapped = await this.getTidalMappedTracks(tracks);    
    return { items: mapped, total };
  }

  async getUserPlaylists(limit = 50, offset = 0) {
    const creds = this.getCredentials();
    const token = this.getAccessToken();
    const countryCode = creds.countryCode;
    const userID = creds.userId;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (countryCode) params.append('countryCode', countryCode);

    const res = await fetch(`${TIDAL_API_BASE_V1}/users/${userID}/playlists?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error('Tidal playlists fetch failed: ' + JSON.stringify(body));
    }

    const json = await res.json();
    const items = json.items || [];
    const mapped = items.map((p: any) => ({
      id: p.uuid || p.id,
      name: p.title || p.name,
      songCount: p.numberOfTracks || p.numberOfItems || p.length || 0,
    }));

    const total = json.totalNumberOfItems || json.total || mapped.length;
    return { items: mapped, total };
  }

  /**
   * Tenta renovar o accessToken usando o refresh_token salvo, caso esteja expirado.
   * Retorna true se, ao final, existir um accessToken válido, false caso contrário.
   */
  async refreshAccessTokenIfNeeded(): Promise<boolean> {
    const creds: any = getTidalCredentials();

    // Sem refreshToken ou client credentials, não há o que fazer
    if (!creds.refreshToken || !creds.clientId || !creds.clientSecret) {
      return !!(creds.accessToken && creds.expiresAt && creds.expiresAt > Date.now());
    }

    // Se o token atual ainda é válido, nada a fazer
    if (creds.accessToken && creds.expiresAt && creds.expiresAt > Date.now()) {
      return true;
    }

    try {
      const body = new URLSearchParams();
      body.append('grant_type', 'refresh_token');
      body.append('refresh_token', creds.refreshToken);
      body.append('client_id', creds.clientId);

      const res = await fetch(`${TIDAL_AUTH_BASE}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${creds.clientId}:${creds.clientSecret}`),
        },
        body: body.toString(),
      });

      const json: any = await res.json().catch(() => ({}));

      if (!res.ok || !json.access_token) {
        console.error('Falha ao renovar token do TIDAL via refresh_token', json);
        // Se falhou, zera os tokens para forçar re-autenticação manual
        saveTidalCredentials({});
        return false;
      }

      const expiresAt = Date.now() + (json.expires_in * 1000);

      saveTidalCredentials({
        accessToken: json.access_token,
        refreshToken: json.refresh_token || creds.refreshToken,
        expiresAt,
        countryCode: creds.countryCode,
        userId: creds.userId,
      });

      return true;
    } catch (e) {
      console.error('Erro ao tentar renovar token do TIDAL', e);
      return false;
    }
  }

  async getPlaylistItems(playlistId: string, limit = 100, offset = 0) {
    const creds = this.getCredentials();
    const token = this.getAccessToken();
    const countryCode = creds.countryCode;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (countryCode) params.append('countryCode', countryCode);

    const res = await fetch(`${TIDAL_API_BASE_V1}/playlists/${playlistId}/items?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error('Tidal playlist items fetch failed: ' + JSON.stringify(body));
    }

    const json = await res.json();
    const items = json.items || [];
    const tracks = items.map((it: any) => it.item || it.track || it);
    const mapped = await this.getTidalMappedTracks(tracks);
    const total = json.totalNumberOfItems;
    return { items: mapped, total };
  }

  getCredentials() {
    return getTidalCredentials();
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

  // Logout: remove completamente a chave de autenticação do TIDAL
  logout() {
    try {
      // Remove todas as infos gravadas em TIDAL_AUTH_KEY
      saveTidalCredentials({});
    } catch (e) {
      console.error('Erro ao efetuar logout do TIDAL', e);
    }
  }

  async getTidalPlaybackInfo(creds: any, trackId: string, audioQuality: TidalPlayback['audioQuality']): Promise<TidalPlayback> {
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


    const token = creds.accessToken;
    const countryCode = creds.countryCode;
    if (!token) throw new Error('Not authenticated with TIDAL');

    const url =
        `${TIDAL_API_BASE_V1}/tracks/${trackId}/playbackinfopostpaywall` +
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
