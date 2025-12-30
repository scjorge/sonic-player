import { Request, Response } from 'express';
import { navidromeSettingsService, navidromeTrackService } from '../services/navidrome';

export const getNavidromeSettings = async (_req: Request, res: Response) => {
  const setting = await navidromeSettingsService.get();
  if (!setting) {
    return res.json({ baseUrl: '', user: '', password: '' });
  }
  return res.json({ baseUrl: setting.baseUrl, user: setting.user, password: setting.password });
};

export const saveNavidromeSettings = async (req: Request, res: Response) => {
  const { baseUrl, user, password } = req.body || {};
  if (!baseUrl || !user || !password) {
    return res.status(400).json({ error: 'baseUrl, user e password são obrigatórios' });
  }
  const saved = await navidromeSettingsService.save(baseUrl, user, password);
  return res.json({ baseUrl: saved.baseUrl, user: saved.user, password: saved.password });
};

export const clearNavidromeSettings = async (_req: Request, res: Response) => {
  await navidromeSettingsService.clear();
  return res.status(204).send();
};

export const search4 = async (req: Request, res: Response) => {
  const { comment, genre, artist, year, limit, offset } = req.query;
  const commentList: string[] = comment === undefined ? [] : Array.isArray(comment) ? comment.map(c => String(c)) : [String(comment)];
  const genreList: string[] = genre === undefined ? [] : Array.isArray(genre) ? genre.map(g => String(g)) : [String(genre)];
  const artistList: string[] = artist === undefined ? [] : Array.isArray(artist) ? artist.map(a => String(a)) : [String(artist)];
  const yearList: string[] = year === undefined ? [] : Array.isArray(year) ? year.map(y => String(y)) : [String(year)];
  const lim = limit ? parseInt(limit as string, 10) : 50;
  const off = offset ? parseInt(offset as string, 10) : 0;
  const tracks = navidromeTrackService.get(commentList, genreList, artistList, yearList, lim, off);
  return res.json(tracks);
}