import path from 'path';
import fs from 'fs';
import { Shazam } from 'node-shazam';

export interface ShazamMatchSummary {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  isrc?: string;
  coverArt?: string;
}

export async function recogniseFromFile(filePath: string): Promise<ShazamMatchSummary[]> {
  if (!filePath) {
    throw new Error('File path is required');
  }

  let resolved = filePath;
  if (!path.isAbsolute(resolved)) {
    resolved = path.resolve(process.cwd(), resolved);
  }

  if (!fs.existsSync(resolved)) {
    throw new Error('File not found for Shazam');
  }

  const shazam = new Shazam();
  const result: any = await shazam.recognise(resolved);

  const matches: ShazamMatchSummary[] = [];

  const pushFromTrack = (track: any, fallbackId: string) => {
    if (!track) return;

    const summary: ShazamMatchSummary = {
      id: String(track.key || track.id || fallbackId),
      title: track.title,
      artist: track.subtitle,
      coverArt: track.images?.coverart || track.images?.background,
    };

    if (Array.isArray(track.sections)) {
      for (const section of track.sections) {
        if (!section || !Array.isArray(section.metadata)) continue;
        for (const meta of section.metadata) {
          const label = String(meta.title || meta.key || '').toLowerCase();
          const value = String(meta.text || meta.value || '');
          summary.isrc = track.isrc;
          if (!value) continue;
          if (!summary.album && (label.includes('album'))) summary.album = value;
          if (!summary.year && (label.includes('year') || label.includes('release'))) {
            const yearMatch = value.match(/(19\d{2}|20\d{2})/);
            summary.year = yearMatch ? yearMatch[1] : value;
          }
        }
      }
    }

    matches.push(summary);
  };

  if (result?.track) {
    pushFromTrack(result.track, 'primary');
  }

//   if (Array.isArray(result?.matches) && result.matches.length > 0) {
//     result.matches.forEach((m: any, idx: number) => {
//       const track = m.track || m;
//       pushFromTrack(result.track, `match-${idx}`);
//     });
//   } else if (result?.track) {
//     console.log('Shazam found a single track match');
//     pushFromTrack(result.track, 'primary');
//   }

  if (matches.length === 0) {
    return [];
  }

  return matches;
}
