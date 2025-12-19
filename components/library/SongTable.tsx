import React, { useState, useRef, useEffect } from 'react';
import { NaviSong } from '../../types';
import { Play, Pause, Clock, GripVertical, Settings2, Check, Image as ImageIcon, FileAudio, Disc, Activity, Zap, Filter, X, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, History, CheckSquare, Square, AlignJustify, Heart, Info, BarChart2, Sparkles, TrendingUp, Award, Star, Tags } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';

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
}

// Removido 'play' dos IDs de coluna e adicionado 'userRating'
type ColumnId = 'select' | 'index' | 'cover' | 'track' | 'title' | 'artist' | 'album' | 'genre' | 'userRating' | 'year' | 'duration' | 'comment' | 'mood' | 'group' | 'format' | 'filename' | 'discNumber' | 'bitRate' | 'samplingRate';

type RowDensity = 'compact' | 'normal' | 'relaxed';

interface ColumnConfig {
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
    selectedIds = [],
    onSelect,
    onSelectAll,
    onToggleFavorite,
    onInfo,
    onSetRating,
    onGroupEdit
}) => {
  // --- STATE ---
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'select', label: '', width: 40, visible: true, minWidth: 40 },
    { id: 'index', label: '#', width: 40, visible: true, minWidth: 30 },
    // Coluna 'play' removida
    { id: 'cover', label: 'Capa', width: 80, visible: true, minWidth: 50 },
    { id: 'title', label: 'Título', width: 200, visible: true, minWidth: 100 },
    { id: 'artist', label: 'Artista', width: 150, visible: true, minWidth: 100 },
    { id: 'genre', label: 'Gênero', width: 100, visible: true, minWidth: 200 },
    { id: 'comment', label: 'Comentários', width: 300, visible: true, minWidth: 300 },
    { id: 'album', label: 'Álbum', width: 150, visible: true, minWidth: 100 },
    { id: 'userRating', label: 'Avaliação', width: 100, visible: true, minWidth: 80 },
    { id: 'year', label: 'Ano', width: 60, visible: true, minWidth: 100 },
    { id: 'duration', label: 'Duração', width: 70, visible: true, minWidth: 60 },
    { id: 'track', label: 'Track', width: 50, visible: false, minWidth: 100 }, 
    { id: 'discNumber', label: 'Disco', width: 60, visible: false, minWidth: 50 },
    { id: 'bitRate', label: 'Bitrate', width: 80, visible: false, minWidth: 60 },
    { id: 'samplingRate', label: 'Sample', width: 80, visible: false, minWidth: 60 },
    { id: 'format', label: 'Fmt', width: 60, visible: true, minWidth: 50 },
    { id: 'mood', label: 'Mood', width: 100, visible: false, minWidth: 80 },
    { id: 'group', label: 'Grupo', width: 120, visible: false, minWidth: 100 },
    { id: 'filename', label: 'Arquivo', width: 200, visible: false, minWidth: 100 },
  ]);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<ColumnId | null>(null);
  const [rowDensity, setRowDensity] = useState<RowDensity>('normal');
  
  // Local state for search input to allow typing without immediate API calls if wanted, 
  // though typically we use onKeyDown Enter for search.
  const [searchInputValue, setSearchInputValue] = useState(activeSearchQuery);

  // Sync internal state with external prop if it changes (e.g. clear)
  useEffect(() => {
    setSearchInputValue(activeSearchQuery);
  }, [activeSearchQuery]);


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
                        src={navidromeService.getCoverArtUrl(song.coverArt)} 
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
      case 'title': return <span className={`font-medium ${currentTrackId === song.id ? 'text-indigo-400' : 'text-zinc-100'}`}>{song.title}</span>;
      case 'artist': return song.artist;
      case 'album': return song.album;
      case 'userRating': {
          const rating = song.userRating || 0;
          return (
            <div className="flex items-center gap-0.5" title={`${rating} estrelas`}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={(e) => {
                             e.stopPropagation();
                             if(onSetRating) {
                                 // Se clicar na estrela que já é o rating atual, remove (seta para 0)
                                 const newRating = rating === star ? 0 : star;
                                 onSetRating(song.id, newRating);
                             }
                        }}
                        className="focus:outline-none hover:scale-110 transition-transform"
                    >
                        <Star 
                            className={`w-3.5 h-3.5 cursor-pointer transition-colors ${
                                star <= rating 
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
      default: return '-';
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
              
              {/* Option to open Group Tag Editor */}
              {onGroupEdit && (
                  <button 
                    onClick={() => { onGroupEdit(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                  >
                      <Tags className="w-4 h-4" /> Editar Grupos
                  </button>
              )}

              <div className="border-t border-zinc-800 my-1"></div>

              <button 
                onClick={() => { onInfo && onInfo(contextMenu.song!); setContextMenu({ ...contextMenu, visible: false }); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
              >
                  <Info className="w-4 h-4" /> Informações
              </button>
          </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end items-center p-2 border-b border-zinc-800 bg-zinc-900/50 gap-2 flex-shrink-0">
        
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

                    {/* Search Input */}
                    {onSearch && (
                        <div className="relative group ml-2">
                            <input
                                type="text"
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Buscar..."
                                className="w-40 sm:w-64 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 pl-8 focus:outline-none focus:border-indigo-500 transition-all placeholder-zinc-600"
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 transform -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                    )}
                </>
            )}
        </div>

        {/* COLUMNS BUTTON */}
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
                            className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'compact' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Peq.
                        </button>
                        <button 
                            onClick={() => setRowDensity('normal')}
                            className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'normal' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            Méd.
                        </button>
                        <button 
                            onClick={() => setRowDensity('relaxed')}
                            className={`flex-1 text-[10px] font-medium py-1.5 rounded transition-colors ${rowDensity === 'relaxed' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
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
                        {col.visible && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                    </button>
                    ))}
                </div>
              </div>
            </>
          )}
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
                    return (
                        <div 
                            key={song.id} 
                            onContextMenu={(e) => handleContextMenu(e, song)}
                            className={`
                                flex border-b border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group
                                ${index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-950/50'}
                                ${isSelected ? 'bg-indigo-500/10 hover:bg-indigo-500/15' : ''}
                                ${currentTrackId === song.id ? 'bg-indigo-500/5' : ''}
                            `}
                        >
                            {visibleColumns.map(col => (
                                <div 
                                    key={col.id}
                                    className={`px-4 text-sm text-zinc-400 flex items-center overflow-hidden whitespace-nowrap flex-shrink-0 ${getRowPadding()}`}
                                    style={{ width: col.width, minWidth: col.minWidth }}
                                >
                                    {renderCell(song, col.id, index)}
                                </div>
                            ))}
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
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300</option>
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
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 pointer-events-none"
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