import { Request, Response } from 'express';
import { genresService } from '../services/genres';

export const listGenres = async (_req: Request, res: Response) => {
  const genres = await genresService.list();
  return res.json(genres);
};

export const addGenre = async (req: Request, res: Response) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name é obrigatório' });
  }
  await genresService.add(name);
  return res.status(201).json({ name: name.trim() });
};

export const deleteGenre = async (req: Request, res: Response) => {
  const { name } = req.params;
  await genresService.remove(name);
  return res.status(204).send();
};
