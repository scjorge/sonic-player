import React, { useState, useEffect } from 'react';
import { spotifyService } from '../../services/spotifyService';
import { NaviSong } from '../../types';
import SongTable from '../library/SongTable';
import { AlertCircle, Loader2, Check, X } from 'lucide-react'; // Import Check and X icons
import { SPOTIFY_COLUMN_CONFIG } from './spotifyConstants'; // Import the Spotify specific column config
import { navidromeService } from '../../services/navidromeService'; // Import navidromeService

interface LikedSongsProps {
  onPlay: (song: NaviSong) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onNavigateToLibraryQuery?: (query: string) => void;
}

const LikedSongs: React.FC<LikedSongsProps> = ({ onPlay, currentTrackId, isPlaying, onNavigateToLibraryQuery }) => {
  const [likedSongs, setLikedSongs] = useState<NaviSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0); // 0-indexed page
  const [pageSize, setPageSize] = useState(50); // Default page size
  const [totalItems, setTotalItems] = useState(0);
  const [navidromeExistenceMap, setNavidromeExistenceMap] = useState<Map<string, boolean>>(new Map()); // New state

  useEffect(() => {
    const fetchLikedSongs = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!spotifyService.isAuthenticated()) {
          setError("Você não está autenticado com o Spotify. Por favor, autentique-se nas configurações.");
          setLoading(false);
          return;
        }

        const offset = page * pageSize;
        const response = await spotifyService.getLikedSongs(offset, pageSize); // Use pagination params
        
        const mappedSongs: NaviSong[] = response.items.map(track => ({ // Use response.items
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          year: track.album.release_date ? parseInt(track.album.release_date.substring(0, 4)) : undefined,
          coverArt: track.album.images.length > 0 ? track.album.images[0].url : undefined,
          duration: Math.floor(track.duration_ms / 1000), // Convert ms to seconds
          path: track.external_urls.spotify, // Use Spotify URL as path for distinction
          track: track.track_number,
          uri: track.uri,
          // Defaulting other NaviSong properties
          genre: undefined,
          comment: undefined,
          suffix: undefined, 
          bitRate: undefined,
          samplingRate: undefined,
          discNumber: undefined,
          contentType: 'audio/spotify',
          size: undefined,
          created: undefined,
          albumId: undefined,
          artistId: undefined,
          type: 'music',
          isVideo: false,
          bpm: undefined,
          playCount: undefined,
          lastPlayed: undefined,
          userRating: undefined,
          averageRating: undefined,
          moods: undefined,
          group: undefined,
          starred: undefined, // Spotify liked songs are inherently "starred"
        }));
        setLikedSongs(mappedSongs);
        setTotalItems(response.total); // Set total items

        // Check Navidrome existence for each song
        const existenceChecks = await Promise.all(mappedSongs.map(async song => {
            const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
            return [song.id, exists] as [string, boolean];
        }));
        setNavidromeExistenceMap(new Map(existenceChecks));
      } catch (err) {
        console.error("Failed to fetch liked songs:", err);
        setError("Não foi possível carregar as músicas curtidas do Spotify. Verifique sua conexão ou autenticação.");
      } finally {
        setLoading(false);
      }
    };

    fetchLikedSongs();
  }, [page, pageSize]); // Add page and pageSize to dependency array

  const handlePlaySpotifySong = (song: NaviSong) => {
    onPlay(song);
    console.log("Playing Spotify song:", song.title);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0); // Reset to first page when page size changes
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-2 text-green-500" /> Carregando músicas curtidas...
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
    <div className="p-4 h-full">
      {likedSongs.length > 0 ? (
        <SongTable 
          songs={likedSongs} 
          onPlay={handlePlaySpotifySong} 
          defaultColumns={SPOTIFY_COLUMN_CONFIG} // Pass the Spotify specific column config
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isSpotifyTable={true}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          navidromeExistenceMap={navidromeExistenceMap}
          onNavigateToLibraryQuery={onNavigateToLibraryQuery}
        />
      ) : (
        <div className="flex justify-center items-center h-full text-zinc-400">
          <p>Nenhuma música curtida encontrada no Spotify.</p>
        </div>
      )}
    </div>
  );
};

export default LikedSongs;
