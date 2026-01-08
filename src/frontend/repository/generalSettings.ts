import { BACKEND_BASE_URL } from '../../core/config';

export interface GeneralSettings {
  navidromeSaveFormat: string;
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/general-settings`);
  if (!res.ok) throw new Error('Falha ao carregar configurações gerais');
  return res.json();
}

export async function saveGeneralSettings(settings: GeneralSettings): Promise<GeneralSettings> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/general-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error('Falha ao salvar configurações gerais');
  const result = await res.json();
  return result.settings;
}
