import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

export interface GeneralSettings {
  navidromeSaveFormat: string;
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const token = authService.getToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE_URL}/general-settings`, { headers });
  if (!res.ok) throw new Error('Falha ao carregar configurações gerais');
  return res.json();
}

export async function saveGeneralSettings(settings: GeneralSettings): Promise<GeneralSettings> {
  const token = authService.getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE_URL}/general-settings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error('Falha ao salvar configurações gerais');
  const result = await res.json();
  return result.settings;
}
