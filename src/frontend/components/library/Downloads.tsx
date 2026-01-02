import React, { useEffect, useState, useRef } from 'react';
import { NaviSong, TagGroup } from '../../../../types';
import SongTable from './SongTable';
import { BACKEND_BASE_URL } from '../../../core/config';
import { RotateCcw, Trash2 } from 'lucide-react';
import { tidalService }  from '../../services/tidalService';
import showToast from '../utils/toast';
import GroupTagModal from './GroupTagModal';
import { getStoredGroups } from '../../repository/metadata';
import { getUserState, setUserState } from '../../repository/userStates';
import { NAVI_DOWNLOAD_COLUMN_CONFIG } from './NaviConstants';


interface DownloadsProps {
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

export const NaviDownloads: React.FC<DownloadsProps> = ({ onPlayDownload, currentTrackId, isPlaying }) => {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed'>(() => {
    const saved = getUserState<any>('navi_downloads');
    return saved?.activeTab === 'completed' ? 'completed' : 'in_progress';
  });
  const [completedSongs, setCompletedSongs] = useState<NaviSong[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [groupModalSong, setGroupModalSong] = useState<NaviSong | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const groups = await getStoredGroups();
      setTagGroups(groups);
    })();
  }, []);

  const handleClearAll = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/downloads`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Erro ao limpar downloads: ${err.error || res.statusText}`, 'error');
        return;
      }
      setItems([]);
    } catch (e) {
      showToast(`Erro ao limpar downloads: ${e}`, 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/downloads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Erro ao remover download: ${err.error || res.statusText}`, 'error');
        return;
      }
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (e) {
      showToast(`Erro ao remover download: ${e}`, 'error');
    }
  };

  const handleRetry = async (song: any) => {
    const downloadFromTidal = async () => {
      const body = {
        creds: tidalService.getCredentials(),
        trackId: song.id,
        song: song,
      };
      const resp = await fetch(`${BACKEND_BASE_URL}/api/downloads/tidal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(`Erro ao tentar novamente: ${err.error || resp.statusText}`, 'error');
        throw new Error(err.error || 'Erro ao tentar novamente');
      }
    }

    if (song.contentType.includes('tidal')) {
      await downloadFromTidal();
    }

    fetchDownloads()
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/downloads`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Erro ao buscar downloads: ${err.error || res.statusText}`, 'error');
        return;
      } 
      const json = await res.json();
      setItems(json.items.reverse() || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchDownloads();
    const id = setInterval(fetchDownloads, 2000);
    return () => clearInterval(id);
  }, []);

  // Persist aba ativa da tela de downloads
  useEffect(() => {
    setUserState('navi_downloads', { activeTab });
  }, [activeTab]);

  const fetchCompleted = async () => {
    setLoadingCompleted(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/downloads/completed`);
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
        ext: it.ext,
        coverArt: undefined,
      }));
      setCompletedSongs(songs);

      // Em paralelo, buscar capas individuais via /completed-cover
      songs.forEach(async (song) => {
        if (!song.path) return;
        try {
          const coverRes = await fetch(`${BACKEND_BASE_URL}/api/downloads/completed-cover?path=${encodeURIComponent(song.path)}`);
          if (!coverRes.ok) return;
          const coverJson = await coverRes.json();
          const cover = coverJson.cover;
          if (!cover || !cover.buffer || !cover.buffer.data) return;

          const byteArray = new Uint8Array(cover.buffer.data as number[]);
          let binary = '';
          for (let i = 0; i < byteArray.length; i++) {
            binary += String.fromCharCode(byteArray[i]);
          }
          const base64 = btoa(binary);
          const coverArt = `data:${cover.mime};base64,${base64}`;

          setCompletedSongs((prev) => prev.map((s) =>
            s.id === song.id ? { ...s, coverArt } : s
          ));
        } catch {
          // ignora erro de capa individual
        }
      });
    } catch {
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
              ? 'text-indigo-400 border-indigo-500'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('in_progress')}
        >
          Em andamento
        </button>
        <button
          className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'completed'
              ? 'text-indigo-400 border-indigo-500'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          Preparo
        </button>
      </div>

      {activeTab === 'in_progress' && (
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-end mb-4">
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border border-red-500/60 text-red-400 hover:text-white hover:bg-red-600/80"
              >
                <Trash2 className="w-4 h-4" />
                Limpar tudo
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Nenhum download em andamento.
            </div>
          ) : (
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
                      <button
                        className="p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-300 transition-colors"
                        title="Remover este download"
                        onClick={() => handleDeleteItem(it.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-indigo-400" style={{ width: `${it.progress}%` }} />
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">{it.progress}% • {it.filename || ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="flex-1 bg-zinc-950 flex flex-col overflow-y-auto">
          {loadingCompleted ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Carregando downloads finalizados...
            </div>
          ) : completedSongs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Nenhum download finalizado encontrado.
            </div>
          ) : (
            <SongTable
              songs={completedSongs}
              onPlay={(s) => { if (onPlayDownload) onPlayDownload(s); }}
              currentTrackId={currentTrackId}
              defaultColumns={NAVI_DOWNLOAD_COLUMN_CONFIG}
              isPlaying={isPlaying}
              isNaviTableDownload={true}
              onGroupEdit={(song) => setGroupModalSong(song)}
              onAfterFinalize={fetchCompleted}
            />
          )}
        </div>
      )}

      {groupModalSong && (
        <GroupTagModal
          song={groupModalSong}
          groups={tagGroups}
          onClose={() => setGroupModalSong(null)}
          onUpdateComments={(newComments) => {
            // Atualiza comentário/grupo como o handleSaveEdit faz
            if (!groupModalSong.path) {
              setCompletedSongs(prev => prev.map(s => s.id === groupModalSong.id ? { ...s, comment: newComments } : s));
              return;
            }

            (async () => {
              try {
                const resp = await fetch(`${BACKEND_BASE_URL}/api/downloads/metadata`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: groupModalSong.id,
                    source: 'download',
                    path: groupModalSong.path,
                    metadata: { comments: newComments },
                  }),
                });

                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({}));
                  showToast(`Erro ao salvar tags: ${err.error || resp.statusText}`, 'error');
                  return;
                }

                setCompletedSongs(prev => prev.map(s => s.id === groupModalSong.id ? { ...s, comment: newComments } : s));
                showToast('Tags atualizadas com sucesso.', 'success');
              } catch (e: any) {
                showToast(`Erro ao salvar tags: ${e?.message || String(e)}`, 'error');
              }
            })();
          }}
        />
      )}
    </div>
  );
};

export default NaviDownloads;
