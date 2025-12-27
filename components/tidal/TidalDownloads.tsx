import React, { useEffect, useState } from 'react';
import { TIDAL_DOWNLOAD_BACKEND_BASE_URL } from './tidalConstants';

interface DownloadItem {
  id: string;
  title: string;
  artist: string;
  progress: number;
  status: string;
  filename?: string;
}

const TidalDownloads: React.FC = () => {
  const [items, setItems] = useState<DownloadItem[]>([]);

  const fetchDownloads = async () => {
    try {
      const res = await fetch(`${TIDAL_DOWNLOAD_BACKEND_BASE_URL}/api/tidal/downloads`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.items || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchDownloads();
    const id = setInterval(fetchDownloads, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Downloads TIDAL</h3>
      {items.length === 0 && <div className="text-zinc-500">Nenhum download em andamento.</div>}
      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-white truncate max-w-[60ch]">{it.title}</div>
                <div className="text-xs text-zinc-500">{it.artist}</div>
              </div>
              <div className="text-xs text-zinc-400">{it.status}</div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-yellow-400" style={{ width: `${it.progress}%` }} />
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{it.progress}% • {it.filename || ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TidalDownloads;
