
import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

const NAVIDROME_KEY = 'sonictag_navidrome';
const NAVIDROME_USE_SONIC_CREDS_KEY = 'sonictag_navidrome_use_sonic_creds';

// Verifica se deve usar credenciais do Sonic Player
export const shouldUseSonicCredentials = (): boolean => {
  try {
    const value = localStorage.getItem(NAVIDROME_USE_SONIC_CREDS_KEY);
    return value !== 'false'; // Por padrão, usa as credenciais do Sonic
  } catch {
    return true;
  }
};

export const setUseSonicCredentials = (use: boolean) => {
  localStorage.setItem(NAVIDROME_USE_SONIC_CREDS_KEY, use ? 'true' : 'false');
};

// Navidrome storage functions - backed by API + local cache
export const getNavidromeCredentials = () => {
  // Se deve usar credenciais do Sonic Player
  if (shouldUseSonicCredentials() && authService.hasSessionPassword()) {
    const currentUser = authService.getCurrentUserSync();
    const sessionPassword = authService.getSessionPassword();
    
    if (currentUser && sessionPassword) {
      // Tenta buscar apenas a baseUrl do backend (se foi configurada)
      let savedBaseUrl = '';
      try {
        const data = localStorage.getItem(NAVIDROME_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          savedBaseUrl = parsed.baseUrl || '';
        }
      } catch (e) {
        console.error('Erro ao carregar baseUrl do Navidrome', e);
      }

      // Se não há baseUrl salva, busca do backend
      if (!savedBaseUrl) {
        try {
          const token = authService.getToken();
          const headers: HeadersInit = {};
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          fetch(`${BACKEND_BASE_URL}/navidrome`, { headers })
            .then((res) => (res.ok ? res.json() : Promise.reject(res)))
            .then((data) => {
              savedBaseUrl = data.baseUrl || '';
              if (savedBaseUrl) {
                const creds = {
                  baseUrl: savedBaseUrl,
                  user: currentUser.username,
                  password: sessionPassword,
                };
                try {
                  localStorage.setItem(NAVIDROME_KEY, JSON.stringify(creds));
                } catch (e) {
                  console.error('Erro ao cachear Navidrome no LocalStorage', e);
                }
              }
            })
            .catch((e) => {
              console.error('Erro ao buscar Navidrome do backend', e);
            });
        } catch (e) {
          console.error('Erro ao iniciar fetch de Navidrome', e);
        }
      }

      // Retorna credenciais do Sonic Player
      return {
        baseUrl: savedBaseUrl,
        user: currentUser.username,
        password: sessionPassword,
      };
    }
  }

  // Caso contrário, usa credenciais customizadas salvas
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
    // Se está salvando credenciais customizadas diferentes das do Sonic Player
    const currentUser = authService.getCurrentUserSync();
    const isCustom = currentUser && (creds.user !== currentUser.username || creds.password !== authService.getSessionPassword());
    
    // Se são credenciais customizadas, desabilita o uso automático das credenciais do Sonic
    if (isCustom) {
      setUseSonicCredentials(false);
    }
    
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
