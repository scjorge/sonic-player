import { BACKEND_BASE_URL } from '../../core/config';
import { authService } from '../services/authService';

export interface AudioEditorPersistedStateDTO {
  tracks: any[];
  zoom: number;
  currentTime: number;
  selectedTrackId: string | null;
  globalSelection: { start: number; end: number; trackId: string } | null;
}

export async function getAudioEditorState(): Promise<AudioEditorPersistedStateDTO | null> {
  const token = authService.getToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE_URL}/audio-editor-state`, { headers });
  if (!res.ok) throw new Error('Falha ao carregar estado do editor de áudio');
  const json = await res.json();
  return (json && json.state) || null;
}

export async function saveAudioEditorState(state: AudioEditorPersistedStateDTO | null): Promise<void> {
  const token = authService.getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE_URL}/audio-editor-state`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error('Falha ao salvar estado do editor de áudio');
}
