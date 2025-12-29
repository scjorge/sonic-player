import { Request, Response } from 'express';
import { tagGroupsService } from '../services/tagGroups';

export const listTagGroups = async (_req: Request, res: Response) => {
  const groups = await tagGroupsService.list();
  return res.json(groups);
};

export const createTagGroup = async (req: Request, res: Response) => {
  const { id, name, prefix, items } = req.body || {};
  if (!id || !name || !prefix) {
    return res.status(400).json({ error: 'id, name e prefix são obrigatórios' });
  }
  const created = await tagGroupsService.create({ id, name, prefix, items: items || [] });
  return res.status(201).json(created);
};

export const updateTagGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, prefix, items } = req.body || {};
  if (!name || !prefix) {
    return res.status(400).json({ error: 'name e prefix são obrigatórios' });
  }
  const updated = await tagGroupsService.update(id, { name, prefix, items: items || [] });
  if (!updated) {
    return res.status(404).json({ error: 'Grupo não encontrado' });
  }
  return res.json(updated);
};

export const deleteTagGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  await tagGroupsService.remove(id);
  return res.status(204).send();
};
