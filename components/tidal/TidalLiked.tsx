import React, { useState, useEffect } from 'react';
import { tidalService } from '../../services/tidalService';
import { NaviSong } from '../../types';
import SongTable from '../library/SongTable';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TIDAL_COLUMN_CONFIG } from './tidalConstants';

interface TidalLikedProps {
  onOpen: (song: NaviSong) => void;
  onNavigateToLibraryQuery?: (query: string) => void;
}

const TidalLiked: React.FC<TidalLikedProps> = ({ onOpen }) => {
  const [items, setItems] = useState<NaviSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [navidromeExistenceMap, setNavidromeExistenceMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!tidalService.isAuthenticated()) {
          setError('Você não está autenticado no TIDAL. Por favor, autentique-se nas configurações.');
          setItems([]);
          setTotal(0);
          return;
        }

        const offset = page * pageSize;
        const res = await tidalService.getFavoriteTracks(pageSize, offset);
        const items = res.items || [];
        setItems(items);
        setTotal(res.total || (items ? items.length : 0));

        // Check Navidrome existence for each favorite
        try {
          const checks = await Promise.all(items.map(async (song: NaviSong) => {
            const exists = await (await import('../../services/navidromeService')).navidromeService.checkIfSongExists(song.artist || '', song.title || '');
            return [song.id, exists] as [string, boolean];
          }));
          setNavidromeExistenceMap(new Map(checks));
        } catch (e) {
          console.error('Failed to check navidrome existence for tidal favorites', e);
          setNavidromeExistenceMap(new Map());
        }
      } catch (e: any) {
        console.error('Failed to load TIDAL favorites', e);
        const msg = e?.message || String(e) || 'Erro desconhecido ao buscar favoritos TIDAL.';
        setError(msg);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, pageSize]);

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /> Carregando favoritos...</div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-full text-red-500 p-6 text-center">
      <AlertCircle className="w-10 h-10 mb-4" />
      <p className="text-lg mb-2">Não foi possível carregar os favoritos do TIDAL.</p>
      <p className="text-sm text-zinc-300 mb-4 max-w-xl break-words">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => { setPage(0); setPageSize(50); setError(null); }} className="px-4 py-2 bg-yellow-500 text-black rounded">Tentar novamente</button>
        <button onClick={() => { window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'tidal' } })); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Ir para Configurações</button>
      </div>
    </div>
  );

  return (
    <div className="h-full">
      {items.length > 0 ? (
        <SongTable
          songs={items}
          onPlay={onOpen}
          page={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
          defaultColumns={TIDAL_COLUMN_CONFIG}
          isTidalTable={true}
          navidromeExistenceMap={navidromeExistenceMap}
          onNavigateToLibraryQuery={onNavigateToLibraryQuery}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-400">Nenhuma faixa favorita encontrada.</div>
      )}
    </div>
  );
};

export default TidalLiked;
