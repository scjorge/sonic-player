import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { audioEditorStateService } from '../services/audioEditorState';

export async function getAudioEditorState(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const result = await audioEditorStateService.getState(req.user.id);
  if (result.error) {
    return res.status(500).json({ error: result.error });
  }
  return res.json({ state: result.state });
}

export async function saveAudioEditorState(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const body = req.body || {};
  if (!('state' in body)) {
    return res.status(400).json({ error: 'state é obrigatório' });
  }

  const result = await audioEditorStateService.saveState(req.user.id, body.state);
  if (result.error) {
    return res.status(500).json({ error: result.error });
  }

  return res.json({ ok: true });
}
