import React, { useState, useRef, useEffect } from 'react';
import { NaviSong } from '../../../../types';
import { Play, Pause, Clock, GripVertical, Settings2, Check, Image as ImageIcon, FileAudio, Disc, Activity, Zap, Filter, X, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square, AlignJustify, Heart, Info, Sparkles, TrendingUp, Star, Tags, Download } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';
import { tidalService } from '../../services/tidalService';
import showToast from '../utils/toast';
import { sanitizeQuery } from '../../../commons/tools';
import { BACKEND_BASE_URL } from '../../../core/config';
import { getStoredGenres } from '../../services/data';
import { NAVI_COLUMN_CONFIG } from './NaviConstants';

interface SongTableProps {
    songs: NaviSong[];
    onPlay: (song: NaviSong) => void;
    currentTrackId?: string | null;
    isPlaying?: boolean;
    // External data props
    availableArtists?: string[];
    availableGenres?: string[];
    onFilter?: (artist: string, genre: string, year: string) => void;
    // Pagination
    page?: number;
    pageSize?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    hasMore?: boolean;
    // Active Filter State
    activeArtist?: string;
    activeGenre?: string;
    activeYear?: string;
    // Quick List Feature
    activeQuickList?: 'newest' | 'recent' | 'frequent' | 'highest' | null;
    onQuickListChange?: (type: 'newest' | 'recent' | 'frequent' | 'highest') => void;
    // Search
    onSearch?: (query: string) => void;
    activeSearchQuery?: string;
    // Selection
    selectedIds?: string[];
    onSelect?: (id: string, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    // Actions
    onToggleFavorite?: (song: NaviSong) => void;
    onInfo?: (song: NaviSong) => void;
    onSetRating?: (id: string, rating: number) => void;
    onGroupEdit?: (song: NaviSong) => void; // Nova prop
    defaultColumns?: ColumnConfig[];
    isSpotifyTable?: boolean;
    isTidalTable?: boolean;
    isNaviTableDownload?: boolean;
    navidromeExistenceMap?: Map<string, boolean>;
    onNavigateToLibraryQuery?: (query: string) => void;
    onSearchTidalByTitle?: (query: string) => void;
    onSearchTidalByISRC?: (isrc: string) => void;
    autoFocusSearch?: boolean;
    navidromeConnected?: boolean | null;
    onOpenNavidromeSettings?: () => void;
    onAfterFinalize?: () => void;
}

// Removido 'play' dos IDs de coluna e adicionado 'userRating'
export type ColumnId = 'select' | 'index' | 'cover' | 'track' | 'title' | 'artist' | 'album' | 'genre' | 'userRating' | 'year' | 'duration' | 'comment' | 'mood' | 'group' | 'format' | 'filename' | 'discNumber' | 'bitRate' | 'samplingRate' | 'download' | 'isrc' | 'finalize';

type RowDensity = 'compact' | 'normal' | 'relaxed';

export interface ColumnConfig {
    id: ColumnId;
    label: string;
    width: number;
    visible: boolean;
    minWidth: number;
}

const formatTime = (seconds?: number) => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getFileName = (path?: string) => {
  if (!path) return '-';
  // Pega apenas o nome do arquivo após a última barra
  return path.split(/[\\/]/).pop() || path;
};

const SongTable: React.FC<SongTableProps> = ({
  songs,
  onPlay,
  currentTrackId,
  isPlaying,
  availableArtists = [],
  availableGenres = [],
  onFilter,
  page = 0,
  pageSize = 100,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  hasMore = true,
  activeArtist = '',
  activeGenre = '',
  activeYear = '',
  activeQuickList = null,
  onQuickListChange,
  onSearch,
  activeSearchQuery = '',
  onSearchTidalByTitle,
  onSearchTidalByISRC,
  autoFocusSearch,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onToggleFavorite,
  onInfo,
  onSetRating,
  onGroupEdit,
  defaultColumns,
  isSpotifyTable,
  isTidalTable,
  isNaviTableDownload,
  navidromeExistenceMap,
  onNavigateToLibraryQuery,
  navidromeConnected = null,
  onOpenNavidromeSettings,
  onAfterFinalize,
}) => {
  // --- STATE ---
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns || NAVI_COLUMN_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<ColumnId | null>(null);
  const [rowDensity, setRowDensity] = useState<RowDensity>('normal');
  const [editingCell, setEditingCell] = useState<{ songId: string; field: ColumnId } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [genreSuggestions, setGenreSuggestions] = useState<string[]>([]);
  const [searchInputValue, setSearchInputValue] = useState(activeSearchQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isTagEditMode, setIsTagEditMode] = useState(false);

  // Sync internal state with external prop if it changes (e.g. clear)
  useEffect(() => {
    setSearchInputValue(activeSearchQuery);
  }, [activeSearchQuery]);

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      try { searchInputRef.current.focus(); searchInputRef.current.select(); } catch { }
    }
  }, [autoFocusSearch]);


  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchInputValue);
    }
  };


  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        song: NaviSong | null;
    }>({ visible: false, x: 0, y: 0, song: null });


  // --- FILTER STATE ---
  // Initialize with active props so value persists on re-mount
  const [selectedArtist, setSelectedArtist] = useState<string>(activeArtist);
  const [selectedGenre, setSelectedGenre] = useState<string>(activeGenre);
  const [selectedYear, setSelectedYear] = useState<string>(activeYear);

  const handleApplyFilter = () => {
    if (onFilter) {
      onFilter(selectedArtist, selectedGenre, selectedYear);
      setShowFilter(false);
    }
  };

  const handleClearFilter = () => {
    setSelectedArtist('');
    setSelectedGenre('');
    setSelectedYear('');
    if (onFilter) {
      onFilter('', '', '');
    }
  };

  const activeFilterCount = (activeArtist ? 1 : 0) + (activeGenre ? 1 : 0) + (activeYear ? 1 : 0);

  // --- RESIZE LOGIC ---
  const resizingRef = useRef<{ startX: number; startWidth: number; columnId: ColumnId } | null>(null);

  const startResize = (e: React.MouseEvent, columnId: ColumnId, width: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { startX: e.clientX, startWidth: width, columnId };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { startX, startWidth, columnId } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(40, startWidth + diff);

    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, width: newWidth } : col
    ));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  // --- REORDER LOGIC ---
  const handleDragStart = (e: React.DragEvent, id: ColumnId) => {
    setDraggedColumnId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: ColumnId) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetId) return;

    const sourceIndex = columns.findIndex(c => c.id === draggedColumnId);
    const targetIndex = columns.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    setColumns(newColumns);
  };

  const handleDragEnd = () => {
    setDraggedColumnId(null);
  };

  // --- VISIBILITY LOGIC ---
  const toggleColumn = (id: ColumnId) => {
    setColumns(prev => prev.map(col =>
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };

  // --- CONTEXT MENU LOGIC ---
  const handleContextMenu = (e: React.MouseEvent, song: NaviSong) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      song: song
    });
  };

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // --- RENDER HELPERS ---
  const visibleColumns = columns.filter(c => c.visible);
  const isNavidromeLibraryTable = !isSpotifyTable && !isTidalTable && !isNaviTableDownload;

  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;
  const isLastPageDisabled = totalItems === 0 || page >= totalPages - 1;
  const isAllSelected = songs.length > 0 && songs.every(s => selectedIds.includes(s.id));

  const getRowPadding = () => {
    switch (rowDensity) {
      case 'compact': return 'py-1';
      case 'relaxed': return 'py-4';
      default: return 'py-2';
    }
  };

  const renderCell = (song: NaviSong, columnId: ColumnId, index: number) => {
    switch (columnId) {
      case 'select': {
        const isSelected = selectedIds.includes(song.id);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect && onSelect(song.id, !isSelected); }}
            className="w-full h-full flex items-center justify-center cursor-pointer"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-500" />
            ) : (
              <Square className="w-4 h-4 text-zinc-700 hover:text-zinc-500" />
            )}
          </button>
        )
      }
      case 'index':
        return <span className="text-zinc-500 font-mono text-xs w-full text-center block">{(page * pageSize) + index + 1}</span>;
      case 'track': return song.track || '-';
      case 'discNumber': return <span className="text-zinc-500">{song.discNumber || '-'}</span>;
      case 'cover': {
        let sizeClass = 'w-10 h-10';
        let iconClass = 'w-5 h-5 mt-2.5';
        let playIconSize = 20;

        if (rowDensity === 'compact') {
          sizeClass = 'w-8 h-8';
          iconClass = 'w-4 h-4 mt-2';
          playIconSize = 16;
        } else if (rowDensity === 'relaxed') {
          sizeClass = 'w-14 h-14';
          iconClass = 'w-6 h-6 mt-4';
          playIconSize = 28;
        }

        const isCurrentSong = currentTrackId === song.id;
        const showPause = isCurrentSong && isPlaying;

        return (
          <div
            className={`group/cover relative rounded-md bg-zinc-800 overflow-hidden border border-zinc-700 shadow-sm ${sizeClass} cursor-pointer flex-shrink-0`}
            onClick={(e) => { e.stopPropagation(); onPlay(song); }}
          >
            {/* Imagem de Fundo */}
            {song.coverArt ? (
              <img
                src={(song.contentType === 'audio/spotify' || song.contentType === 'audio/tidal') ? song.coverArt : navidromeService.getCoverArtUrl(song.coverArt)}
                alt=""
                className={`w-full h-full object-cover transition-opacity duration-200 ${isCurrentSong ? 'opacity-50' : 'group-hover/cover:opacity-50'}`}
                loading="lazy"
              />
            ) : (
              <ImageIcon className={`text-zinc-600 m-auto ${iconClass}`} />
            )}

            {/* Overlay com Ícone Play/Pause */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isCurrentSong ? 'bg-black/30 opacity-100' : 'bg-black/40 opacity-0 group-hover/cover:opacity-100'}`}>
              {showPause ? (
                <Pause className="text-white fill-white drop-shadow-md" size={playIconSize} />
              ) : (
                <Play className="text-white fill-white drop-shadow-md ml-0.5" size={playIconSize} />
              )}
            </div>
          </div>
        );
      }
      case 'title': return <span className={`font-medium ${currentTrackId === song.id ? (isSpotifyTable ? 'text-green-400' : isTidalTable ? 'text-yellow-400' : 'text-indigo-400') : 'text-zinc-100'}`}>{song.title}</span>;
      case 'artist': return song.artist;
      case 'album': return song.album;
      case 'isrc': return song.isrc;
      case 'userRating': {
        const rating = song.userRating || 0;
        return (
          <div className="flex items-center gap-0.5" title={`${rating} estrelas`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSetRating) {
                    // Se clicar na estrela que já é o rating atual, remove (seta para 0)
                    const newRating = rating === star ? 0 : star;
                    onSetRating(song.id, newRating);
                  }
                }}
                className="focus:outline-none hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-3.5 h-3.5 cursor-pointer transition-colors ${star <= rating
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-zinc-700 hover:text-yellow-500/50'
                  }`}
                />
              </button>
            ))}
          </div>
        );
      }
      case 'genre': return song.genre || '-';
      case 'year': return song.year || '-';
      case 'duration': return <span className="font-mono text-xs">{formatTime(song.duration)}</span>;
      case 'bitRate': return song.bitRate ? <span className="text-xs text-zinc-400">{song.bitRate} kbps</span> : '-';
      case 'samplingRate': return song.samplingRate ? <span className="text-xs text-zinc-400">{song.samplingRate / 1000} kHz</span> : '-';
      case 'comment': return <span className="text-zinc-500 italic truncate block w-full">{song.comment || '-'}</span>;
      case 'mood': return song.moods || '-';
      case 'group': return song.group || '-';
      case 'format': return <span className="text-xs uppercase bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{song.suffix || 'MP3'}</span>;
      case 'filename': return <span className="text-zinc-500 text-xs font-mono truncate" title={song.path}>{getFileName(song.path)}</span>;
      case 'download': {
        const existsInNavidrome = navidromeExistenceMap?.get(song.id);
        const handleNavigate = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!onNavigateToLibraryQuery) return;
          const artistPart = sanitizeQuery(song.artist).split(',')[0] || '';
          const titlePart = sanitizeQuery(song.title) || '';
          const q = `${artistPart} ${titlePart}`.trim();
          if (q) onNavigateToLibraryQuery(q);
        };

        return (
          <div className="flex items-center justify-center">
            {existsInNavidrome ? (
              onNavigateToLibraryQuery ? (
                <button
                  onClick={handleNavigate}
                  title="Abrir Biblioteca com esta busca"
                  className="p-1 rounded hover:bg-zinc-800"
                >
                  <Check className="w-4 h-4 text-green-500" />
                </button>
              ) : (
                <div title="Disponível Localmente">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )
            ) : (
              <div title="Não Disponível Localmente">
                <X className="w-4 h-4 text-red-500" />
              </div>
            )}
          </div>
        );
      }
      case 'finalize': {
        if (!isNaviTableDownload) return '-';
        const disabled = !song.genre || !song.path;
        return (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (disabled || !song.path) return;
              try {
                const resp = await fetch(`${BACKEND_BASE_URL}/api/downloads/finalize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path: song.path }),
                });
                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({}));
                  showToast(`Erro ao finalizar download: ${err.error || resp.statusText}`, 'error');
                  return;
                }
                showToast('Música movida para a pasta do Navidrome.', 'success');
                if (onAfterFinalize) onAfterFinalize();
              } catch (e: any) {
                showToast(`Erro ao finalizar download: ${e?.message || String(e)}`, 'error');
              }
            }}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${disabled
              ? 'border-zinc-700 text-zinc-600 cursor-not-allowed bg-zinc-900'
              : 'border-indigo-500 text-indigo-300 hover:bg-indigo-500 hover:text-black'
            }`}
            title={disabled ? 'Defina o gênero antes de finalizar' : 'Mover para a pasta do Navidrome'}
          >
            Finalizar
          </button>
        );
      }
      default: return '-';
    }
  };

  const editableTidalColumns: ColumnId[] = ['title', 'artist', 'album', 'genre', 'year', 'track', 'discNumber', 'isrc', 'comment'];
  const editableNavidromeColumns: ColumnId[] = ['title', 'artist', 'album', 'genre', 'year', 'track', 'discNumber', 'isrc', 'comment'];

  const getEditableValueFromSong = (song: NaviSong, columnId: ColumnId): string => {
    switch (columnId) {
      case 'title': return song.title || '';
      case 'artist': return song.artist || '';
      case 'album': return song.album || '';
      case 'genre': return song.genre || '';
      case 'year': return song.year != null ? String(song.year) : '';
      case 'track': return song.track != null ? String(song.track) : '';
      case 'discNumber': return song.discNumber != null ? String(song.discNumber) : '';
      case 'isrc': return song.isrc || '';
      case 'comment': return song.comment || '';
      default: return '';
    }
  };

  const applyLocalSongUpdate = (song: NaviSong, columnId: ColumnId, value: string) => {
    switch (columnId) {
      case 'title':
        song.title = value;
        break;
      case 'artist':
        song.artist = value;
        break;
      case 'album':
        song.album = value;
        break;
      case 'genre':
        song.genre = value;
        break;
      case 'year':
        song.year = value ? Number(value) || undefined : undefined;
        break;
      case 'track':
        song.track = value ? Number(value) || undefined : undefined;
        break;
      case 'discNumber':
        song.discNumber = value ? Number(value) || undefined : undefined;
        break;
      case 'isrc':
        song.isrc = value;
        break;
      case 'comment':
        song.comment = value;
        break;
      default:
        break;
    }
  };

  const buildMetadataFromEdit = (columnId: ColumnId, value: string) => {
    const metadata: any = {};
    switch (columnId) {
      case 'title':
        metadata.title = value;
        break;
      case 'artist':
        metadata.artists = value;
        metadata.albumArtist = value.split(',')[0] || value;
        break;
      case 'album':
        metadata.album = value;
        break;
      case 'genre':
        metadata.genre = value;
        break;
      case 'year':
        metadata.year = value ? Number(value) || undefined : undefined;
        break;
      case 'track':
        metadata.trackNumber = value ? Number(value) || undefined : undefined;
        break;
      case 'discNumber':
        metadata.discNumber = value ? Number(value) || undefined : undefined;
        break;
      case 'isrc':
        metadata.isrc = value;
        break;
      case 'comment':
        metadata.comments = value;
        break;
      default:
        break;
    }
    return metadata;
  };

  const handleStartEdit = async (song: NaviSong, columnId: ColumnId) => {
    const isDownloadCell = isNaviTableDownload && editableTidalColumns.includes(columnId);
    const isNavidromeCell = isNavidromeLibraryTable && isTagEditMode && editableNavidromeColumns.includes(columnId);

    if (!isDownloadCell && !isNavidromeCell) return;
    if (!song.path) {
      showToast('Caminho do arquivo não encontrado para esta música.', 'error');
      return;
    }
    if (columnId === 'genre') {
      try {
        const genres = await getStoredGenres();
        setGenreSuggestions(genres);
      } catch {
        // ignore storage errors
      }
    }
    setEditingCell({ songId: song.id, field: columnId });
    setEditingValue(getEditableValueFromSong(song, columnId));
  };

  const handleSaveEdit = async (valueOverride?: string) => {
    if (!editingCell) return;
    const currentSong = songs.find((s) => s.id === editingCell.songId);
    if (!currentSong || !currentSong.path) {
      showToast('Não foi possível localizar o arquivo para salvar as tags.', 'error');
      setEditingCell(null);
      return;
    }

    const valueToUse = valueOverride !== undefined ? valueOverride : editingValue;
    const metadata = buildMetadataFromEdit(editingCell.field, valueToUse);
    const source: 'download' | 'navidrome' = isNaviTableDownload ? 'download' : isNavidromeLibraryTable ? 'navidrome' : 'download';

    try {
      const resp = await fetch(`${BACKEND_BASE_URL}/api/downloads/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          id: currentSong.id,
          path: currentSong.path,
          metadata,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(`Erro ao salvar tags: ${err.error || resp.statusText}`, 'error');
        return;
      }

      applyLocalSongUpdate(currentSong, editingCell.field, valueToUse);
      showToast(`Tags atualizadas com sucesso.`, 'success');
    } catch (e: any) {
      showToast(`Erro ao salvar tags: ${e?.message || String(e)}`, 'error');
    } finally {
      setEditingCell(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      {/* Context Menu Portal/Div */}
      {contextMenu.visible && contextMenu.song && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[200px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 200)
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <div className="px-3 py-2 border-b border-zinc-800 mb-1">
            <p className="text-xs font-bold text-white truncate max-w-[180px]">{contextMenu.song.title}</p>
            <p className="text-[10px] text-zinc-500 truncate max-w-[180px]">{contextMenu.song.artist}</p>
          </div>

          <button
            onClick={() => { onPlay(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Play
          </button>

          {/* Spotify -> Search on TIDAL options */}
          {contextMenu.song.contentType === 'audio/spotify' && (
            <>
              <button
                onClick={() => { if (onSearchTidalByTitle) onSearchTidalByTitle(`${contextMenu.song.artist.split(",")[0]} ${contextMenu.song.title}`); setContextMenu({ ...contextMenu, visible: false }); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Buscar no TIDAL por título
              </button>
              <button
                onClick={() => { if (onSearchTidalByISRC && contextMenu.song!.isrc) onSearchTidalByISRC(contextMenu.song!.isrc); setContextMenu({ ...contextMenu, visible: false }); }}
                className={`w-full text-left px-3 py-2 text-sm ${contextMenu.song!.isrc ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white' : 'text-zinc-600 cursor-not-allowed'} flex items-center gap-2`}
                disabled={!contextMenu.song!.isrc}
                title={contextMenu.song!.isrc ? 'Buscar por ISRC' : 'ISRC não disponível'}
              >
                <Search className="w-4 h-4" /> Buscar no TIDAL por ISRC
              </button>
            </>
          )}

          {(!isSpotifyTable && !isTidalTable && !isNaviTableDownload && onToggleFavorite) && (
            <button
              onClick={() => { onToggleFavorite && onToggleFavorite(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              {contextMenu.song.starred ? (
                <>
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" /> Remover dos Favoritos
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" /> Adicionar aos Favoritos
                </>
              )}
            </button>
          )}

          {/* Option to open Group Tag Editor */}
          {onGroupEdit && (
            <button
              onClick={() => { onGroupEdit(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Tags className="w-4 h-4" /> Editar Grupos
            </button>
          )}

          {(!isSpotifyTable && !isTidalTable && !isNaviTableDownload && onInfo) && (
            <>
              <div className="border-t border-zinc-800 my-1"></div>

              <button
                onClick={() => { onInfo && onInfo(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                <Info className="w-4 h-4" /> Informações
              </button>
            </>
          )}
          {/* TIDAL download option */}
          {contextMenu.song.contentType === 'audio/tidal' && (
            <button
              onClick={async () => {
                setContextMenu({ ...contextMenu, visible: false });
                try {
                  const body = {
                    creds: tidalService.getCredentials(),
                    trackId: contextMenu.song!.id,
                    song: contextMenu.song,
                  };
                  const resp = await fetch(`${BACKEND_BASE_URL}/api/downloads/tidal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to queue download');
                  }
                  const json = await resp.json();
                  showToast('Download enfileirado no servidor (id: ' + json.id + ')', 'success');
                } catch (e){
                  console.error('TIDAL download request failed', e);
                  showToast('Falha ao iniciar download no servidor: ' + (e?.message || String(e)), 'error');
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end items-center p-2 border-b border-zinc-800 bg-zinc-900/50 gap-2 flex-shrink-0">
        {/* Search Input */}
        {onSearch && (
          <div className="relative group ml-2">
            <input
              type="text"
              ref={searchInputRef}
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar..."
              className={`w-40 sm:w-64 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 pl-8 focus:outline-none ${isSpotifyTable ? 'focus:border-green-500' : isTidalTable ? 'focus:border-yellow-500' : 'focus:border-indigo-500'} transition-all placeholder-zinc-600`}
            />
            <Search className={`w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 transform -translate-y-1/2 ${isSpotifyTable ? 'group-focus-within:text-green-500' : isTidalTable ? 'group-focus-within:text-yellow-500' : 'group-focus-within:text-indigo-500'} transition-colors`} />
          </div>
        )}
        {/* QUICK LIST BUTTONS & FILTER */}
        <div className="flex items-center gap-2 mr-auto">
          {onQuickListChange && (
            <>
              {/* FILTER BUTTON (Moved Here) */}
              {onFilter && (
                <div className="relative">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`
                                    flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border
                                    ${activeFilterCount > 0
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50'
                  : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                }
                                `}
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="bg-indigo-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {showFilter && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                      {/* Dropdown Aligned to Left */}
                      <div className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Filtrar Biblioteca</span>
                          <button
                            onClick={() => setShowFilter(false)}
                            className="text-zinc-500 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Artist Filter */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-500 font-medium">Artista</label>
                            <select
                              value={selectedArtist}
                              onChange={(e) => setSelectedArtist(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                            >
                              <option value="">Selecione um Artista...</option>
                              {availableArtists.map(artist => (
                                <option key={artist} value={artist}>{artist}</option>
                              ))}
                            </select>
                          </div>

                          {/* Genre Filter */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-500 font-medium">Gênero</label>
                            <select
                              value={selectedGenre}
                              onChange={(e) => setSelectedGenre(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                            >
                              <option value="">Selecione um Gênero...</option>
                              {availableGenres.map(genre => (
                                <option key={genre} value={genre}>{genre}</option>
                              ))}
                            </select>
                          </div>

                          {/* Year Filter */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-zinc-500 font-medium">Ano</label>
                            <input
                              type="number"
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
                              placeholder="Ex: 2024"
                            />
                          </div>

                          <div className="pt-2 flex gap-2">
                            <button
                              onClick={handleClearFilter}
                              className="flex-1 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={handleApplyFilter}
                              className="flex-1 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                            >
                              <Search className="w-3 h-3" />
                              Buscar
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mais Tocadas (Frequent) */}
              <button
                onClick={() => onQuickListChange('frequent')}
                className={`
                            flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border
                            ${activeQuickList === 'frequent'
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50'
              : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
            }
                        `}
                title="Mais Tocadas"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Mais Tocadas</span>
              </button>

              {/* Tocadas Recentemente (Recent Played) */}
              <button
                onClick={() => onQuickListChange('recent')}
                className={`
                            flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border
                            ${activeQuickList === 'recent'
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50'
              : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
            }
                        `}
                title="Tocadas Recentemente"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Tocadas</span>
              </button>

              {/* Adicionadas Recentemente (Newest - Antigo 'Recentes') */}
              <button
                onClick={() => onQuickListChange('newest')}
                className={`
                            flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border
                            ${activeQuickList === 'newest'
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50'
              : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
            }
                        `}
                title="Adicionadas Recentemente"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionadas</span>
              </button>


            </>
          )}
        </div>

        {/* COLUMNS BUTTON & TAG EDIT TOGGLE */}
        {isNavidromeLibraryTable && (
          <button
            onClick={() => setIsTagEditMode(!isTagEditMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${isTagEditMode
              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/60'
              : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
            }`}
            title="Habilitar edição de tags diretamente na tabela"
          >
            <Tags className="w-4 h-4" />
            Editar tags
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
            >
              <Settings2 className="w-4 h-4" />
              Colunas
            </button>

            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden flex flex-col">

                  {/* Density Settings */}
                  <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <AlignJustify className="w-3 h-3" />
                      Tamanho da Linha
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRowDensity('compact')}
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'compact' ? isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                      >
                        Peq.
                      </button>
                      <button
                        onClick={() => setRowDensity('normal')}
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'normal' ? isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                      >
                        Méd.
                      </button>
                      <button
                        onClick={() => setRowDensity('relaxed')}
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'relaxed' ? isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                      >
                        Grd.
                      </button>
                    </div>
                  </div>

                  {/* Column List */}
                  <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Visibilidade
                    </div>
                    {columns.map(col => (
                      <button
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center justify-between transition-colors"
                      >
                        {col.label || (col.id === 'select' ? 'Seleção' : col.id)}
                        {col.visible && <Check className={isSpotifyTable ? 'w-3.5 h-3.5 text-green-500' : isTidalTable ? 'w-3.5 h-3.5 text-yellow-500' : "w-3.5 h-3.5 text-indigo-500"} />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="min-w-full inline-block align-middle">
          {/* Headers */}
          <div className="sticky top-0 z-10 flex bg-zinc-900 border-b border-zinc-800 shadow-md">
            {visibleColumns.map((col) => (
              <div
                key={col.id}
                className={`
                            relative flex items-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900 flex-shrink-0
                            ${draggedColumnId === col.id ? 'opacity-50 bg-zinc-800' : ''}
                        `}
                style={{ width: col.width, minWidth: col.minWidth }}
                draggable={col.id !== 'select'}
                onDragStart={(e) => handleDragStart(e, col.id)}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragEnd={handleDragEnd}
              >
                {col.id === 'select' ? (
                  <button onClick={() => onSelectAll && onSelectAll(!isAllSelected)}>
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-700 hover:text-zinc-500" />
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {col.id !== 'index' && (
                      <GripVertical className="w-3 h-3 mr-2 cursor-move opacity-0 group-hover:opacity-50 text-zinc-600" />
                    )}
                    <span className="truncate select-none flex items-center gap-2">
                      {col.id === 'duration' ? <Clock className="w-3.5 h-3.5" /> :
                        col.id === 'cover' ? <ImageIcon className="w-3.5 h-3.5" /> :
                          col.id === 'filename' ? <FileAudio className="w-3.5 h-3.5" /> :
                            col.id === 'discNumber' ? <Disc className="w-3.5 h-3.5" /> :
                              col.id === 'bitRate' ? <Zap className="w-3.5 h-3.5" /> :
                                col.id === 'samplingRate' ? <Activity className="w-3.5 h-3.5" /> :
                                  col.id === 'userRating' ? <Star className="w-3.5 h-3.5" /> :
                                    col.label}
                    </span>
                  </div>
                )}

                {/* Resizer Handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition-colors z-20"
                  onMouseDown={(e) => startResize(e, col.id, col.width)}
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="bg-zinc-950 pb-20">
            {songs.map((song, index) => {
              const isSelected = selectedIds.includes(song.id);
              const showLoginPrompt = navidromeConnected === false && !isSpotifyTable;
              return (
                <div
                  key={song.id}
                  onContextMenu={(e) => handleContextMenu(e, song)}
                  className={`
                                flex border-b border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group
                                ${index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-950/50'}
                                ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : ''}
                                ${currentTrackId === song.id ? (isSpotifyTable ? 'bg-green-600/20' : isTidalTable ? 'bg-yellow-600/20' : 'bg-indigo-500/5') : ''}
                            `}
                >
                  {showLoginPrompt && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 text-sm text-yellow-200">
                      <div className="flex flex-col items-center gap-2">
                        <div>Conecte-se ao Navidrome nas configurações para acessar sua biblioteca local.</div>
                        {onOpenNavidromeSettings && (
                          <button onClick={(e) => { e.stopPropagation(); onOpenNavidromeSettings(); }} className="mt-2 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs">Ir para Configurações</button>
                        )}
                      </div>
                    </div>
                  )}
                  {visibleColumns.map(col => {
                    const isEditable =
                                            (isNaviTableDownload && editableTidalColumns.includes(col.id)) ||
                                            (isNavidromeLibraryTable && isTagEditMode && editableNavidromeColumns.includes(col.id));

                    const shouldEditOnClick = isNavidromeLibraryTable && isTagEditMode;
                    const shouldEditOnDoubleClick = isNaviTableDownload;
                    const isEditingThisCell =
                                            !!editingCell &&
                                            editingCell.songId === song.id &&
                                            editingCell.field === col.id;

                    const showGenreSuggestions =
                                            isEditingThisCell &&
                                            col.id === 'genre' &&
                                            genreSuggestions.length > 0;

                    const filteredSuggestions = showGenreSuggestions
                      ? genreSuggestions
                      : [];

                    return (
                      <div
                        key={col.id}
                        className={`px-4 text-sm text-zinc-400 flex ${showGenreSuggestions ? 'items-start overflow-visible whitespace-normal' : 'items-center overflow-hidden whitespace-nowrap'} flex-shrink-0 ${getRowPadding()} ${isEditable ? 'cursor-text' : ''}`}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        onClick={() => {
                          if (shouldEditOnClick && isEditable) handleStartEdit(song, col.id);
                        }}
                        onDoubleClick={() => {
                          if (shouldEditOnDoubleClick && isEditable) handleStartEdit(song, col.id);
                        }}
                      >
                        {isEditingThisCell ? (
                          col.id === 'genre' ? (
                            <div className="relative w-full">
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => handleSaveEdit()}
                                onKeyDown={handleEditKeyDown}
                                className="w-full bg-zinc-900 border border-indigo-500 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-0"
                              />
                              {filteredSuggestions.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-30 max-h-40 overflow-y-auto text-xs">
                                  {filteredSuggestions.map((genre) => (
                                    <button
                                      key={genre}
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-200"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setEditingValue(genre);
                                        handleSaveEdit(genre);
                                      }}
                                    >
                                      {genre}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveEdit()}
                              onKeyDown={handleEditKeyDown}
                              className="w-full bg-zinc-900 border border-indigo-500 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-0"
                            />
                          )
                        ) : (
                          renderCell(song, col.id, index)
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {songs.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Nenhuma música encontrada.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {onPageChange && (
        <div className="bg-zinc-900 border-t border-zinc-800 p-2 flex justify-end items-center gap-4 z-20 flex-shrink-0">

          {/* Page Size Selector */}
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              {!isSpotifyTable && !isTidalTable && !isNaviTableDownload && <option value="100">100</option>}
              {!isSpotifyTable && !isTidalTable && !isNaviTableDownload && <option value="200">200</option>}
              {!isSpotifyTable && !isTidalTable && !isNaviTableDownload && <option value="500">500</option>}
            </select>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              title="Primeira Página"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              title="Página Anterior"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {page > 0 && (
              <button
                onClick={() => onPageChange(page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
              >
                {page}
              </button>
            )}

            <button
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${isSpotifyTable ? 'bg-green-600 shadow-lg shadow-green-500/20' : isTidalTable ? 'bg-yellow-600 shadow-lg shadow-yellow-500/20' : 'bg-indigo-600 shadow-lg shadow-indigo-500/20'} text-white text-xs font-bold pointer-events-none`}
            >
              {page + 1}
            </button>

            {(hasMore || (totalItems > 0 && page < totalPages - 1)) && (
              <button
                onClick={() => onPageChange(page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
              >
                {page + 2}
              </button>
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={isLastPageDisabled && !hasMore}
              title="Próxima Página"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPageChange(totalPages - 1)}
              disabled={isLastPageDisabled}
              title="Última Página"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Empty div for spacing balance if needed or total count display */}
          <div className="text-xs text-zinc-500 font-mono hidden sm:block">
            {totalItems > 0 ? `${totalItems} total` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongTable;