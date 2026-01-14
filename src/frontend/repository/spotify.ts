
import { SpotifyCredentials } from '../../types';
import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

const SPOTIFY_KEY = 'sonictag_spotify';
const SPOTIFY_AUTH_KEY = 'sonictag_spotify_auth';


export const getSpotifyCredentials = async (): Promise<SpotifyCredentials> => {
  const spotifyCreds: Partial<SpotifyCredentials> = {};
  const credsData = localStorage.getItem(SPOTIFY_KEY);
  const authData = localStorage.getItem(SPOTIFY_AUTH_KEY);

  if (authData) {
    const auth: Partial<SpotifyCredentials> = authData ? JSON.parse(authData) : {};
    spotifyCreds.accessToken = auth.accessToken;
    spotifyCreds.refreshToken = auth.refreshToken;
    spotifyCreds.expiresAt = auth.expiresAt;
  }

  if (credsData) {
    const creds: Partial<SpotifyCredentials> = credsData ? JSON.parse(credsData) : {};
    spotifyCreds.clientId = creds.clientId;
    spotifyCreds.clientSecret = creds.clientSecret;
    spotifyCreds.redirectUri = creds.redirectUri;
  }

  if (authData && credsData){
    return spotifyCreds as SpotifyCredentials;
  }

  try {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${BACKEND_BASE_URL}/spotify-settings`, { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        spotifyCreds.clientId = data.clientId || '';
        spotifyCreds.clientSecret = data.clientSecret || '';
        spotifyCreds.redirectUri = data.redirectUri || '';

        try {
          localStorage.setItem(
            SPOTIFY_KEY,
            JSON.stringify({ clientId: spotifyCreds.clientId, clientSecret: spotifyCreds.clientSecret, redirectUri: spotifyCreds.redirectUri })
          );
        } catch (e) {
          console.error('Erro ao cachear Spotify no LocalStorage', e);
        }
      })
      .catch((e) => {
        console.error('Erro ao buscar Spotify do backend', e);
      });
  } catch (e) {
    console.error('Erro ao iniciar fetch de Spotify', e);
  }

  return spotifyCreds as SpotifyCredentials;
};

export const saveSpotifyCredentials = async (creds: SpotifyCredentials) => {
  try {
    const { clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt } = creds;

    // Save basic credentials em cache local
    localStorage.setItem(SPOTIFY_KEY, JSON.stringify({ clientId, clientSecret, redirectUri }));

    // Save auth tokens separadamente
    if (accessToken && refreshToken && expiresAt) {
      localStorage.setItem(SPOTIFY_AUTH_KEY, JSON.stringify({ accessToken, refreshToken, expiresAt }));
    } else {
      localStorage.removeItem(SPOTIFY_AUTH_KEY);
    }

    // Persistir no backend (fire-and-forget)
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${BACKEND_BASE_URL}/spotify-settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt }),
    }).catch(() => {});
  } catch (e) {
    console.error('Erro ao salvar Spotify', e);
  }
};

export const deleteSpotifyCredentials = async () => {
  try {
    localStorage.removeItem(SPOTIFY_KEY);
    localStorage.removeItem(SPOTIFY_AUTH_KEY);

    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch(`${BACKEND_BASE_URL}/spotify-settings`, {
      method: 'DELETE',
      headers,
    }).catch(() => {});
  } catch (e) {
    console.error('Erro ao apagar Spotify', e);
  }
};
