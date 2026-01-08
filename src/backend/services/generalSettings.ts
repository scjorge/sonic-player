import { AppDataSource } from '../utils/db';
import { GeneralSettingsEntity } from '../entities/GeneralSettings';
import { NAVIDROME_SAVE_FORMAT } from '../../core/config';


export const generalSettingsService = {
  async getGeneralSettings() {
    try {
      const repo = AppDataSource.getRepository(GeneralSettingsEntity);
      let settings = await repo.findOne({ where: {} });

      // Set default if not exists
      if (!settings) {
        settings = repo.create({
            navidromeSaveFormat: NAVIDROME_SAVE_FORMAT
        });
        await repo.save(settings);
      }

      return settings;
    } catch (e) {
      console.error('Failed to load general settings from DB', e);
      return { navidromeSaveFormat: NAVIDROME_SAVE_FORMAT, error: 'Failed to load general settings' };
    }
  },

  async saveGeneralSettings(navidromeSaveFormat: string) {
    try {
      const repo = AppDataSource.getRepository(GeneralSettingsEntity);
      let settings = await repo.findOne({ where: {} });
      if (!settings) {
        settings = repo.create({ navidromeSaveFormat });
      } else {
        settings.navidromeSaveFormat = navidromeSaveFormat;
      }

      const saved = await repo.save(settings);
      return { navidromeSaveFormat: saved.navidromeSaveFormat || NAVIDROME_SAVE_FORMAT };
    } catch (e) {
      console.error('Failed to save general settings to DB', e);
      return { navidromeSaveFormat, error: 'Failed to save general settings' };
    }
  }
};