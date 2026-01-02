import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { downloadService } from '../services/downloads';


export async function downloadTrackFromTidal(req: Request, res: Response) {
  let result: any
  const { trackId, creds, song } = req.body;
  if (!trackId || !creds || !song) return res.status(400).json({ error: 'trackId creds and song are required' });

  try {
    result = await downloadService.downloadTrackFromTidal(trackId, creds, song);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
  } catch (e: any) {
    return res.status(500).json({ id: e?.message || 'failed to download track from TIDAL' });
  }

  try {
    await downloadService.writeMetadata(result.path, song);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to write metadata' });
  }

  return res.json(result);
}

export async function getdownloads(_req: Request, res: Response) {
  try {
    const result = await downloadService.getdownloads();
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to get downloads' });
  }
}

export async function deleteDownload(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    downloadService.deleteDownloadItem(id);
    return res.json({ status: 'deleted', id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to delete download' });
  }
}

export async function clearDownloads(_req: Request, res: Response) {
  try {
    downloadService.clearAllDownloads();
    return res.json({ status: 'cleared' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to clear downloads' });
  }
}

export async function getCompletedDownloads(_req: Request, res: Response) {
  try {
    const result = await downloadService.getCompletedDownloads();
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to get completed downloads' });
  }
}

export async function getCoverDownloads(req: Request, res: Response) {
  const { path } = req.query;
  if (!path || typeof path !== 'string') return res.status(400).json({ error: 'path is required' });

  try {
    const result = await downloadService.getCoverDownloads(path);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to get cover downloads' });
  }
}

export async function writeMetadataParts(req: Request, res: Response) {
  const { id, source, path, metadata } = req.body;
  if (!id || !source || !path || !metadata) return res.status(400).json({ error: 'id, source, path, and metadata are required' });

  try {
    const result = await downloadService.writeMetadataParts(id, path, source, metadata);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to write metadata parts' });
  }
}

export async function writeCoverFromUrl(req: Request, res: Response) {
  const { id, source, path, coverUrl } = req.body;
  if (!id || !source || !path || !coverUrl) {
    return res.status(400).json({ error: 'id, source, path, and coverUrl are required' });
  }

  try {
    const cover = await downloadService.downloadCoverFromUrl(coverUrl);
    const result = await downloadService.writeMetadataParts(id, path, source, { cover });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to write cover from url' });
  }
}

export async function finalizeDownload(req: Request, res: Response) {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path is required' });

  try {
    const result = await downloadService.finalizeDownload(filePath);
    return res.json(result);
  } catch (e: any) {
    console.error('Failed to finalize TIDAL download', e);
    return res.status(500).json({ error: e?.message || 'failed to finalize download' });
  }
}

export async function streamDownload(req: Request, res: Response) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    const filePath = downloadService.resolveDownloadPath(id);
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
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to stream download' });
  }
}

export async function uploadPreparation(req: Request, res: Response) {
  try {
    const files = (req as any).files as any[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'no files uploaded' });
    }

    const items = files.map((f: any) => ({
      filename: f.filename,
      originalname: f.originalname,
      path: f.path,
      size: f.size,
      mimetype: f.mimetype,
    }));

    return res.json({ status: 'ok', count: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to upload preparation files' });
  }
}
