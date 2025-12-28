import React, { useEffect, useState } from 'react';
import { NaviSong } from '../../types';
import SongTable from '../library/SongTable';
import { TIDAL_COLUMN_DOWNLOAD_CONFIG, TIDAL_DOWNLOAD_BACKEND_BASE_URL } from './tidalConstants';
import { RotateCcw } from 'lucide-react';
import { tidalService }  from '../../services/tidalService';
import showToast from '../utils/toast';

interface TidalDownloadsProps {
  onPlayDownload?: (song: NaviSong) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
}

interface DownloadItem {
  id: string;
  title: string;
  artist: string;
  progress: number;
  status: string;
  filename?: string;
}

export const TidalDownloads: React.FC<TidalDownloadsProps> = ({ onPlayDownload, currentTrackId, isPlaying }) => {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed'>('in_progress');
  const [completedSongs, setCompletedSongs] = useState<NaviSong[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const handleRetry = async (song: any) => {
    const body = {
          creds: tidalService.getCredentials(),
          trackId: song.id,
          song: song,
      };
      const resp = await fetch(`${TIDAL_DOWNLOAD_BACKEND_BASE_URL}/api/tidal/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
      });
      if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          showToast(`Erro ao tentar novamente: ${err.error || resp.statusText}`, 'error');
          throw new Error(err.error || 'Erro ao tentar novamente');
      }
      fetchDownloads()
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch(`${TIDAL_DOWNLOAD_BACKEND_BASE_URL}/api/tidal/downloads`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.items.reverse() || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchDownloads();
    const id = setInterval(fetchDownloads, 2000);
    return () => clearInterval(id);
  }, []);

  const fetchCompleted = async () => {
    setLoadingCompleted(true);
    try {
      const res = await fetch(`${TIDAL_DOWNLOAD_BACKEND_BASE_URL}/api/tidal/downloads/completed`);
      if (!res.ok) {
        setCompletedSongs([]);
        return;
      }
      const json = await res.json();
      const items = (json.items || []) as any[];
      const songs: NaviSong[] = items.map((it) => ({
        id: it.id,
        title: it.title,
        album: it.album,
        artist: it.artist,
        year: it.year,
        genre: it.genre,
        comment: it.comment,
        isrc: it.isrc,
        suffix: it.suffix,
        track: it.track,
        discNumber: it.discNumber,
        duration: it.duration,
        path: it.path,
        contentType: it.contentType,
      }));
      setCompletedSongs(songs);
    } catch (e) {
      setCompletedSongs([]);
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompleted();
    }
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-4 border-b border-zinc-800 bg-zinc-950/80 flex gap-2">
        <button
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'in_progress'
              ? 'text-yellow-400 border-yellow-500'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('in_progress')}
        >
          Em andamento
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'text-yellow-400 border-yellow-500'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          Finalizados
        </button>
      </div>

      {activeTab === 'in_progress' && (
        <div className="flex-1 p-6 overflow-y-auto">
          {items.length === 0 && (
            <div className="text-zinc-500">Nenhum download em andamento.</div>
          )}
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-white truncate max-w-[60ch]">{it.title}</div>
                    <div className="text-xs text-zinc-500">{it.artist}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{it.status}</span>
                    {it.status === 'failed' && (
                      <button
                        className="p-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        title="Tentar novamente"
                        onClick={() => handleRetry(it)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${it.progress}%` }} />
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">{it.progress}% • {it.filename || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="flex-1 bg-zinc-950">
          {loadingCompleted ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
              Carregando downloads finalizados...
            </div>
          ) : completedSongs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
              Nenhum download finalizado encontrado.
            </div>
          ) : (
            <SongTable
              songs={completedSongs}
              onPlay={(s) => { if (onPlayDownload) onPlayDownload(s); }}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              defaultColumns={TIDAL_COLUMN_DOWNLOAD_CONFIG}
              isTidalTableDownload={true}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TidalDownloads;
