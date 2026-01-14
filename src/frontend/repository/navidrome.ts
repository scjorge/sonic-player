
import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

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
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${BACKEND_BASE_URL}/navidrome`, { headers })
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

    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${BACKEND_BASE_URL}/navidrome`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(creds),
    }).catch(() => {});
  } catch (e) {
    console.error('Erro ao salvar Navidrome', e);
  }
};
