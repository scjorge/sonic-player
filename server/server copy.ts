import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import cors from 'cors';
import { sanitizeQuery } from '../services/tools';
import { tidalService } from '../services/tidalService.ts';
import { TIDAL_QUALITY } from '../components/tidal/tidalConstants.ts';


const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const DOWNLOAD_DIR = process.env.TIDAL_DOWNLOAD_PATH || path.resolve(process.cwd(), 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// In-memory download registry
const downloads = new Map();


app.get('/api/tidal/downloads', (_req: any, res: any) => {
  const list = Array.from(downloads.values()).map(d => ({
    id: d.id,
    title: d.title,
    artist: d.artist,
    progress: d.progress,
    status: d.status,
    filename: d.filename,
  }));
  res.json({ items: list });
});

app.post('/api/tidal/download', async (req: any, res: any) => {
  try {
    const { trackId, creds, song } = req.body;
    if (!trackId || !creds || !song) return res.status(400).json({ error: 'trackId creds and song are required' });

    const id = Math.random().toString(36).slice(2, 10);
    const filename = sanitizeQuery(`${song.artist} - ${song.title}`);
    const outDir = DOWNLOAD_DIR;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const item = {
      id: id,
      title: song.title,
      artist: song.artist,
      progress: 0,
      status: 'queued',
      filename: path.basename(path.join(outDir, filename + '.tmp')),
      error: null,
    };
    downloads.set(id, item);

    // Start download asynchronously
    (async () => {
      try {
        item.status = 'starting';
        const manifest = await tidalService.getTidalPlaybackInfo(creds, trackId, TIDAL_QUALITY);
        const url = manifest.urls[0];
        item.status = 'downloading';

        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch stream: ' + resp.status);

        const total = Number(resp.headers.get('content-length')) || null;
        let downloaded = 0;

        const destFinal = path.join(outDir, filename + path.extname(new URL(url).pathname) || '.bin');
        const fileStream = fs.createWriteStream(destFinal);

        const reader = resp.body;
        for await (const chunk of reader) {
          fileStream.write(chunk);
          downloaded += chunk.length;
          if (total) item.progress = Math.round((downloaded / total) * 100);
          else item.progress = Math.min(99, item.progress + Math.round(chunk.length / 100000));
        }

        fileStream.close();
        item.progress = 100;
        item.status = 'completed';
        item.filename = path.basename(destFinal);
      } catch (err) {
        item.status = 'failed';
        item.error = String(err);
        console.error('Download failed', err);
      }
    })();
    return res.json({ id });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`TIDAL download server listening on ${PORT}, download dir: ${DOWNLOAD_DIR}`);
});
