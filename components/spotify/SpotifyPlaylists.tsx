import React, { useState, useEffect } from 'react';
import { spotifyService } from '../../services/spotifyService';
import { NaviPlaylist } from '../../types';
import { List, Loader2, AlertCircle } from 'lucide-react';

interface SpotifyPlaylistsProps {
  onPlaylistClick: (playlist: NaviPlaylist) => void;
}

const SpotifyPlaylists: React.FC<SpotifyPlaylistsProps> = ({ onPlaylistClick }) => {
  const [playlists, setPlaylists] = useState<NaviPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!spotifyService.isAuthenticated()) {
          setError("Você não está autenticado com o Spotify. Por favor, autentique-se nas configurações.");
          setLoading(false);
          return;
        }
        const items = await spotifyService.getUserPlaylists();
        setPlaylists(items.map(item => ({ id: item.id, name: item.name })));
      } catch (err) {
        console.error("Failed to fetch spotify playlists:", err);
        setError("Não foi possível carregar as playlists do Spotify. Verifique sua conexão ou autenticação.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando playlists...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-red-500">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p className="text-lg">{error}</p>
        <p className="text-sm text-zinc-400 mt-2">Verifique as configurações do Spotify e se você está autenticado.</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="space-y-2">
        {playlists.map(playlist => (
          <button 
            key={playlist.id} 
            onClick={() => onPlaylistClick(playlist)}
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-md flex items-center justify-center">
              <List className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-white font-medium truncate">{playlist.name}</p>
            </div>
          </button>
        ))}
      </div>
      {playlists.length === 0 && (
        <div className="flex justify-center items-center h-full text-zinc-400">
          <p>Nenhuma playlist encontrada no Spotify.</p>
        </div>
      )}
    </div>
  );
};

export default SpotifyPlaylists;
