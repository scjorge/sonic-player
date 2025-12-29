
import { TagGroup, SpotifyCredentials } from '../types';
import { TIDAL_CLIENT_ID, TIDAL_CLIENT_SECRET, BACKEND_BASE_URL } from '../core/config';

const NAVIDROME_KEY = 'sonictag_navidrome';
const SPOTIFY_KEY = 'sonictag_spotify';
const SPOTIFY_AUTH_KEY = 'sonictag_spotify_auth';
const TIDAL_AUTH_KEY = 'sonictag_tidal_auth';


// Group Tags storage functions - only via backend requests
export const getStoredGroups = async (): Promise<TagGroup[]> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao buscar grupos do backend', res.status, errText);
      return [];
    }
    const groups: TagGroup[] = await res.json();
    return groups;
  } catch (e) {
    console.error('Erro ao buscar grupos do backend', e);
    return [];
  }
};

export const addStoredGroup = async (group: TagGroup): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao criar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao criar grupo', e);
  }
};

export const updateStoredGroup = async (updatedGroup: TagGroup): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups/${encodeURIComponent(updatedGroup.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: updatedGroup.name,
        prefix: updatedGroup.prefix,
        items: updatedGroup.items,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao atualizar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao atualizar grupo', e);
  }
};

export const deleteStoredGroup = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/tag-groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao apagar grupo', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao apagar grupo', e);
  }
};


// Genre list storage functions - only via backend requests
export const getStoredGenres = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao buscar gêneros do backend', res.status, errText);
      return [];
    }
    const genres: string[] = await res.json();
    return genres;
  } catch (e) {
    console.error('Erro ao buscar gêneros do backend', e);
    return [];
  }
};

export const addStoredGenre = async (genre: string): Promise<void> => {
  const value = genre.trim();
  if (!value) return;

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao criar gênero', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao criar gênero', e);
  }
};

export const deleteStoredGenre = async (genre: string): Promise<void> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/genres/${encodeURIComponent(genre)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Erro ao apagar gênero', res.status, errText);
    }
  } catch (e) {
    console.error('Erro de rede ao apagar gênero', e);
  }
};


// Spotify storage functions - backed by API + local cache
export const getSpotifyCredentials = (): SpotifyCredentials => {
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
    fetch(`${BACKEND_BASE_URL}/api/spotify-settings`)
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

export const saveSpotifyCredentials = (creds: SpotifyCredentials) => {
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
    fetch(`${BACKEND_BASE_URL}/api/spotify-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt }),
    }).catch(() => {});
  } catch (e) {
    console.error('Erro ao salvar Spotify', e);
  }
};


// Tidal storage functions (only clientId + clientSecret)
export const getTidalCredentials = () => {
  try {
    const authData = localStorage.getItem(TIDAL_AUTH_KEY);

    const auth: any = authData ? JSON.parse(authData) : {};

    return {
      clientId: TIDAL_CLIENT_ID,
      clientSecret: TIDAL_CLIENT_SECRET,
      userId: auth.userId || '',
      countryCode: auth.countryCode || 'BR',
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      expiresAt: auth.expiresAt,
    };
  } catch (e) {
    console.error('Erro ao carregar Tidal do LocalStorage', e);
    return { clientId: '', clientSecret: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined };
  }
};

export const saveTidalCredentials = (creds: any) => {
  try {
    const { accessToken, refreshToken, expiresAt, countryCode, userId} = creds;

    // Save auth tokens separately
    if (accessToken && refreshToken && expiresAt) {
      localStorage.setItem(TIDAL_AUTH_KEY, JSON.stringify({ accessToken, refreshToken, expiresAt, countryCode, userId}));
    } else {
      localStorage.removeItem(TIDAL_AUTH_KEY);
    }
  } catch (e) {
    console.error('Erro ao salvar Tidal no LocalStorage', e);
  }
};


// Navidrome storage functions - backed by API + local cache
export const getNavidromeCredentials = () => {
  try {
    const data = localStorage.getItem(NAVIDROME_KEY);
    if (data) {
      const creds = JSON.parse(data);
      return {
        baseUrl: creds.baseUrl || '',
        user: creds.user || '',
        password: creds.password || '',
      };
    }
  } catch (e) {
    console.error('Erro ao carregar Navidrome do LocalStorage', e);
  }

  try {
    fetch(`${BACKEND_BASE_URL}/api/navidrome-settings`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const creds = {
          baseUrl: data.baseUrl || '',
          user: data.user || '',
          password: data.password || '',
        };
        try {
          localStorage.setItem(NAVIDROME_KEY, JSON.stringify(creds));
        } catch (e) {
          console.error('Erro ao cachear Navidrome no LocalStorage', e);
        }
      })
      .catch((e) => {
        console.error('Erro ao buscar Navidrome do backend', e);
      });
  } catch (e) {
    console.error('Erro ao iniciar fetch de Navidrome', e);
  }

  return { baseUrl: '', user: '', password: '' };
};

export const saveNavidromeCredentials = (creds: { baseUrl: string; user: string; password: string }) => {
  try {
    localStorage.setItem(NAVIDROME_KEY, JSON.stringify({ baseUrl: creds.baseUrl, user: creds.user, password: creds.password }));

    fetch(`${BACKEND_BASE_URL}/api/navidrome-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    }).catch(() => {});
  } catch (e) {
    console.error('Erro ao salvar Navidrome', e);
  }
};
