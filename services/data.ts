
import { TagGroup, SpotifyCredentials } from '../types';

const STORAGE_KEY = 'sonictag_groups';
const SPOTIFY_KEY = 'sonictag_spotify';


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
    const data = localStorage.getItem(SPOTIFY_KEY);
    return data ? JSON.parse(data) : { clientId: '', clientSecret: '', redirectUri: '' };
  } catch (e) {
    console.error("Erro ao carregar Spotify do LocalStorage", e);
    return { clientId: '', clientSecret: '', redirectUri: '' };
  }
};

export const saveSpotifyCredentials = (creds: SpotifyCredentials) => {
  try {
    localStorage.setItem(SPOTIFY_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error("Erro ao salvar Spotify no LocalStorage", e);
  }
};
