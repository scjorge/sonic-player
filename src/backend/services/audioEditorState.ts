import { AppDataSource } from '../utils/db';
import { AudioEditorStateEntity } from '../entities/AudioEditorState';

export const audioEditorStateService = {
  async getState(): Promise<{ state: any | null; error: string | null }> {
    try {
      const repo = AppDataSource.getRepository(AudioEditorStateEntity);
      const row = await repo.findOne({ where: {} });
      if (!row) {
        return { state: null, error: null };
      }
      try {
        const parsed = JSON.parse(row.stateJson);
        return { state: parsed, error: null };
      } catch (e: any) {
        console.error('Failed to parse audio editor state JSON from DB', e);
        return { state: null, error: 'Estado salvo do editor está corrompido' };
      }
    } catch (e: any) {
      console.error('Failed to load audio editor state from DB', e);
      return { state: null, error: `Failed to load audio editor state: ${e?.message || 'Unknown error'}` };
    }
  },

  async saveState(state: any): Promise<{ error: string | null }> {
    try {
      const repo = AppDataSource.getRepository(AudioEditorStateEntity);
      let row = await repo.findOne({ where: {} });
      const stateJson = JSON.stringify(state ?? null);

      if (!row) {
        row = repo.create({ stateJson });
      } else {
        row.stateJson = stateJson;
      }

      await repo.save(row);
      return { error: null };
    } catch (e: any) {
      console.error('Failed to save audio editor state to DB', e);
      return { error: `Failed to save audio editor state: ${e?.message || 'Unknown error'}` };
    }
  },
};
