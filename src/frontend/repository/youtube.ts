import { BACKEND_BASE_URL } from '../../core/config';

export interface YoutubeConfig {
  apiKey: string;
}

export const getYoutubeConfig = async (): Promise<YoutubeConfig> => {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`);
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
    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${BACKEND_BASE_URL}/youtube-settings`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Erro ao apagar configuração do YouTube', err.error || res.statusText);
    }
  } catch (e) {
    console.error('Erro ao apagar configuração do YouTube', e);
  }
};
