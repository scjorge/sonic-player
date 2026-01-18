import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { navidromeSettingsService, navidromeTrackService } from '../services/navidrome';
import * as fs from 'fs';
import * as path from 'path';
import { NAVIDROME_MEDIA_PATH } from '../config';

export const getNavidromeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const setting = await navidromeSettingsService.get(req.user.id);
  if (!setting) {
    return res.json({ baseUrl: '', user: '', password: '' });
  }
  return res.json({ baseUrl: setting.baseUrl, user: setting.user, password: setting.password });
};

export const saveNavidromeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { baseUrl, user, password } = req.body || {};
  if (!baseUrl || !user || !password) {
    return res.status(400).json({ error: 'baseUrl, user e password são obrigatórios' });
  }
  const saved = await navidromeSettingsService.save(req.user.id, baseUrl, user, password);
  return res.json({ baseUrl: saved.baseUrl, user: saved.user, password: saved.password });
};

export const clearNavidromeSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  await navidromeSettingsService.clear(req.user.id);
  return res.status(204).send();
};

export const search4 = async (req: Request, res: Response) => {
  const { comment, genre, artist, year, limit, offset, musicFolderId } = req.query;
  const commentList: string[] = comment === undefined ? [] : Array.isArray(comment) ? comment.map(c => String(c)) : [String(comment)];
  const genreList: string[] = genre === undefined ? [] : Array.isArray(genre) ? genre.map(g => String(g)) : [String(genre)];
  const artistList: string[] = artist === undefined ? [] : Array.isArray(artist) ? artist.map(a => String(a)) : [String(artist)];
  const yearList: string[] = year === undefined ? [] : Array.isArray(year) ? year.map(y => String(y)) : [String(year)];
  const lim = limit ? parseInt(limit as string, 10) : 50;
  const off = offset ? parseInt(offset as string, 10) : 0;
  const tracks = navidromeTrackService.get(commentList, genreList, artistList, yearList, lim, off, String(musicFolderId));
  return res.json(tracks);
}

export const copyToUserDirectory = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { songIds } = req.body;

  if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
    return res.status(400).json({ error: 'songIds é obrigatório e deve ser um array' });
  }

  try {
    const result = await navidromeTrackService.copyToUserDirectory(req.user.username, songIds);
    if (result.errors && result.errors.length > 0) {
      return res.status(200).json({ errors: result.errors });
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao copiar músicas' });
  }
};