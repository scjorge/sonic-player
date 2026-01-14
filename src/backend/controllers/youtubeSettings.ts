import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { youtubeSettingsService } from '../services/youtubeSettings';

export const getYoutubeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const setting = await youtubeSettingsService.get(req.user.id);
  if (!setting) {
    return res.json({
      apiKey: '',
    });
  }
  return res.json({
    apiKey: setting.apiKey || '',
  });
};

export const saveYoutubeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { apiKey } = req.body || {};
  const saved = await youtubeSettingsService.save(req.user.id, {
    apiKey,
  });

  return res.json({
    apiKey: saved.apiKey || '',
  });
};

export const clearYoutubeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await youtubeSettingsService.clear(req.user.id);
  return res.status(204).send();
};
