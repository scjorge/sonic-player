import { Request, Response } from 'express';
import { recogniseFromFile } from '../services/shazam';

export async function recogniseWithShazam(req: Request, res: Response) {
  const { path: filePath, navidrome_id: navidrome_id} = req.body || {};

  if (!filePath) {
    return res.status(400).json({ error: 'path is required' });
  }

  try {
    const matches = await recogniseFromFile(filePath, navidrome_id);
    return res.json({ matches });
  } catch (e: any) {
    console.error('Shazam recognise failed', e);
    return res.status(500).json({ error: e?.message || 'failed to recognise track with Shazam' });
  }
}
