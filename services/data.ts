
import { TagGroup, SpotifyCredentials } from '../types';

const STORAGE_KEY = 'sonictag_groups';
const SPOTIFY_KEY = 'sonictag_spotify';
const SPOTIFY_AUTH_KEY = 'sonictag_spotify_auth';


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
