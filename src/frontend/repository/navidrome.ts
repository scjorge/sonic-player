
import { BACKEND_BASE_URL } from '../../core/config';

const NAVIDROME_KEY = 'sonictag_navidrome';


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
