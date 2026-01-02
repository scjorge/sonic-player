import { Request, Response } from 'express';
import { youtubeSettingsService } from '../services/youtubeSettings';

export const getYoutubeSettings = async (_req: Request, res: Response) => {
  const setting = await youtubeSettingsService.get();
  if (!setting) {
    return res.json({
      apiKey: '',
    });
  }
  return res.json({
    apiKey: setting.apiKey || '',
  });
};

export const saveYoutubeSettings = async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  const saved = await youtubeSettingsService.save({
    apiKey,
  });

  return res.json({
    apiKey: saved.apiKey || '',
  });
};

export const clearYoutubeSettings = async (_req: Request, res: Response) => {
  await youtubeSettingsService.clear();
  return res.status(204).send();
};
