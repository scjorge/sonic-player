import { ColumnConfig } from '../library/SongTable';

// Defining ColumnConfig for Spotify, with less relevant columns hidden by default
export const SPOTIFY_COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'select', label: '', width: 50, visible: true, minWidth: 50 },
  { id: 'index', label: '#', width: 40, visible: true, minWidth: 30 },
  { id: 'cover', label: 'Capa', width: 80, visible: true, minWidth: 50 },
  { id: 'title', label: 'Título', width: 250, visible: true, minWidth: 100 },
  { id: 'artist', label: 'Artista', width: 200, visible: true, minWidth: 100 },
  { id: 'album', label: 'Álbum', width: 200, visible: true, minWidth: 100 },
  { id: 'year', label: 'Ano', width: 80, visible: true, minWidth: 60 },
  { id: 'duration', label: 'Duração', width: 80, visible: true, minWidth: 60 },
  { id: 'track', label: 'Track', width: 50, visible: false, minWidth: 50 },
  { id: 'download', label: 'Local', width: 70, visible: true, minWidth: 50 },
];
