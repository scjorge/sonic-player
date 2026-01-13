import { BACKEND_BASE_URL } from '../../core/config';

export interface AudioEditorPersistedStateDTO {
  tracks: any[];
  zoom: number;
  currentTime: number;
  selectedTrackId: string | null;
  globalSelection: { start: number; end: number; trackId: string } | null;
}

export async function getAudioEditorState(): Promise<AudioEditorPersistedStateDTO | null> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/audio-editor-state`);
  if (!res.ok) throw new Error('Falha ao carregar estado do editor de áudio');
  const json = await res.json();
  return (json && json.state) || null;
}

export async function saveAudioEditorState(state: AudioEditorPersistedStateDTO | null): Promise<void> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/audio-editor-state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error('Falha ao salvar estado do editor de áudio');
}
