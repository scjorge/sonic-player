import { AppDataSource } from '../utils/db';
import { GeneralSettingsEntity } from '../entities/GeneralSettings';
import { NAVIDROME_SAVE_FORMAT_DEFAULT } from '../../core/config';


export const generalSettingsService = {
  async getGeneralSettings(userId: string): Promise<any> {
    try {
      const repo = AppDataSource.getRepository(GeneralSettingsEntity);
      let settings = await repo.findOne({ where: { userId } });

      // Set default if not exists
      if (!settings) {
        settings = repo.create({
          userId,
          navidromeSaveFormat: NAVIDROME_SAVE_FORMAT_DEFAULT
        });
        await repo.save(settings);
      }

      return settings;
    } catch (e) {
      console.error('Failed to load general settings from DB', e);
      return { error: `Failed to load general settings: ${e?.message || 'Unknown error'}` };
    }
  },

  async saveGeneralSettings(userId: string, navidromeSaveFormat: string) {
    try {
      const repo = AppDataSource.getRepository(GeneralSettingsEntity);
      let settings = await repo.findOne({ where: { userId } });
      if (!settings) {
        settings = repo.create({
          userId,
          navidromeSaveFormat: navidromeSaveFormat
        });
      } else {
        settings.navidromeSaveFormat = navidromeSaveFormat;
      }

      const saved = await repo.save(settings);
      return { settings: saved, error: null };
    } catch (e) {
      console.error('Failed to save general settings to DB', e);
      return { error: `Failed to save general settings: ${e?.message || 'Unknown error'}` };
    }
  }
};