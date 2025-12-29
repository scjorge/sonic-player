import React from 'react';
import { X, List, Plus, Trash2 } from 'lucide-react';
import { NaviPlaylist } from '../../../../types';

interface PlaylistSelectorModalProps {
  playlists: NaviPlaylist[];
  mode: 'add' | 'remove';
  onClose: () => void;
  onSelect: (playlistId: string) => void;
}

const PlaylistSelectorModal: React.FC<PlaylistSelectorModalProps> = ({ playlists, mode, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
        
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 sticky top-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {mode === 'add' ? (
              <Plus className="w-5 h-5 text-indigo-500" />
            ) : (
              <Trash2 className="w-5 h-5 text-red-500" />
            )}
            {mode === 'add' ? 'Adicionar à Playlist' : 'Remover da Playlist'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-2 custom-scrollbar flex-1">
          {playlists.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Nenhuma playlist disponível.
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => onSelect(playlist.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-left group"
                >
                  <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700 group-hover:border-zinc-600">
                    <List className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-zinc-200 font-medium truncate">{playlist.name}</h3>
                    <p className="text-xs text-zinc-500">{playlist.songCount} músicas</p>
                  </div>
                  {mode === 'add' ? (
                    <Plus className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-zinc-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistSelectorModal;