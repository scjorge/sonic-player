import React, { useState, useEffect } from 'react';
import { spotifyService } from '../../services/spotifyService';
import { NaviPlaylist } from '../../../types';
import { List, Loader2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

interface SpotifyPlaylistsProps {
  onPlaylistClick: (playlist: NaviPlaylist) => void;
}

interface PlaylistNode {
  playlist?: NaviPlaylist;
  children: { [key: string]: PlaylistNode };
}

const nestPlaylists = (playlists: NaviPlaylist[]): { [key: string]: PlaylistNode } => {
    const root: PlaylistNode = { children: {} };

    playlists.forEach(p => {
        let current = root;
        p.name.split('/').forEach((part, i, arr) => {
            current.children[part] = current.children[part] || { children: {} };
            current = current.children[part];
            if (i === arr.length - 1) {
                current.playlist = p;
            }
        });
    });

    return root.children;
};

const PlaylistNodeComponent: React.FC<{ name: string; node: PlaylistNode; onPlaylistClick: (playlist: NaviPlaylist) => void; level: number }> = ({ name, node, onPlaylistClick, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = Object.keys(node.children).length > 0;

  const handleRowClick = () => {
    if (node.playlist) {
      onPlaylistClick(node.playlist);
    } else if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(hasChildren) {
      setIsOpen(!isOpen);
    }
  }

  return (
    <div>
      <div 
        className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
        style={{ paddingLeft: `${0.6 + level * 1.2}rem` }}
        onClick={handleRowClick}
      >
        <button onClick={handleChevronClick} className="p-1 -ml-1 rounded-full hover:bg-zinc-700">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="w-10 h-10 bg-zinc-800 rounded-md flex items-center justify-center flex-shrink-0">
          <List className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-white text-sm truncate">{name}</p>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {Object.entries(node.children).map(([childName, childNode]) => (
            <PlaylistNodeComponent key={childName} name={childName} node={childNode} onPlaylistClick={onPlaylistClick} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const SpotifyPlaylists: React.FC<SpotifyPlaylistsProps> = ({ onPlaylistClick }) => {
  const [nestedPlaylists, setNestedPlaylists] = useState<{ [key: string]: PlaylistNode }>({});
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
        const playlists = items.map(item => ({ id: item.id, name: item.name }));
        setNestedPlaylists(nestPlaylists(playlists));
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
        <Loader2 className="w-8 h-8 animate-spin mr-2 text-green-500" /> Carregando playlists...
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
        {Object.entries(nestedPlaylists).map(([name, node]) => (
          <PlaylistNodeComponent key={name} name={name} node={node} onPlaylistClick={onPlaylistClick} level={0} />
        ))}
      </div>
      {Object.keys(nestedPlaylists).length === 0 && (
        <div className="flex justify-center items-center h-full text-zinc-400">
          <p>Nenhuma playlist encontrada no Spotify.</p>
        </div>
      )}
    </div>
  );
};

export default SpotifyPlaylists;