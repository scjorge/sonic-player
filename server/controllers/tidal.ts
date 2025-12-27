import { Request, Response } from 'express';
import { tidalServerService } from '../services/tidal.ts';


export async function downloadTrack(req: Request, res: Response) {
    const { trackId, creds, song } = req.body;
    if (!trackId || !creds || !song) return res.status(400).json({ error: 'trackId creds and song are required' });

    const result = await tidalServerService.downloadTrack(trackId, creds, song);

    return res.json(result);
}

export async function getdownloads(_req: Request, res: Response) {
    const result = await tidalServerService.getdownloads();
    return res.json(result);
}