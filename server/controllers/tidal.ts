import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { tidalServerService } from '../services/tidal';


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

export async function getCompletedDownloads(_req: Request, res: Response) {
    const result = await tidalServerService.getCompletedDownloads();
    return res.json(result);
}

export async function streamDownload(req: Request, res: Response) {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id is required' });
    }

    const filePath = tidalServerService.resolveDownloadPath(id);
    if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.flac' ? 'audio/flac' : 'application/octet-stream';

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
            return res.status(416).end();
        }

        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mimeType,
        });
        file.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
        });
        fs.createReadStream(filePath).pipe(res);
    }
}
