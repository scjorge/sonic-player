import React, { useState, useRef, useEffect } from 'react';
import { NaviSong } from '../../../types';
import { Play, Pause, Clock, GripVertical, Settings2, Check, Image as ImageIcon, FileAudio, Disc, Activity, Zap, X, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare, Square, AlignJustify, Heart, Info, Sparkles, TrendingUp, Star, Tags, Download, Trash2, Upload, Shield, Copy } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';
import { tidalService } from '../../services/tidalService';
import showToast from '../utils/toast';
import { getAudioEditorState as apiGetAudioEditorState, saveAudioEditorState as apiSaveAudioEditorState } from '../../repository/audioEditor';
import { sanitizeQuery } from '../../../commons/tools';
import { BACKEND_BASE_URL } from '../../../core/config';
import { getStoredGenres } from '../../repository/metadata';
import { NAVI_COLUMN_CONFIG } from './NaviConstants';
import { getUserState, setUserState } from '../../repository/userStates';
import { authService } from '../../services/authService';

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
  onOpenGroupFilter?: () => void;
  isGroupFilterActive?: boolean;
  groupFilterSelection?: string[];
  isNaviSongsView?: boolean;
  defaultColumns?: ColumnConfig[];
  isSpotifyTable?: boolean;
  isTidalTable?: boolean;
  isYoutubeTable?: boolean;
  isNaviTableDownload?: boolean;
  isNaviPlaylistView?: boolean;
  isNaviFavoritesView?: boolean;
  navidromeExistenceMap?: Map<string, boolean>;
  onNavigateToLibraryQuery?: (query: string) => void;
  onSearchTidalByTitle?: (query: string) => void;
  onSearchTidalByISRC?: (isrc: string) => void;
  autoFocusSearch?: boolean;
  navidromeConnected?: boolean | null;
  onOpenNavidromeSettings?: () => void;
  onAfterFinalize?: () => void;
  onReorderNaviPlaylist?: (fromIndex: number, toIndex: number) => void;
  onMasterModeChange?: () => void;
}

