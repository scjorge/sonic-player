
import { TagGroup, SpotifyCredentials } from '../types';

const STORAGE_KEY = 'sonictag_groups';
const SPOTIFY_KEY = 'sonictag_spotify';
const SPOTIFY_AUTH_KEY = 'sonictag_spotify_auth';
const TIDAL_KEY = 'sonictag_tidal';
const TIDAL_AUTH_KEY = 'sonictag_tidal_auth';
const NAVIDROME_KEY = 'sonictag_navidrome';


// Group Tags storage functions
export const getStoredGroups = (): TagGroup[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Erro ao carregar grupos do LocalStorage", e);
    return [];
  }
};

export const saveStoredGroups = (groups: TagGroup[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error("Erro ao salvar grupos no LocalStorage", e);
  }
};

export const addStoredGroup = (group: TagGroup) => {
  const groups = getStoredGroups();
  groups.push(group);
  saveStoredGroups(groups);
};

export const updateStoredGroup = (updatedGroup: TagGroup) => {
  const groups = getStoredGroups();
  const index = groups.findIndex(g => g.id === updatedGroup.id);
  if (index !== -1) {
    groups[index] = updatedGroup;
    saveStoredGroups(groups);
  }
};

export const deleteStoredGroup = (id: string) => {
  const groups = getStoredGroups();
  const newGroups = groups.filter(g => g.id !== id);
  saveStoredGroups(newGroups);
};



// Spotify storage functions
export const getSpotifyCredentials = (): SpotifyCredentials => {
  try {
    const credsData = localStorage.getItem(SPOTIFY_KEY);
    const authData = localStorage.getItem(SPOTIFY_AUTH_KEY);

    const creds: Partial<SpotifyCredentials> = credsData ? JSON.parse(credsData) : {};
    const auth: Partial<SpotifyCredentials> = authData ? JSON.parse(authData) : {};

    return { 
      clientId: creds.clientId || '', 
      clientSecret: creds.clientSecret || '', 
      redirectUri: creds.redirectUri || '',
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt
    };
  } catch (e) {
    console.error("Erro ao carregar Spotify do LocalStorage", e);
    return { clientId: '', clientSecret: '', redirectUri: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined };
  }
};

export const saveSpotifyCredentials = (creds: SpotifyCredentials) => {
  try {
    const { clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt } = creds;

    // Save basic credentials
    localStorage.setItem(SPOTIFY_KEY, JSON.stringify({ clientId, clientSecret, redirectUri }));

    // Save auth tokens separately
    if (accessToken && refreshToken && expiresAt) {
      localStorage.setItem(SPOTIFY_AUTH_KEY, JSON.stringify({ accessToken, refreshToken, expiresAt }));
    } else {
      localStorage.removeItem(SPOTIFY_AUTH_KEY); // Clear auth data if tokens are removed
    }
  } catch (e) {
    console.error("Erro ao salvar Spotify no LocalStorage", e);
  }
};

// Tidal storage functions
export const getTidalCredentials = () => {
  try {
    const credsData = localStorage.getItem(TIDAL_KEY);
    const authData = localStorage.getItem(TIDAL_AUTH_KEY);

    const creds: any = credsData ? JSON.parse(credsData) : {};
    const auth: any = authData ? JSON.parse(authData) : {};

    return {
      clientId: creds.clientId || '',
      redirectUri: creds.redirectUri || '',
      scopes: creds.scopes || '',
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt,
      codeVerifier: auth.codeVerifier,
    };
  } catch (e) {
    console.error('Erro ao carregar Tidal do LocalStorage', e);
    return { clientId: '', redirectUri: '', scopes: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined, codeVerifier: undefined };
  }
};

export const saveTidalCredentials = (creds: any) => {
  try {
    const { clientId, redirectUri, scopes, accessToken, refreshToken, expiresAt } = creds;
    localStorage.setItem(TIDAL_KEY, JSON.stringify({ clientId, redirectUri, scopes }));

    // Save auth data; also allow saving a temporary codeVerifier even if tokens aren't present
    const authPayload: any = {};
    if (accessToken !== undefined) authPayload.accessToken = accessToken;
    if (refreshToken !== undefined) authPayload.refreshToken = refreshToken;
    if (expiresAt !== undefined) authPayload.expiresAt = expiresAt;
    if (creds.codeVerifier !== undefined) authPayload.codeVerifier = creds.codeVerifier;

    // If there's any auth-related data, store it; otherwise remove the key
    if (Object.keys(authPayload).length > 0) {
      localStorage.setItem(TIDAL_AUTH_KEY, JSON.stringify(authPayload));
    } else {
      localStorage.removeItem(TIDAL_AUTH_KEY);
    }
  } catch (e) {
    console.error('Erro ao salvar Tidal no LocalStorage', e);
  }
};

// Navidrome storage functions
export const getNavidromeCredentials = () => {
  try {
    const data = localStorage.getItem(NAVIDROME_KEY);
    const creds = data ? JSON.parse(data) : {};
    return {
      baseUrl: creds.baseUrl || '',
      user: creds.user || '',
      password: creds.password || ''
    };
  } catch (e) {
    console.error('Erro ao carregar Navidrome do LocalStorage', e);
    return { baseUrl: '', user: '', password: '' };
  }
};

export const saveNavidromeCredentials = (creds: { baseUrl: string; user: string; password: string }) => {
  try {
    localStorage.setItem(NAVIDROME_KEY, JSON.stringify({ baseUrl: creds.baseUrl, user: creds.user, password: creds.password }));
  } catch (e) {
    console.error('Erro ao salvar Navidrome no LocalStorage', e);
  }
};
