import { AppDataSource } from '../utils/db';
import { YoutubeSetting } from '../entities/YoutubeSetting';

export const youtubeSettingsService = {
  async get() {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    const existing = await repo.find();
    return existing[0] || null;
  },

  async save(payload: { apiKey?: string }) {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    let setting = (await repo.find())[0];
    if (!setting) {
      setting = repo.create();
    }

    setting.apiKey = payload.apiKey ?? setting.apiKey ?? null;

    return repo.save(setting);
  },

  async clear() {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    await repo.clear();
  },
};
