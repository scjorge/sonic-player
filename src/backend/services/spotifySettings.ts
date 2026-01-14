import { AppDataSource } from '../utils/db';
import { SpotifySetting } from '../entities/SpotifySetting';

export const spotifySettingsService = {
  async get(userId: string) {
    const repo = AppDataSource.getRepository(SpotifySetting);
    const existing = await repo.findOne({ where: { userId } });
    return existing || null;
  },

  async save(userId: string, payload: {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
        accessToken?: string | null;
        refreshToken?: string | null;
        expiresAt?: number | null;
    }) {
    const repo = AppDataSource.getRepository(SpotifySetting);
    let setting = await repo.findOne({ where: { userId } });
    
    if (!setting) {
      setting = repo.create({ userId });
    }

    setting.clientId = payload.clientId ?? setting.clientId ?? null;
    setting.clientSecret = payload.clientSecret ?? setting.clientSecret ?? null;
    setting.redirectUri = payload.redirectUri ?? setting.redirectUri ?? null;
    setting.accessToken = payload.accessToken ?? setting.accessToken ?? null;
    setting.refreshToken = payload.refreshToken ?? setting.refreshToken ?? null;
    setting.expiresAt = payload.expiresAt ?? setting.expiresAt ?? null;

    return repo.save(setting);
  },

  async clear(userId: string) {
    const repo = AppDataSource.getRepository(SpotifySetting);
    await repo.delete({ userId });
  },
};
