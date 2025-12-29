import { Request, Response } from 'express';
import { spotifySettingsService } from '../services/spotifySettings';

export const getSpotifySettings = async (_req: Request, res: Response) => {
  const setting = await spotifySettingsService.get();
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

export const saveSpotifySettings = async (req: Request, res: Response) => {
  const { clientId, clientSecret, redirectUri, accessToken, refreshToken, expiresAt } = req.body || {};
  const saved = await spotifySettingsService.save({
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
