import { AppDataSource } from '../utils/db';
import { YoutubeSetting } from '../entities/YoutubeSetting';

export const youtubeSettingsService = {
  async get(userId: string) {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    const existing = await repo.findOne({ where: { userId } });
    return existing || null;
  },

  async save(userId: string, payload: { apiKey?: string }) {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    let setting = await repo.findOne({ where: { userId } });
    
    if (!setting) {
      setting = repo.create({ userId });
    }

    setting.apiKey = payload.apiKey ?? setting.apiKey ?? null;

    return repo.save(setting);
  },

  async clear(userId: string) {
    const repo = AppDataSource.getRepository(YoutubeSetting);
    await repo.delete({ userId });
  },
};
