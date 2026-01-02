export interface YoutubeConfig {
  apiKey: string;
}

const YOUTUBE_KEY = 'sonictag_youtube';

export const getYoutubeConfig = async (): Promise<YoutubeConfig> => {
  try {
    const raw = localStorage.getItem(YOUTUBE_KEY);
    if (!raw) {
      return { apiKey: '' };
    }
    const parsed = JSON.parse(raw) as Partial<YoutubeConfig>;
    return { apiKey: parsed.apiKey || '' };
  } catch (e) {
    console.error('Erro ao carregar configuração do YouTube', e);
    return { apiKey: '' };
  }
};

export const saveYoutubeConfig = async (config: YoutubeConfig): Promise<void> => {
  try {
    localStorage.setItem(YOUTUBE_KEY, JSON.stringify({ apiKey: config.apiKey }));
  } catch (e) {
    console.error('Erro ao salvar configuração do YouTube', e);
  }
};

export const deleteYoutubeConfig = async (): Promise<void> => {
  try {
    localStorage.removeItem(YOUTUBE_KEY);
  } catch (e) {
    console.error('Erro ao apagar configuração do YouTube', e);
  }
};