// Removido 'play' dos IDs de coluna e adicionado 'userRating'
export type ColumnId = 'select' | 'index' | 'cover' | 'track' | 'title' | 'combinedTitle' | 'artist' | 'album' | 'genre' | 'userRating' | 'year' | 'duration' | 'comment' | 'mood' | 'group' | 'format' | 'filename' | 'discNumber' | 'bitRate' | 'samplingRate' | 'download' | 'isrc' | 'finalize';

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
  isGroupFilterActive,
  onOpenGroupFilter,
  groupFilterSelection = [],
  isNaviSongsView = false,
  defaultColumns,
  isSpotifyTable,
  isTidalTable,
  isYoutubeTable,
  isNaviTableDownload,
  navidromeExistenceMap,
  onNavigateToLibraryQuery,
  navidromeConnected = null,
  onOpenNavidromeSettings,
  onAfterFinalize,
  isNaviPlaylistView,
  isNaviFavoritesView,
  onReorderNaviPlaylist,
  onMasterModeChange,
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
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isTagEditMode, setIsTagEditMode] = useState(false);
  const [isMasterMode, setIsMasterMode] = useState(() => {
    const saved = getUserState<any>('navi_songs');
    return saved?.masterMode ?? false;
  });

  // Initialize master mode on mount
  useEffect(() => {
    const saved = getUserState<any>('navi_songs');
    const initialMode = saved?.masterMode ?? false;
    navidromeService.setMasterMode(initialMode);
  }, []);

  const [convertState, setConvertState] = useState<{ open: boolean; song: NaviSong | null; loading: boolean }>({ open: false, song: null, loading: false });
  const [deleteState, setDeleteState] = useState<{ open: boolean; song: NaviSong | null; loading: boolean }>({ open: false, song: null, loading: false });
  const [uploadState, setUploadState] = useState<{ active: boolean; progress: number; totalFiles: number; }>(
    { active: false, progress: 0, totalFiles: 0 }
  );
  const [shazamState, setShazamState] = useState<{
    open: boolean;
    loading: boolean;
    error?: string | null;
    song: NaviSong | null;
    matches: {
      id: string;
      title?: string;
      artist?: string;
      album?: string;
      year?: string;
      isrc?: string;
      coverArt?: string;
    }[];
    selectedId?: string;
    previewUrl?: string | null;
    previewLoading?: boolean;
  }>({ open: false, loading: false, error: null, song: null, matches: [], selectedId: undefined, previewUrl: null, previewLoading: false });

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

  // Upload de arquivos para a pasta de preparo (tabela de downloads Navidrome)
  const handleUploadPreparationFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    // permite reenvio dos mesmos arquivos
    e.target.value = '';

    try {
      const totalFiles = files.length;
      setUploadState({ active: true, progress: 0, totalFiles });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND_BASE_URL}/downloads/upload-preparation`);

        xhr.upload.onprogress = (event: ProgressEvent) => {
          if (!event.lengthComputable) return;
          const percent = (event.loaded / event.total) * 100;
          setUploadState(prev => ({ ...prev, progress: percent }));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const err = JSON.parse(xhr.responseText || '{}');
              reject(new Error(err.error || xhr.statusText || 'Erro ao fazer upload'));
            } catch {
              reject(new Error(xhr.statusText || 'Erro ao fazer upload'));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Falha de rede durante o upload'));
        };

        xhr.send(formData);
      });

      showToast('Upload concluído. Atualizando lista de preparo...', 'success');
      if (onAfterFinalize) {
        onAfterFinalize();
      }
    } catch (error: any) {
      showToast(`Erro ao fazer upload: ${error?.message || String(error)}`, 'error');
    } finally {
      setUploadState({ active: false, progress: 0, totalFiles: 0 });
    }
  };

  const handleUploadPreparationClick = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  // Estado do espectrograma com suporte a zoom/pan
  const [spectrogramState, setSpectrogramState] = useState<{
    open: boolean;
    loading: boolean;
    error: string | null;
    imagePath: string | null;
    song: NaviSong | null;
    width: number;
    height: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    isPanning: boolean;
  }>({
    open: false,
    loading: false,
    error: null,
    imagePath: null,
    song: null,
    width: 2048,
    height: 1024,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
  });


  const handleAddToEditor = async (song: NaviSong) => {
    try {
      const currentState = await apiGetAudioEditorState();

      const baseState = currentState && Array.isArray(currentState.tracks)
        ? currentState
        : {
          tracks: [] as any[],
          zoom: 100,
          currentTime: 0,
          selectedTrackId: null as string | null,
          globalSelection: null as { start: number; end: number; trackId: string } | null,
        };

      const originType: 'preparo' | 'library' = isNaviTableDownload ? 'preparo' : 'library';
      const contentType = (song as any).contentType || (isNaviTableDownload ? 'audio/preparation' : 'audio/library');

      const newTrackId = `ext-track-${Date.now()}-${Math.random()}`;

      const newTrack = {
        id: newTrackId,
        name: song.title || 'Sem título',
        audioUrl: '',
        volume: 1,
        muted: false,
        startOffset: 0,
        duration: song.duration || 5,
        originalDuration: song.duration || 5,
        regions: [] as any[],
        originType,
        songId: song.id,
        contentType,
      };

      const updatedState = {
        ...baseState,
        tracks: [...baseState.tracks, newTrack],
        selectedTrackId: newTrackId,
        currentTime: 0,
        globalSelection: null,
      };

      await apiSaveAudioEditorState(updatedState as any);

      showToast('Faixa adicionada ao editor de áudio', 'success');
    } catch (e: any) {
      console.error('Erro ao adicionar faixa ao editor', e);
      showToast(`Erro ao adicionar ao editor: ${e?.message || String(e)}`, 'error');
    }
  };


  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    song: NaviSong | null;
  }>({ visible: false, x: 0, y: 0, song: null });

  // Drag & drop de linhas (somente playlist Navidrome)
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  const [isResizingSpectrogram, setIsResizingSpectrogram] = useState(false);

  const handleSpectrogramResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSpectrogram(true);
  };

  useEffect(() => {
    if (!isResizingSpectrogram) return;

    const handleMove = (e: MouseEvent) => {
      setSpectrogramState(prev => {
        const maxWidth = window.innerWidth - 64; // margem
        const maxHeight = window.innerHeight - 120;
        const newWidth = Math.min(Math.max(480, e.clientX - 32), maxWidth);
        const newHeight = Math.min(Math.max(300, e.clientY - 80), maxHeight);
        return { ...prev, width: newWidth, height: newHeight };
      });
    };

    const handleUp = () => {
      setIsResizingSpectrogram(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingSpectrogram]);

  const resetSpectrogramView = () => {
    setSpectrogramState(prev => ({
      ...prev,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      isPanning: false,
    }));
  };

  const handleSpectrogramWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!spectrogramState.imagePath) return;
    e.preventDefault();

    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;

    setSpectrogramState(prev => {
      const newZoom = Math.min(Math.max(1, prev.zoom * zoomFactor), 10);
      return { ...prev, zoom: newZoom };
    });
  };

  const handleSpectrogramMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return; // apenas botão esquerdo para pan
    e.preventDefault();
    if (!spectrogramState.imagePath) return;
    setSpectrogramState(prev => ({ ...prev, isPanning: true }));
  };

  useEffect(() => {
    if (!spectrogramState.isPanning) return;

    const start = { x: 0, y: 0 };
    let lastX = 0;
    let lastY = 0;

    const handleMove = (e: MouseEvent) => {
      if (!spectrogramState.isPanning) return;
      if (start.x === 0 && start.y === 0) {
        start.x = e.clientX;
        start.y = e.clientY;
      }
      const dx = e.clientX - (lastX || start.x);
      const dy = e.clientY - (lastY || start.y);
      lastX = e.clientX;
      lastY = e.clientY;

      setSpectrogramState(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
    };

    const handleUp = () => {
      setSpectrogramState(prev => ({ ...prev, isPanning: false }));
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [spectrogramState.isPanning]);


  // --- FILTER STATE ---
  // Initialize with active props so value persists on re-mount
  const [selectedArtist, setSelectedArtist] = useState<string>(activeArtist);
  const [selectedGenre, setSelectedGenre] = useState<string>(activeGenre);
  const [selectedYear, setSelectedYear] = useState<string>(activeYear);

  const activeFilterCount = (activeArtist ? 1 : 0) + (activeGenre ? 1 : 0) + (activeYear ? 1 : 0);
  const isAnyFilterActive = (activeFilterCount > 0) || !!isGroupFilterActive;

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
  const isNavidromeLibraryTable = !isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload;

  // Persist master mode state
  useEffect(() => {
    if (isNavidromeLibraryTable) {
      setUserState('navi_songs', { masterMode: isMasterMode });
      // Also update the service
      navidromeService.setMasterMode(isMasterMode);
    }
  }, [isMasterMode, isNavidromeLibraryTable]);

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
                src={(song.contentType === 'audio/spotify' || song.contentType === 'audio/tidal' || song.contentType === 'audio/preparation' || song.contentType === 'audio/youtube') ? song.coverArt : navidromeService.getCoverArtUrl(song.coverArt)}
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
      case 'combinedTitle': {
        const isCurrent = currentTrackId === song.id;
        const titleColor = isCurrent
          ? (isSpotifyTable ? 'text-green-400' : isTidalTable ? 'text-yellow-400' : isYoutubeTable ? 'text-red-400' : 'text-indigo-400')
          : 'text-zinc-100';

        if (song.artist && song.album) {
          return (
            <div className="flex flex-col leading-tight">
              <span className={`font-medium ${titleColor}`}>{song.title}</span>
              <span className="text-xs text-zinc-400 mt-0.5">{song.artist} | {song.album}</span>
            </div>
          );
        }
        if (song.artist) {
          return (
            <div className="flex flex-col leading-tight">
              <span className={`font-medium ${titleColor}`}>{song.title}</span>
              <span className="text-xs text-zinc-400 mt-0.5">{song.artist}</span>
            </div>
          );
        }
        return (
          <div className="flex flex-col leading-tight">
            <span className={`font-medium ${titleColor}`}>{song.title}</span>
          </div>
        );
      }
      case 'title': return <span className={`font-medium ${currentTrackId === song.id ? (isSpotifyTable ? 'text-green-400' : isTidalTable ? 'text-yellow-400' : isYoutubeTable ? 'text-red-400' : 'text-indigo-400') : 'text-zinc-100'}`}>{song.title}</span>;
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
      case 'format': {
        const fmt = (song.suffix || '').toLowerCase();
        const colorClass = fmt !== 'mp3' ? 'text-red-400' : '';
        return (
          <span className={`text-xs uppercase bg-zinc-800 px-1.5 py-0.5 rounded ${colorClass}`}>
            {song.suffix}
          </span>
        );
      }
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
              const token = authService.getToken();
              try {
                const resp = await fetch(`${BACKEND_BASE_URL}/downloads/finalize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      const resp = await fetch(`${BACKEND_BASE_URL}/downloads/metadata`, {
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

  const hasActiveFiltersSummary = (
    !!activeArtist ||
    !!activeGenre ||
    !!activeYear ||
    !!activeQuickList ||
    (groupFilterSelection && groupFilterSelection.length > 0) ||
    !!isGroupFilterActive
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      {/* Upload progress for preparation uploads */}
      {isNaviTableDownload && uploadState.active && (
        <div className="absolute right-4 top-4 z-30 bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg flex flex-col gap-1 min-w-[220px]">
          <span className="text-[11px] text-zinc-300 font-medium">
            Enviando arquivos de preparo...
          </span>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-[width] duration-150"
              style={{ width: `${Math.max(2, Math.min(100, uploadState.progress || 0))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
            <span>{uploadState.totalFiles} arquivo(s)</span>
            <span>{uploadState.progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Shazam Modal */}
      {shazamState.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white">Resultados do Shazam</h2>
                {shazamState.song && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    Arquivo: {getFileName(shazamState.song.path)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShazamState({ open: false, loading: false, error: null, song: null, matches: [], selectedId: undefined, previewUrl: null, previewLoading: false })}
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>

            {shazamState.loading && (
              <div className="flex-1 flex items-center justify-center p-6 text-zinc-300 text-sm">
                Buscando no Shazam...
              </div>
            )}

            {!shazamState.loading && shazamState.error && (
              <div className="flex-1 flex items-center justify-center p-6 text-red-400 text-sm">
                {shazamState.error}
              </div>
            )}

            {!shazamState.loading && !shazamState.error && (
              <div className="flex-1 flex divide-x divide-zinc-800 overflow-hidden">

                {/* *?  Retorno lateral do Shazam List  *? */}
                {/* <div className="w-1/3 max-w-xs overflow-y-auto custom-scrollbar p-3 space-y-1">
                  {shazamState.matches.length === 0 && (
                    <p className="text-xs text-zinc-500">Nenhuma correspondência encontrada.</p>
                  )}
                  {shazamState.matches.map((m) => {
                    const isSelected = shazamState.selectedId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setShazamState((prev) => ({ ...prev, selectedId: m.id }))}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${isSelected ? 'bg-indigo-600/80 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'}`}
                      >
                        <div className="font-semibold truncate">{m.title || 'Sem título'}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{m.artist || '-'}</div>
                      </button>
                    );
                  })}
                </div> */}

                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  {(() => {
                    const current = shazamState.matches.find(m => m.id === shazamState.selectedId) || shazamState.matches[0];
                    if (!current) return <p className="text-xs text-zinc-500">Selecione um resultado na lista ao lado.</p>;

                    const fields: { key: keyof typeof current; label: string }[] = [
                      { key: 'title', label: 'Título' },
                      { key: 'artist', label: 'Artista' },
                      { key: 'album', label: 'Álbum' },
                      { key: 'year', label: 'Ano' },
                      { key: 'isrc', label: 'ISRC' },
                    ];

                    const handleApplyAll = async () => {
                      if (!shazamState.song || !shazamState.song.path) {
                        showToast('Caminho do arquivo não encontrado para aplicar as tags.', 'error');
                        return;
                      }

                      const metadata: any = {};
                      if (current.title) metadata.title = current.title;
                      if (current.artist) {
                        metadata.artists = current.artist;
                        metadata.albumArtist = current.artist.split(',')[0] || current.artist;
                      }
                      if (current.album) metadata.album = current.album;

                      let yearNum: number | undefined;
                      if (current.year) {
                        const parsed = parseInt(current.year, 10);
                        if (!Number.isNaN(parsed)) {
                          metadata.year = parsed;
                          yearNum = parsed;
                        }
                      }

                      if (current.isrc) metadata.isrc = current.isrc;
                      const source: 'download' | 'navidrome' = isNaviTableDownload ? 'download' : isNavidromeLibraryTable ? 'navidrome' : 'download';

                      try {
                        // Aplica tags principais
                        const resp = await fetch(`${BACKEND_BASE_URL}/downloads/metadata`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            source: source,
                            id: shazamState.song.id,
                            path: shazamState.song.path,
                            metadata,
                          }),
                        });

                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({}));
                          showToast(`Erro ao aplicar tags: ${err.error || resp.statusText}`, 'error');
                          return;
                        }

                        // Aplica capa, se disponível
                        if (current.coverArt) {
                          const respCover = await fetch(`${BACKEND_BASE_URL}/downloads/metadata-cover`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              source: source,
                              id: shazamState.song.id,
                              path: shazamState.song.path,
                              coverUrl: current.coverArt,
                            }),
                          });

                          if (!respCover.ok) {
                            const err = await respCover.json().catch(() => ({}));
                            showToast(`Tags aplicadas, mas erro ao aplicar capa: ${err.error || respCover.statusText}`, 'error');
                          }
                        }

                        // Atualiza objeto local da música (título, artista, álbum, ano, isrc e capa)
                        if (current.title) applyLocalSongUpdate(shazamState.song, 'title', current.title);
                        if (current.artist) applyLocalSongUpdate(shazamState.song, 'artist', current.artist);
                        if (current.album) applyLocalSongUpdate(shazamState.song, 'album', current.album);
                        if (yearNum !== undefined) applyLocalSongUpdate(shazamState.song, 'year', String(yearNum));
                        if (current.isrc) applyLocalSongUpdate(shazamState.song, 'isrc', current.isrc);
                        if (current.coverArt) {
                          shazamState.song.coverArt = current.coverArt;
                        }

                        setShazamState(prev => prev.song ? { ...prev, song: { ...prev.song } } : prev);
                        showToast('Tags aplicadas com sucesso.', 'success');
                      } catch (e: any) {
                        showToast(`Erro ao aplicar tags: ${e?.message || String(e)}`, 'error');
                      }
                    };

                    return (
                      <>
                        {current.coverArt && (
                          <div className="flex items-center gap-3">
                            <img
                              src={current.coverArt}
                              alt="Capa"
                              className="w-16 h-16 rounded-md object-cover border border-zinc-700"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{current.title || '-'}</div>
                              <div className="text-xs text-zinc-400 truncate">{current.artist || '-'}</div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-xs">
                          {fields.map(({ key, label }) => (
                            <div key={key as string} className="flex items-center gap-2">
                              <span className="w-16 text-zinc-500 flex-shrink-0">{label}</span>
                              <span className="flex-1 truncate text-zinc-200" title={current[key] as string | undefined}>
                                {current[key] || '-'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={handleApplyAll}
                            className="px-4 py-1.5 text-[11px] rounded border border-green-600 text-green-300 hover:bg-green-600/20"
                          >
                            Aplicar tags
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Convert Modal for Downloads (Preparo) and Navidrome Library */}
      {convertState.open && convertState.song && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white">Converter arquivo</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                  {selectedIds.length > 1
                    ? `${selectedIds.length} músicas selecionadas`
                    : `${convertState.song.title} — ${convertState.song.artist}`
                  }
                </p>
              </div>
              <button
                disabled={convertState.loading}
                onClick={() => setConvertState({ open: false, song: null, loading: false })}
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-zinc-200">
              <p>
                {selectedIds.length > 1
                  ? 'Escolha o formato para conversão. As músicas serão convertidas na pasta de preparo.'
                  : 'Escolha o formato para conversão. A música será convertida na pasta de preparo.'
                }
              </p>
              <div className="flex flex-col gap-2">
                <button
                  disabled={convertState.loading}
                  onClick={async () => {
                    setConvertState(prev => ({ ...prev, loading: true }));
                    try {
                      // Se há múltiplas seleções, converte todas
                      const songsToConvert = selectedIds.length > 1
                        ? songs.filter(s => selectedIds.includes(s.id) && s.path)
                        : convertState.song?.path ? [convertState.song] : [];

                      if (songsToConvert.length === 0) {
                        showToast('Nenhuma música com caminho válido para converter.', 'error');
                        setConvertState({ open: false, song: null, loading: false });
                        return;
                      }

                      showToast(`Convertendo ${songsToConvert.length} música(s) para MP3 320 kbps...`, 'warning');
                      
                      let successCount = 0;
                      let errorCount = 0;

                      for (const song of songsToConvert) {
                        try {
                          const resp = await fetch(`${BACKEND_BASE_URL}/downloads/convert`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: song.path, format: 'mp3' }),
                          });
                          if (!resp.ok) {
                            const err = await resp.json().catch(() => ({}));
                            console.error(`Erro ao converter ${song.title}:`, err.error || resp.statusText);
                            errorCount++;
                          } else {
                            successCount++;
                          }
                        } catch (e: any) {
                          console.error(`Erro ao converter ${song.title}:`, e?.message || String(e));
                          errorCount++;
                        }
                      }

                      if (errorCount > 0) {
                        showToast(`${successCount} música(s) convertida(s) para MP3. ${errorCount} erro(s).`, 'warning');
                      } else {
                        showToast(`${successCount} música(s) convertida(s) para MP3 com sucesso.`, 'success');
                      }
                      
                      if (onAfterFinalize) onAfterFinalize();
                    } catch (e: any) {
                      showToast(`Erro ao converter para MP3: ${e?.message || String(e)}`, 'error');
                    } finally {
                      setConvertState({ open: false, song: null, loading: false });
                    }
                  }}
                  className="px-3 py-2 rounded-lg border border-green-500 text-green-300 hover:bg-green-500/20 text-xs disabled:opacity-50"
                >
                  MP3 (320k)
                </button>

                <button
                  disabled={convertState.loading}
                  onClick={async () => {
                    setConvertState(prev => ({ ...prev, loading: true }));
                    try {
                      // Se há múltiplas seleções, converte todas
                      const songsToConvert = selectedIds.length > 1
                        ? songs.filter(s => selectedIds.includes(s.id) && s.path)
                        : convertState.song?.path ? [convertState.song] : [];

                      if (songsToConvert.length === 0) {
                        showToast('Nenhuma música com caminho válido para converter.', 'error');
                        setConvertState({ open: false, song: null, loading: false });
                        return;
                      }

                      showToast(`Convertendo ${songsToConvert.length} música(s) para FLAC...`, 'warning');
                      
                      let successCount = 0;
                      let errorCount = 0;

                      for (const song of songsToConvert) {
                        try {
                          const resp = await fetch(`${BACKEND_BASE_URL}/downloads/convert`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: song.path, format: 'flac' }),
                          });
                          if (!resp.ok) {
                            const err = await resp.json().catch(() => ({}));
                            console.error(`Erro ao converter ${song.title}:`, err.error || resp.statusText);
                            errorCount++;
                          } else {
                            successCount++;
                          }
                        } catch (e: any) {
                          console.error(`Erro ao converter ${song.title}:`, e?.message || String(e));
                          errorCount++;
                        }
                      }

                      if (errorCount > 0) {
                        showToast(`${successCount} música(s) convertida(s) para FLAC. ${errorCount} erro(s).`, 'warning');
                      } else {
                        showToast(`${successCount} música(s) convertida(s) para FLAC com sucesso.`, 'success');
                      }
                      
                      if (onAfterFinalize) onAfterFinalize();
                    } catch (e: any) {
                      showToast(`Erro ao converter para FLAC: ${e?.message || String(e)}`, 'error');
                    } finally {
                      setConvertState({ open: false, song: null, loading: false });
                    }
                  }}
                  className="px-3 py-2 rounded-lg border border-yellow-500 text-yellow-300 hover:bg-yellow-500/20 text-xs disabled:opacity-50"
                >
                  FLAC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal for Downloads (Preparo) */}
      {deleteState.open && deleteState.song && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white">Excluir arquivo de preparo</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                  {deleteState.song.title} — {deleteState.song.artist}
                </p>
              </div>
              <button
                disabled={deleteState.loading}
                onClick={() => setDeleteState({ open: false, song: null, loading: false })}
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs text-zinc-200">
              <p>
                Tem certeza que deseja excluir este arquivo da pasta de preparo?
              </p>
              <p className="text-[11px] text-zinc-500 break-all">
                Arquivo: {getFileName(deleteState.song.path)}
              </p>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  disabled={deleteState.loading}
                  onClick={() => setDeleteState({ open: false, song: null, loading: false })}
                  className="px-3 py-1.5 text-[11px] rounded border border-zinc-600 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleteState.loading}
                  onClick={async () => {
                    const song = deleteState.song;
                    if (!song?.path) return;
                    setDeleteState(prev => ({ ...prev, loading: true }));
                    try {
                      const resp = await fetch(`${BACKEND_BASE_URL}/downloads/delete-preparation`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: song.path }),
                      });
                      if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        showToast(`Erro ao excluir arquivo de preparo: ${err.error || resp.statusText}`, 'error');
                      } else {
                        showToast('Arquivo excluído da pasta de preparo.', 'success');
                        if (onAfterFinalize) onAfterFinalize();
                      }
                    } catch (e: any) {
                      showToast(`Erro ao excluir arquivo de preparo: ${e?.message || String(e)}`, 'error');
                    } finally {
                      setDeleteState({ open: false, song: null, loading: false });
                    }
                  }}
                  className="px-3 py-1.5 text-[11px] rounded border border-red-600 text-red-300 hover:bg-red-600/20 disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu Portal/Div */}
      {contextMenu.visible && contextMenu.song && (() => {
        return null;
      })()}
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

          {/* Spotify -> Search on TIDAL options + MP3 download via SpotDL */}
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
              <button
                onClick={async () => {
                  const song = contextMenu.song!;
                  setContextMenu({ ...contextMenu, visible: false });
                  try {
                    showToast(`Iniciando download MP3: ${song.title}`, 'warning');
                    const resp = await fetch(`${BACKEND_BASE_URL}/downloads/spotdl`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ song }),
                    });

                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({}));
                      showToast(`Erro ao iniciar download MP3: ${err.error || resp.statusText}`, 'error');
                      return;
                    }

                    showToast('Download MP3 adicionado à fila de downloads.', 'success');
                  } catch (e: any) {
                    showToast(`Erro ao iniciar download MP3: ${e?.message || String(e)}`, 'error');
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download MP3
              </button>
            </>
          )}

          {/* YouTube -> MP3 download via SpotDL (usa song.path como URL do YouTube Music) */}
          {contextMenu.song.contentType === 'audio/youtube' && (
            <button
              onClick={async () => {
                const song = contextMenu.song!;
                setContextMenu({ ...contextMenu, visible: false });
                try {
                  showToast(`Iniciando download MP3 (YouTube): ${song.title}`, 'warning');
                  const resp = await fetch(`${BACKEND_BASE_URL}/downloads/spotdl`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ song }),
                  });

                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    showToast(`Erro ao iniciar download MP3: ${err.error || resp.statusText}`, 'error');
                    return;
                  }

                  showToast('Download MP3 (YouTube) adicionado à fila de downloads.', 'success');
                } catch (e: any) {
                  showToast(`Erro ao iniciar download MP3: ${e?.message || String(e)}`, 'error');
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download MP3
            </button>
          )}

          {(!isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload && onToggleFavorite) && (
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

          {/* Option to copy songs to user directory when Master Mode is active */}
          {isNavidromeLibraryTable && isMasterMode && (
            <button
              onClick={async () => {
                setContextMenu({ ...contextMenu, visible: false });
                const songsToSend = selectedIds.length > 0
                  ? songs.filter(s => selectedIds.includes(s.id))
                  : [contextMenu.song!];

                try {
                  showToast(`Copiando ${songsToSend.length} música(s) para o diretório do usuário...`, 'warning');

                  const token = authService.getToken();
                  const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                  };

                  if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                  }

                  const resp = await fetch(`${BACKEND_BASE_URL}/navidrome/copy-to-user`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      songIds: songsToSend.map(s => s.id),
                    }),
                  });

                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    showToast(`Erro ao copiar músicas: ${err.error || resp.statusText}`, 'error');
                    return;
                  }

                  const result = await resp.json();
                  if (result.errors) {
                    for (const msg of result.errors || []) {
                      showToast(msg, 'error');
                    }
                    return;
                  }
                  showToast(`${result.copied || 0} música(s) copiada(s) com sucesso!`, 'success');

                } catch (e: any) {
                  showToast(`Erro ao copiar músicas: ${e?.message || String(e)}`, 'error');
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-green-300 hover:bg-green-900/40 hover:text-green-200 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {selectedIds.length > 0
                ? `Copiar para Minha Biblioteca (${selectedIds.length})`
                : 'Copiar para Minha Biblioteca'
              }
            </button>
          )}

          {/* Option to convert songs when Master Mode is disabled */}
          {isNavidromeLibraryTable && !isMasterMode && contextMenu.song?.path && (
            <button
              onClick={() => {
                // Se há seleções, converte todas; senão, converte apenas a música do context menu
                const songsToConvert = selectedIds.length > 0
                  ? songs.filter(s => selectedIds.includes(s.id) && s.path)
                  : [contextMenu.song!];

                if (songsToConvert.length === 0) {
                  showToast('Nenhuma música com caminho válido selecionada.', 'error');
                  setContextMenu({ ...contextMenu, visible: false });
                  return;
                }
                // Usa a primeira música como referência no modal, mas converte todas
                setConvertState({ open: true, song: songsToConvert[0], loading: false });
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {selectedIds.length > 0 ? `Converter (${selectedIds.length})` : 'Converter'}
            </button>
          )}

          {/* Option to open Group Tag Editor */}
          {onGroupEdit && (!isNavidromeLibraryTable || isTagEditMode) && (
            <button
              onClick={() => { onGroupEdit(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Tags className="w-4 h-4" /> Editar Grupos
            </button>
          )}

          {/* Shazam search option - available on Downloads table and Navidrome library when tag edit is enabled, with local file */}
          {(isNaviTableDownload || (isNavidromeLibraryTable && isTagEditMode)) && contextMenu.song?.path && (
            <button
              onClick={async () => {
                const song = contextMenu.song!;
                let navidrome_id: string | null = null;
                setContextMenu({ ...contextMenu, visible: false });
                setShazamState({
                  open: true,
                  loading: true,
                  error: null,
                  song,
                  matches: [],
                  selectedId: undefined,
                });
                if (isNavidromeLibraryTable) {
                  navidrome_id = song.id;
                }
                try {
                  const resp = await fetch(`${BACKEND_BASE_URL}/shazam/recognise`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: song.path, navidrome_id: navidrome_id }),
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || resp.statusText);
                  }
                  const json = await resp.json();
                  const matches = Array.isArray(json.matches) ? json.matches : [];
                  setShazamState((prev) => ({
                    ...prev,
                    loading: false,
                    matches,
                    selectedId: matches[0]?.id,
                  }));
                } catch (e: any) {
                  const message = e?.message || 'Falha ao buscar no Shazam';
                  showToast(message, 'error');
                  setShazamState((prev) => ({
                    ...prev,
                    loading: false,
                    error: message,
                  }));
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Encontrar no Shazam
            </button>
          )}

          {/* Converter option for preparation table + Ver espectro
              Também habilitar "Ver espectro" na biblioteca Navidrome quando edição de tags estiver ativa
          */}
          {(isNaviTableDownload || (isNavidromeLibraryTable && isTagEditMode)) && contextMenu.song?.path && (
            <>
              {isNaviTableDownload && (
                <button
                  onClick={() => {
                    setConvertState({ open: true, song: contextMenu.song!, loading: false });
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Converter
                </button>
              )}
              <button
                onClick={async () => {
                  const song = contextMenu.song!;
                  setContextMenu({ ...contextMenu, visible: false });
                  setSpectrogramState({
                    open: true,
                    loading: true,
                    error: null,
                    imagePath: null,
                    song,
                    width: 2048,
                    height: 1024,
                    zoom: 1,
                    offsetX: 0,
                    offsetY: 0,
                    isPanning: false,
                  });
                  try {
                    const resp = await fetch(`${BACKEND_BASE_URL}/downloads/spectrogram`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ path: song.path }),
                    });
                    if (!resp.ok) {
                      let message = resp.statusText;
                      try {
                        const err = await resp.json();
                        message = err.error || message;
                      } catch {
                        // ignore parse error
                      }
                      throw new Error(message);
                    }

                    const blob = await resp.blob();
                    const imageUrl = URL.createObjectURL(blob);

                    setSpectrogramState(prev => ({
                      ...prev,
                      loading: false,
                      imagePath: imageUrl,
                    }));
                  } catch (e: any) {
                    const message = e?.message || 'Falha ao gerar espectro';
                    showToast(message, 'error');
                    setSpectrogramState(prev => ({
                      ...prev,
                      loading: false,
                      error: message,
                    }));
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                <Activity className="w-4 h-4" /> Ver espectro
              </button>
              {isNaviTableDownload && (
                <button
                  onClick={() => {
                    setDeleteState({ open: true, song: contextMenu.song!, loading: false });
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-900/40 hover:text-red-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Excluir arquivo
                </button>
              )}
            </>
          )}

          {(!isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload && onInfo) && (
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

          {/* Adicionar faixa diretamente ao editor de áudio (biblioteca ou preparo) */}
          {contextMenu.song && (
            <>
              <div className="border-t border-zinc-800 my-1"></div>
              <button
                onClick={async () => {
                  const song = contextMenu.song!;
                  setContextMenu(prev => ({ ...prev, visible: false }));
                  await handleAddToEditor(song);
                }}
                className="w-full text-left px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-800/40 hover:text-white flex items-center gap-2"
              >
                <Tags className="w-4 h-4" /> Adicionar para editar
              </button>
            </>
          )}
          {/* TIDAL download option */}
          {contextMenu.song.contentType === 'audio/tidal' && (
            <button
              onClick={async () => {
                setContextMenu({ ...contextMenu, visible: false });
                try {
                  showToast(`Download Iniciado: ${contextMenu.song.title}`, 'warning');
                  const body = {
                    creds: tidalService.getCredentials(),
                    trackId: contextMenu.song!.id,
                    song: contextMenu.song,
                  };
                  const resp = await fetch(`${BACKEND_BASE_URL}/downloads/tidal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to queue download');
                  }
                  showToast(`Download Finalizado: ${contextMenu.song.title}`, 'success');
                } catch (e) {
                  console.error('TIDAL download request failed', e);
                  showToast('Falha ao iniciar download no servidor: ' + (e?.message || String(e)), 'error');
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download FLAC
            </button>
          )}
          {contextMenu.song.contentType === 'audio/tidal' && (
            <button
              onClick={async () => {
                setContextMenu({ ...contextMenu, visible: false });
                try {
                  showToast(`Download Iniciado: ${contextMenu.song.title}`, 'warning');
                  const body = {
                    creds: tidalService.getCredentials(),
                    trackId: contextMenu.song!.id,
                    song: contextMenu.song,
                    format: 'mp3'
                  };
                  const resp = await fetch(`${BACKEND_BASE_URL}/downloads/tidal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to queue download');
                  }
                  showToast(`Download Finalizado: ${contextMenu.song.title}`, 'success');
                } catch (e) {
                  console.error('TIDAL download request failed', e);
                  showToast('Falha ao iniciar download no servidor: ' + (e?.message || String(e)), 'error');
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download MP3 (320kbps)
            </button>
          )}
        </div>
      )}

      {/* Spectrogram Modal */}
      {spectrogramState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden max-h-[90vh]"
            style={{
              // Largura = largura da imagem + bordas, respeitando a tela
              width: Math.min(spectrogramState.width, window.innerWidth - 32),
            }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Espectro de áudio</span>
                  {spectrogramState.song && (
                    <span className="text-xs text-zinc-500 truncate max-w-xs">
                      {spectrogramState.song.artist} — {spectrogramState.song.title}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSpectrogramState({
                  open: false,
                  loading: false,
                  error: null,
                  imagePath: null,
                  song: null,
                  width: 2048,
                  height: 1024,
                  zoom: 1,
                  offsetX: 0,
                  offsetY: 0,
                  isPanning: false,
                })}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black overflow-auto">
              {spectrogramState.loading && (
                <p className="text-sm text-zinc-400">Gerando espectro com ffmpeg...</p>
              )}
              {!spectrogramState.loading && spectrogramState.error && (
                <p className="text-sm text-red-400">{spectrogramState.error}</p>
              )}
              {!spectrogramState.loading && !spectrogramState.error && spectrogramState.imagePath && (
                <div
                  onWheel={handleSpectrogramWheel}
                  onMouseDown={handleSpectrogramMouseDown}
                  onDoubleClick={resetSpectrogramView}
                  className="relative flex items-center justify-center overflow-hidden bg-black"
                  style={{
                    cursor: spectrogramState.zoom > 1 ? 'grab' : 'default',
                    width: spectrogramState.width,
                    height: spectrogramState.height,
                  }}
                >
                  <img
                    src={spectrogramState.imagePath}
                    alt="Espectrograma de áudio"
                    className="select-none"
                    style={{
                      transform: `translate(${spectrogramState.offsetX}px, ${spectrogramState.offsetY}px) scale(${spectrogramState.zoom})`,
                      transformOrigin: 'center center',
                      width: '100%',
                      height: '100%',
                      objectFit: 'fill',
                      display: 'block',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={handleSpectrogramResizeMouseDown}
              className="absolute bottom-1.5 right-1.5 w-4 h-4 cursor-se-resize flex items-end justify-end text-zinc-600 hover:text-zinc-300"
            >
              <div className="border-r border-b border-current w-3 h-3" />
            </div>
          </div>
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
              className={`w-40 sm:w-64 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 pl-8 focus:outline-none ${isSpotifyTable ? 'focus:border-green-500' : isTidalTable ? 'focus:border-yellow-500' : isYoutubeTable ? 'focus:border-red-500' : 'focus:border-indigo-500'} transition-all placeholder-zinc-600`}
            />
            <Search className={`w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 transform -translate-y-1/2 ${isSpotifyTable ? 'group-focus-within:text-green-500' : isTidalTable ? 'group-focus-within:text-yellow-500' : isYoutubeTable ? 'group-focus-within:text-red-500' : 'group-focus-within:text-indigo-500'} transition-colors`} />
          </div>
        )}
        {/* QUICK LIST BUTTONS & GROUP FILTER */}
        <div className="flex items-center gap-2 mr-auto">
          {onQuickListChange && (
            <>
              {/* Group Filter Button - Navidrome Only */}
              {isNavidromeLibraryTable && onOpenGroupFilter && (
                <button
                  onClick={onOpenGroupFilter}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${isAnyFilterActive
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50'
                    : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                    }`}
                  title="Filtrar por grupos (comentários DJ)"
                >
                  <Tags className="w-4 h-4" />
                  Filtros
                </button>
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
        {isNavidromeLibraryTable && !isNaviFavoritesView && !isNaviPlaylistView && (
          <>
            <button
              key={`master-mode-${isMasterMode}`}
              onClick={async () => {
                const newMode = !isMasterMode;

                // Update state and service first
                setIsMasterMode(newMode);
                navidromeService.setMasterMode(newMode);
                setUserState('navi_songs', { masterMode: newMode });

                // Then notify parent to refresh data
                if (onMasterModeChange) {
                  // Small delay to ensure state is updated
                  setTimeout(() => {
                    onMasterModeChange();
                  }, 50);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${isMasterMode
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/60'
                : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                }`}
              title={`Biblioteca Master ${isMasterMode ? 'ATIVA' : 'INATIVA'}`}
            >
              <Shield className={`w-4 h-4 ${isMasterMode ? 'text-purple-300' : 'text-zinc-400'}`} />
              Master
            </button>
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
          </>
        )}
        <div className="flex items-center gap-2">
          {isNaviTableDownload && (
            <>
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="audio/mpeg,audio/flac,.mp3,.flac,audio/*"
                className="hidden"
                onChange={handleUploadPreparationFiles}
              />
              <button
                onClick={handleUploadPreparationClick}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500/20"
              >
                Upload
              </button>
            </>
          )}
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
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'compact' ? (isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : isYoutubeTable ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                      >
                        Peq.
                      </button>
                      <button
                        onClick={() => setRowDensity('normal')}
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'normal' ? (isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : isYoutubeTable ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                      >
                        Méd.
                      </button>
                      <button
                        onClick={() => setRowDensity('relaxed')}
                        className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'relaxed' ? (isSpotifyTable ? 'bg-green-600 text-white' : isTidalTable ? 'bg-yellow-600 text-white' : isYoutubeTable ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
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
                        {col.visible && <Check className={isSpotifyTable ? 'w-3.5 h-3.5 text-green-500' : isTidalTable ? 'w-3.5 h-3.5 text-yellow-500' : isYoutubeTable ? 'w-3.5 h-3.5 text-red-500' : "w-3.5 h-3.5 text-indigo-500"} />}
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
          {/* Active Filters Summary (between toolbar buttons and column headers) - only for Navidrome Músicas view */}
          {isNavidromeLibraryTable && isNaviSongsView && hasActiveFiltersSummary && (
            <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
              <span className="uppercase tracking-wide text-zinc-500 mr-1">Filtros ativos:</span>
              {activeArtist && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/40">
                  <span className="text-[10px] uppercase text-zinc-400">Artista</span>
                  <span className="truncate max-w-[140px]">{activeArtist}</span>
                </span>
              )}
              {activeGenre && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/40">
                  <span className="text-[10px] uppercase text-zinc-400">Gênero</span>
                  <span className="truncate max-w-[140px]">{activeGenre}</span>
                </span>
              )}
              {activeYear && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/40">
                  <span className="text-[10px] uppercase text-zinc-400">Ano</span>
                  <span>{activeYear}</span>
                </span>
              )}
              {activeQuickList && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/40">
                  <span className="text-[10px] uppercase text-zinc-400">Lista</span>
                  <span>
                    {activeQuickList === 'frequent' && 'Mais tocadas'}
                    {activeQuickList === 'recent' && 'Tocadas recentemente'}
                    {activeQuickList === 'newest' && 'Adicionadas recentemente'}
                    {activeQuickList === 'highest' && 'Melhor avaliadas'}
                  </span>
                </span>
              )}
              {groupFilterSelection && groupFilterSelection.length > 0 && (
                <>
                  {groupFilterSelection.map((group) => (
                    <span
                      key={group}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/40"
                    >
                      <span className="text-[10px] uppercase text-zinc-400">Grupo</span>
                      <span className="truncate max-w-[160px]" title={group}>{group}</span>
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
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
              const enableRowDrag = isNavidromeLibraryTable && !!isNaviPlaylistView && !!onReorderNaviPlaylist;
              return (
                <div
                  key={song.id}
                  onContextMenu={(e) => handleContextMenu(e, song)}
                  className={`
                                flex border-b border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group
                                ${index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-950/50'}
                                ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : ''}
                                ${currentTrackId === song.id ? (isSpotifyTable ? 'bg-green-600/20' : isTidalTable ? 'bg-yellow-600/20' : isYoutubeTable ? 'bg-red-600/20' : 'bg-indigo-500/5') : ''}
                                ${draggedRowIndex === index ? 'opacity-60' : ''}
                                ${dragOverRowIndex === index && draggedRowIndex !== null && draggedRowIndex !== index ? 'ring-1 ring-indigo-500' : ''}
                            `}
                  draggable={enableRowDrag}
                  onDragStart={(e) => {
                    if (!enableRowDrag) return;
                    setDraggedRowIndex(index);
                    setDragOverRowIndex(null);
                    try {
                      e.dataTransfer.effectAllowed = 'move';
                    } catch {
                      // ignore
                    }
                  }}
                  onDragOver={(e) => {
                    if (!enableRowDrag || draggedRowIndex === null || draggedRowIndex === index) return;
                    e.preventDefault();
                    setDragOverRowIndex(index);
                  }}
                  onDrop={(e) => {
                    if (!enableRowDrag || draggedRowIndex === null || draggedRowIndex === index || !onReorderNaviPlaylist) return;
                    e.preventDefault();
                    const from = draggedRowIndex;
                    const to = index;
                    setDraggedRowIndex(null);
                    setDragOverRowIndex(null);
                    onReorderNaviPlaylist(from, to);
                  }}
                  onDragEnd={() => {
                    setDraggedRowIndex(null);
                    setDragOverRowIndex(null);
                  }}
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
              {!isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload && <option value="100">100</option>}
              {!isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload && <option value="200">200</option>}
              {!isSpotifyTable && !isTidalTable && !isYoutubeTable && !isNaviTableDownload && <option value="500">500</option>}
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
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${isSpotifyTable ? 'bg-green-600 shadow-lg shadow-green-500/20' : isTidalTable ? 'bg-yellow-600 shadow-lg shadow-yellow-500/20' : isYoutubeTable ? 'bg-red-600 shadow-lg shadow-red-500/20' : 'bg-indigo-600 shadow-lg shadow-indigo-500/20'} text-white text-xs font-bold pointer-events-none`}
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