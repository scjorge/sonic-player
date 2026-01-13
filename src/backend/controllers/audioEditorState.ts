import { Request, Response } from 'express';
import { audioEditorStateService } from '../services/audioEditorState';

export async function getAudioEditorState(_req: Request, res: Response) {
  const result = await audioEditorStateService.getState();
  if (result.error) {
    return res.status(500).json({ error: result.error });
  }
  return res.json({ state: result.state });
}

export async function saveAudioEditorState(req: Request, res: Response) {
  const body = req.body || {};
  if (!('state' in body)) {
    return res.status(400).json({ error: 'state é obrigatório' });
  }

  const result = await audioEditorStateService.saveState(body.state);
  if (result.error) {
    return res.status(500).json({ error: result.error });
  }

  return res.json({ ok: true });
}
