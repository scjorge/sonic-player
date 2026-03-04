import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { genresService } from '../services/genres';

export const listGenres = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const genres = await genresService.list(req.user.id);
  return res.json(genres);
};

export const addGenre = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name é obrigatório' });
  }
  await genresService.add(req.user.id, name);
  return res.status(201).json({ name: name.trim() });
};

export const deleteGenre = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { name } = req.params;
  await genresService.remove(req.user.id, name);
  return res.status(204).send();
};
