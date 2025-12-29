import { AppDataSource } from '../utils/db';
import { NavidromeSetting } from '../entities/NavidromeSetting';

export const navidromeSettingsService = {
  async get() {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    const existing = await repo.find();
    return existing[0] || null;
  },

  async save(baseUrl: string, user: string, password: string) {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    let setting = (await repo.find())[0];
    if (!setting) {
      setting = repo.create({ baseUrl, user, password });
    } else {
      setting.baseUrl = baseUrl;
      setting.user = user;
      setting.password = password;
    }
    return repo.save(setting);
  },

  async clear() {
    const repo = AppDataSource.getRepository(NavidromeSetting);
    await repo.clear();
  },
};
