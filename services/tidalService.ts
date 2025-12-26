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
