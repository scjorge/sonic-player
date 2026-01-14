import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { tagGroupsService } from '../services/tagGroups';

export const listTagGroups = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const groups = await tagGroupsService.list(req.user.id);
  return res.json(groups);
};

export const createTagGroup = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { id, name, prefix, items } = req.body || {};
  if (!id || !name || !prefix) {
    return res.status(400).json({ error: 'id, name e prefix são obrigatórios' });
  }
  const created = await tagGroupsService.create(req.user.id, { id, name, prefix, items: items || [] });
  return res.status(201).json(created);
};

export const updateTagGroup = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { id } = req.params;
  const { name, prefix, items } = req.body || {};
  if (!name || !prefix) {
    return res.status(400).json({ error: 'name e prefix são obrigatórios' });
  }
  const updated = await tagGroupsService.update(req.user.id, id, { name, prefix, items: items || [] });
  if (!updated) {
    return res.status(404).json({ error: 'Grupo não encontrado' });
  }
  return res.json(updated);
};

export const deleteTagGroup = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const { id } = req.params;
  await tagGroupsService.remove(req.user.id, id);
  return res.status(204).send();
};
