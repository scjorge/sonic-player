import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

export interface YoutubeConfig {
  apiKey: string;
}

export const getYoutubeConfig = async (): Promise<YoutubeConfig> => {
  try {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, { headers });
    if (!res.ok) {
      console.error('Erro ao carregar configuração do YouTube', res.statusText);
      return { apiKey: '' };
    }
    const json = await res.json().catch(() => ({}));
    return { apiKey: json.apiKey || '' };
  } catch (e) {
    console.error('Erro ao carregar configuração do YouTube', e);
    return { apiKey: '' };
  }
};

export const saveYoutubeConfig = async (config: YoutubeConfig): Promise<void> => {
  try {
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ apiKey: config.apiKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Erro ao salvar configuração do YouTube', err.error || res.statusText);
    }
  } catch (e) {
    console.error('Erro ao salvar configuração do YouTube', e);
  }
};

export const deleteYoutubeConfig = async (): Promise<void> => {
  try {
    const token = authService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Erro ao apagar configuração do YouTube', err.error || res.statusText);
    }
  } catch (e) {
    console.error('Erro ao apagar configuração do YouTube', e);
  }
};
