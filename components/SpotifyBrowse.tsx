
import React, { useState, useEffect } from 'react';
import { SpotifyTrack, SpotifyCredentials } from '../types';
import { spotifyService } from '../services/spotifyService';
import { getSpotifyCredentials } from '../services/data';
import { Search, Music, Play, ExternalLink, AlertCircle, Loader2, Disc } from 'lucide-react';

interface SpotifyBrowseProps {
    onPreview: (track: SpotifyTrack) => void;
}

const SpotifyBrowse: React.FC<SpotifyBrowseProps> = ({ onPreview }) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<SpotifyCredentials | null>(null);

  useEffect(() => {
    const c = getSpotifyCredentials();
    if (c.clientId && c.clientSecret) {
        setCreds(c);
        loadInitial();
    }
  }, []);

  const loadInitial = async () => {
      setLoading(true);
      const initial = await spotifyService.getNewReleases();
      setTracks(initial);
      setLoading(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const results = await spotifyService.searchTracks(query);
    setTracks(results);
    setLoading(false);
  };

  if (!creds) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="p-4 bg-yellow-500/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
        </div>
        <h3 className="text-xl font-bold text-white">Configuração Necessária</h3>
        <p className="text-zinc-500 max-w-md">
            Você precisa configurar seu Client ID e Client Secret nas configurações antes de navegar no Spotify.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header / Search */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
          <form onSubmit={handleSearch} className="max-w-2xl relative group">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="O que você quer ouvir no Spotify?"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-full py-3 px-12 text-white focus:outline-none focus:border-green-500 transition-all placeholder-zinc-600"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-green-500 transition-colors" />
              {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 animate-spin" />}
          </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {tracks.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                  <Music className="w-16 h-16 mb-4 opacity-10" />
                  <p>Busque por artistas, músicas ou álbuns.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tracks.map(track => (
                      <div key={track.id} className="group bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800/60 transition-all hover:border-green-500/30 flex flex-col">
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-4 shadow-lg">
                              <img 
                                src={track.album.images[0]?.url} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                alt={track.name}
                              />
                              <button 
                                onClick={() => track.preview_url && onPreview(track)}
                                disabled={!track.preview_url}
                                className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity ${!track.preview_url ? 'cursor-not-allowed' : ''}`}
                              >
                                  <div className="bg-green-500 p-3 rounded-full text-black shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                      <Play className="w-6 h-6 fill-current" />
                                  </div>
                              </button>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate text-sm" title={track.name}>{track.name}</h4>
                              <p className="text-zinc-500 text-xs truncate mb-1">{track.artists.map(a => a.name).join(', ')}</p>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                                      {track.album.release_date?.split('-')[0]}
                                  </span>
                                  <a 
                                    href={track.external_urls.spotify} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="ml-auto text-zinc-500 hover:text-green-500 transition-colors"
                                    title="Abrir no Spotify"
                                  >
                                      <ExternalLink className="w-4 h-4" />
                                  </a>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};

export default SpotifyBrowse;
