import React, { useState, useEffect } from 'react';
import { spotifyService } from '../services/spotifyService';
import { SpotifyTrack, NaviSong } from '../types';
import SongTable from './SongTable';
import { AlertCircle, Loader2 } from 'lucide-react';

const LikedSongs: React.FC = () => {
  const [likedSongs, setLikedSongs] = useState<NaviSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const spotifyTracks = await spotifyService.getLikedSongs();
        const mappedSongs: NaviSong[] = spotifyTracks.map(track => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          year: track.album.release_date ? parseInt(track.album.release_date.substring(0, 4)) : undefined,
          coverArt: track.album.images.length > 0 ? track.album.images[0].url : undefined,
          duration: Math.floor(track.duration_ms / 1000), // Convert ms to seconds
          path: track.external_urls.spotify, // Use Spotify URL as path for distinction
          // Defaulting other NaviSong properties
          genre: undefined,
          comment: undefined,
          suffix: 'spotify', 
          bitRate: undefined,
          samplingRate: undefined,
          track: undefined,
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
      } catch (err) {
        console.error("Failed to fetch liked songs:", err);
        setError("Não foi possível carregar as músicas curtidas do Spotify. Verifique sua conexão ou autenticação.");
      } finally {
        setLoading(false);
      }
    };

    fetchLikedSongs();
  }, []);

  const handlePlaySpotifySong = (song: NaviSong) => {
    // Implement Spotify specific play logic here
    // For now, let's just open the spotify link
    if (song.path) {
      window.open(song.path, '_blank');
    }
    console.log("Playing Spotify song:", song.title);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando músicas curtidas...
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
      <h2 className="text-2xl font-bold text-white mb-4">Minhas Músicas Curtidas do Spotify</h2>
      {likedSongs.length > 0 ? (
        <SongTable 
          songs={likedSongs} 
          onPlay={handlePlaySpotifySong} 
          // Other props can be added if needed, e.g., currentTrackId, isPlaying
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
