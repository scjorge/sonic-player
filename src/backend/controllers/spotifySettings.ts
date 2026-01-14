import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { spotifySettingsService } from '../services/spotifySettings';

export const getSpotifySettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const setting = await spotifySettingsService.get(req.user.id);
  if (!setting) {
    return res.json({
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });
  }
  return res.json({
    clientId: setting.clientId || '',
    clientSecret: setting.clientSecret || '',
    redirectUri: setting.redirectUri || '',
    accessToken: setting.accessToken,
    refreshToken: setting.refreshToken,
    expiresAt: setting.expiresAt,
  });
};

export const saveSpotifySettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt } = req.body || {};
  const saved = await spotifySettingsService.save(req.user.id, {
    clientId,
    clientSecret,
    redirectUri,
    accessToken: accessToken ?? null,
    refreshToken: refreshToken ?? null,
    expiresAt: expiresAt ?? null,
  });

  return res.json({
    clientId: saved.clientId || '',
    clientSecret: saved.clientSecret || '',
    redirectUri: saved.redirectUri || '',
    accessToken: saved.accessToken,
    refreshToken: saved.refreshToken,
    expiresAt: saved.expiresAt,
  });
};

export const clearSpotifySettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await spotifySettingsService.clear(req.user.id);
  return res.status(204).send();
};
