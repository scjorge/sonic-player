import React, { useState, useEffect } from 'react';
import { NaviSong } from '../../../types';
import { tidalService } from '../../services/tidalService';
import { navidromeService } from '../../services/navidromeService';
import SongTable from '../library/SongTable';
import { TIDAL_COLUMN_CONFIG } from './tidalConstants';
import { AlertCircle } from 'lucide-react';

interface TidalBrowseProps {
  onOpen?: (song: NaviSong) => void;
  onNavigateToLibraryQuery?: (query: string) => void;
  initialQuery?: string;
  autoFocus?: boolean;
  currentTrackId?: string | null;
  isPlaying?: boolean;
}

const TidalBrowse: React.FC<TidalBrowseProps> = ({ onOpen, onNavigateToLibraryQuery, initialQuery, autoFocus, currentTrackId, isPlaying }) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<NaviSong[]>([]);
  const [navidromeExistenceMap, setNavidromeExistenceMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const c = tidalService.getCredentials();
    if (c && c.clientId && c.clientSecret) {
      setConfigured(true);
    }
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      setPage(0);
      doSearch(initialQuery, 0, pageSize);
    }
  }, [initialQuery]);

  const doSearch = async (q: string, p = 0, size = pageSize) => {
    if (!q.trim()) {
      setTracks([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const offset = p * size;
      const res = await tidalService.searchTracks(q, size, offset);
      const items = res.items || [];
      setTracks(items);
      setTotal(res.total || (items ? items.length : 0));

      // Check Navidrome existence for each returned track
      try {
        const checks = await Promise.all(items.map(async (song: NaviSong) => {
          const exists = await navidromeService.checkIfSongExists(song.artist || '', song.title || '');
          return [song.id, exists] as [string, boolean];
        }));
        setNavidromeExistenceMap(new Map(checks));
      } catch (e) {
        console.error('Failed to check navidrome existence for tidal results', e);
        setNavidromeExistenceMap(new Map());
      }
    } catch (err) {
      console.error('Tidal search failed', err);
      setTracks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(0);
    doSearch(q, 0, pageSize);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    doSearch(query, p, pageSize);
  };

  const handlePageSizeChange = (s: number) => {
    setPageSize(s);
    setPage(0);
    doSearch(query, 0, s);
  };

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="p-4 bg-yellow-500/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
        </div>
        <h3 className="text-xl font-bold text-white">Configuração Necessária</h3>
        <p className="text-zinc-500 max-w-md">
            Você precisa configurar seu Client ID e Client Secret do TIDAL nas configurações antes de navegar.
        </p>
      </div>
    );
  }

  if (!tidalService.isAuthenticated()) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="text-zinc-300 mb-4">Sessão TIDAL não autenticada.</div>
          <div className="text-zinc-400 mb-6">Autentique-se nas configurações do TIDAL para usar a busca.</div>
          <div className="flex gap-3">
              <button onClick={() => { window.location.hash = '#/settings'; }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
        <SongTable
          songs={tracks}
          onPlay={(s) => { if (onOpen) onOpen(s); }}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onSearch={handleSearch}
          activeSearchQuery={query}
          autoFocusSearch={!!autoFocus}
          page={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          defaultColumns={TIDAL_COLUMN_CONFIG}
          isTidalTable={true}
          navidromeExistenceMap={navidromeExistenceMap}
          onNavigateToLibraryQuery={onNavigateToLibraryQuery}
        />
    </div>
  );
};

export default TidalBrowse;
