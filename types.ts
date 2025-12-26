
// Navidrome / Subsonic Types

export interface SubsonicResponse<T> {
  "subsonic-response": {
    status: "ok" | "failed";
    version: string;
    error?: { code: number; message: string };
    [key: string]: any;
  };
}

export interface NaviSong {
  id: string;
  title: string;
  album: string;
  artist: string;
  year?: number;
  coverArt?: string;
  duration?: number; // seconds
  path?: string;
  uri?: string;  
  // Novos campos para a tabela e modal detalhado
  genre?: string;
  comment?: string;
  isrc?: string;
  suffix?: string; // Formato (mp3, flac)
  bitRate?: number;
  samplingRate?: number;
  track?: number;
  discNumber?: number;
  contentType?: string;
  size?: number; // Bytes
  created?: string; // ISO Date
  albumId?: string;
  artistId?: string;
  type?: string; // 'music', 'video', etc
  isVideo?: boolean;
  bpm?: number;
  playCount?: number;
  lastPlayed?: string; // ISO Date
  userRating?: number; // 1-5
  averageRating?: number; // 1-5
  
  // Campos opcionais que podem não vir da API padrão, mas foram solicitados
  moods?: string;
  group?: string; // Grouping (TIT1)
  starred?: string; // Date string if starred, otherwise undefined
}

export interface NaviAlbum {
  id: string;
  name: string;
  artist: string;
  coverArt?: string;
  songCount: number;
  year?: number;
}

export interface NaviArtist {
  id: string;
  name: string;
  albumCount?: number;
  coverArt?: string;
}

export interface NaviPlaylist {
  id: string;
  name: string;
  songCount: number;
  duration?: number;
  created?: string;
  coverArt?: string;
}

// Player Types
export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  src: string; // Remote URL
  duration: number; // seconds
  sourceType: 'navidrome' | 'spotify' | 'spotify_preview';
}

// App Types

export interface MusicMetadata {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  trackNumber: string;
  comments: string;
}

export interface MusicFile {
  id: string;
  file: File;
  fileName: string;
  metadata: MusicMetadata;
  coverUrl: string | null;
}

export interface AISuggestion {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
}

export interface TagGroup {
  id: string;
  name: string;
  prefix: string;
  items: string[];
}

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  // New fields for user authentication
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds when the token expires
}

export interface TidalCredentials {
  clientId: string;
  clientSecret?: string;
}

// Extend Tidal credentials with auth tokens when available
export interface TidalAuth {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface NavidromeCredentials {
  baseUrl: string;
  user: string;
  password: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
    release_date?: string;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  track_number: number;
  uri: string;
}

export interface PaginatedSpotifyTracks {
  items: SpotifyTrack[];
  total: number;
}

