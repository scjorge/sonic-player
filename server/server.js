import express from 'express';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import fetch from 'node-fetch';
import cors from 'cors';


const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const DOWNLOAD_DIR = process.env.TIDAL_DOWNLOAD_PATH || path.resolve(process.cwd(), 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// In-memory download registry
const downloads = new Map();

function createDownloadId() {
  return Math.random().toString(36).slice(2, 10);
}

app.get('/', (_req, res) => {
  res.json({ "status": "ok" });
});

app.get('/api/tidal/downloads', (_req, res) => {
  const list = Array.from(downloads.values()).map(d => ({ id: d.id, title: d.title, artist: d.artist, progress: d.progress, status: d.status, filename: d.filename }));
  res.json({ items: list });
});

app.post('/api/tidal/download', async (req, res) => {
  try {
    const { trackId, streamUrl, title, artist, accessToken, downloadPath } = req.body;
    if (!streamUrl && !trackId) return res.status(400).json({ error: 'trackId or streamUrl required' });

    const id = createDownloadId();
    const safeArtist = (artist || 'artist').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
    const safeTitle = (title || 'track').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
    const filename = `${safeArtist} - ${safeTitle}`;
    const outDir = downloadPath || DOWNLOAD_DIR;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const destPath = path.join(outDir, filename + '.tmp');

    const item = { id, title, artist, progress: 0, status: 'queued', filename: path.basename(destPath) };
    downloads.set(id, item);

    // Start download asynchronously
    (async () => {
      try {
        item.status = 'starting';
        // Determine stream url: if not provided, call TIDAL playback endpoint using accessToken
        let url = streamUrl;
        if (!url && trackId) {
          // Call tidal playbackinfo
          const resp = await fetch(`https://api.tidal.com/v1/tracks/${trackId}/playbackinfopostpaywall?playbackmode=STREAM&assetpresentation=FULL`, {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.tidal.v1+json' }
          });
          const data = await resp.json();
          const manifestText = Buffer.from(data.manifest, 'base64').toString('utf-8');
          const manifest = JSON.parse(manifestText);
          const first = Array.isArray(manifest.urls) ? manifest.urls.find(u => typeof u === 'string' || u.url || u.uri) || manifest.urls[0] : null;
          if (!first) throw new Error('No urls in manifest');
          url = typeof first === 'string' ? first : (first.url || first.uri);
        }

        if (!url) throw new Error('No stream url');

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
