import React, { useState, useEffect, useRef } from 'react';
import { NaviSong, NaviAlbum, NaviArtist, NaviPlaylist, PlayerTrack, TagGroup, SpotifyTrack } from './types';
import { navidromeService } from './services/navidromeService';
import { getStoredGroups } from './services/data';
import { Disc3, Radio, Mic2, Library, ListMusic, Play, Pause, SkipBack, SkipForward, Volume2, List, ChevronDown, ChevronRight, Hash, Plus, X, Trash2, ListX, Heart, PanelLeftClose, PanelLeftOpen, Settings, Tag, LayoutGrid, ArrowLeft, Search, Navigation } from 'lucide-react';
import SongTable from './components/SongTable';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import PlaylistSelectorModal from './components/PlaylistSelectorModal';
import SongInfoModal from './components/SongInfoModal';
import ConfirmationModal from './components/ConfirmationModal';
import GroupSettings from './components/GroupSettings';
import GroupTagModal from './components/GroupTagModal';
import SpotifySettings from './components/SpotifySettings';
import SpotifyBrowse from './components/SpotifyBrowse';

type ViewMode = 'navi_songs' | 'navi_albums' | 'navi_artists' | 'navi_playlist' | 'navi_favorites' | 'settings' | 'spotify_browse';
type SettingsTab = 'groups' | 'spotify' | 'general'; 
type QuickListType = 'newest' | 'recent' | 'frequent' | 'highest' | null;

const App: React.FC = () => {
  // --- STATE: NAVIDROME ---
  const [naviSongs, setNaviSongs] = useState<NaviSong[]>([]);
  const [naviAlbums, setNaviAlbums] = useState<NaviAlbum[]>([]);
  const [naviArtists, setNaviArtists] = useState<NaviArtist[]>([]);
  const [naviPlaylists, setNaviPlaylists] = useState<NaviPlaylist[]>([]);
  const [loadingNavi, setLoadingNavi] = useState(false);

  // --- STATE: FILTERS & PAGINATION ---
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableArtistNames, setAvailableArtistNames] = useState<string[]>([]);
  
  const [activeArtist, setActiveArtist] = useState<string>('');
  const [activeGenre, setActiveGenre] = useState<string>('');
  const [activeYear, setActiveYear] = useState<string>('');
  const [activeQuickList, setActiveQuickList] = useState<QuickListType>(null);
  
  // Search State
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalSongs, setTotalSongs] = useState(0);

  // --- STATE: VIEW & MODALS ---
  const [viewMode, setViewMode] = useState<ViewMode>('navi_songs');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('groups');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true);
  
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showRemoveFromPlaylistModal, setShowRemoveFromPlaylistModal] = useState(false);
  
  // Tag Groups State (Carregado do LocalStorage)
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);

  const loadGroupsFromStorage = () => {
      const groups = getStoredGroups();
      setTagGroups(groups);
  };

  useEffect(() => {
      loadGroupsFromStorage();
  }, []);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // Info Modal State
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoSong, setInfoSong] = useState<NaviSong | null>(null);

  // Group Tag Editor State
  const [showGroupTagModal, setShowGroupTagModal] = useState(false);
  const [groupTagSong, setGroupTagSong] = useState<NaviSong | null>(null);

  // --- STATE: SELECTION ---
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  // --- STATE: PLAYER ---
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- EFFECTS ---

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Initial Load (Filters + Initial Data + Playlists)
  useEffect(() => {
    const init = async () => {
        try {
            // Load filters options
            const genres = await navidromeService.getGenres();
            setAvailableGenres(genres);

            const artists = await navidromeService.getArtists();
            setNaviArtists(artists);
            setAvailableArtistNames(artists.map(a => a.name).sort());

            // Load Playlists
            const playlists = await navidromeService.getPlaylists();
            setNaviPlaylists(playlists);

            // Initial Songs Load
            if (viewMode === 'navi_songs') {
                fetchSongs(0, 100, '', '', '', undefined);
            }
        } catch (e) {
            console.error("Init failed", e);
        }
    };
    init();
  }, []);

  // Load Navidrome Data when View Changes (Specific views)
  useEffect(() => {
    const loadData = async () => {
        if (viewMode === 'navi_albums' && naviAlbums.length === 0) {
            setLoadingNavi(true);
            const albums = await navidromeService.getAlbums('newest', 50);
            setNaviAlbums(albums);
            setLoadingNavi(false);
        } else if (viewMode === 'navi_artists' && naviArtists.length === 0) {
            setLoadingNavi(true);
            const artists = await navidromeService.getArtists();
            setNaviArtists(artists);
            setLoadingNavi(false);
        }
    };
    loadData();
  }, [viewMode]);

  // Clear selection when changing views or pages
  useEffect(() => {
    setSelectedSongIds([]);
  }, [viewMode, page, activeArtist, activeGenre, activeYear, selectedPlaylistId, activeSearchQuery]);

  // --- FETCH LOGIC ---
  const fetchSongs = async (pageNum: number, size: number, artist: string, genre: string, year: string, quickList?: QuickListType) => {
    setLoadingNavi(true);
    try {
        const offset = pageNum * size;
        const { songs, total } = await navidromeService.getSongsByFilter(artist, genre, year, size, offset, quickList || undefined);
        setNaviSongs(songs);
        setTotalSongs(total);
    } catch (e) {
        console.error("Fetch songs failed", e);
    } finally {
        setLoadingNavi(false);
    }
  };

  const handlePlaylistClick = async (playlist: NaviPlaylist) => {
    setLoadingNavi(true);
    setViewMode('navi_playlist');
    setSelectedPlaylistId(playlist.id);
    setActiveSearchQuery('');
    setPage(0); 
    try {
        const songs = await navidromeService.getPlaylist(playlist.id);
        setNaviSongs(songs);
        setTotalSongs(songs.length); 
        setPageSize(Math.max(songs.length, 10)); 
    } catch (e) {
        console.error("Fetch playlist failed", e);
    } finally {
        setLoadingNavi(false);
    }
  };

  const handleFavoritesClick = async () => {
    setLoadingNavi(true);
    setViewMode('navi_favorites');
    setSelectedPlaylistId(null);
    setActiveSearchQuery('');
    setPage(0);
    try {
        const songs = await navidromeService.getStarredSongs();
        setNaviSongs(songs);
        setTotalSongs(songs.length);
        setPageSize(Math.max(songs.length, 10));
    } catch (e) {
        console.error("Fetch favorites failed", e);
    } finally {
        setLoadingNavi(false);
    }
  };

  const handleCreatePlaylist = async (name: string, isPublic: boolean) => {
      const success = await navidromeService.createPlaylist(name, isPublic);
      if (success) {
          const playlists = await navidromeService.getPlaylists();
          setNaviPlaylists(playlists);
          setIsPlaylistsExpanded(true);
      }
  };
  
  const handleDeletePlaylist = (playlistId: string, playlistName: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'Excluir Playlist',
          message: `Tem certeza que deseja excluir a playlist "${playlistName}"? Esta ação não pode ser desfeita.`,
          onConfirm: async () => {
              const success = await navidromeService.deletePlaylist(playlistId);
              if (success) {
                  const playlists = await navidromeService.getPlaylists();
                  setNaviPlaylists(playlists);
                  if (selectedPlaylistId === playlistId) handleLibrarySongsClick();
              }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleAddToPlaylist = async (targetPlaylistId: string) => {
      const success = await navidromeService.addSongsToPlaylist(targetPlaylistId, selectedSongIds);
      if (success) {
          setSelectedSongIds([]);
          setShowAddToPlaylistModal(false);
          const playlists = await navidromeService.getPlaylists();
          setNaviPlaylists(playlists);
      }
  };

  const handleRemoveFromPlaylist = async (targetPlaylistId: string) => {
      const success = await navidromeService.removeSongsFromPlaylist(targetPlaylistId, selectedSongIds);
      if (success) {
          setSelectedSongIds([]);
          setShowRemoveFromPlaylistModal(false);
          if (viewMode === 'navi_playlist' && selectedPlaylistId === targetPlaylistId) {
             const pl = naviPlaylists.find(p => p.id === selectedPlaylistId);
             if (pl) handlePlaylistClick(pl);
          }
           const playlists = await navidromeService.getPlaylists();
           setNaviPlaylists(playlists);
      }
  };
  
  const handleQuickRemoveFromCurrent = async () => {
      if (!selectedPlaylistId) return;
      setConfirmModal({
        isOpen: true,
        title: 'Remover da Playlist',
        message: `Remover ${selectedSongIds.length} música(s) desta playlist?`,
        onConfirm: async () => {
             const success = await navidromeService.removeSongsFromPlaylist(selectedPlaylistId, selectedSongIds);
             if (success) {
                 setSelectedSongIds([]);
                 const songs = await navidromeService.getPlaylist(selectedPlaylistId);
                 setNaviSongs(songs);
                 setTotalSongs(songs.length);
                 const playlists = await navidromeService.getPlaylists();
                 setNaviPlaylists(playlists);
             }
             setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
  };

  const handleFilterSongs = (artist: string, genre: string, year: string) => {
    setActiveArtist(artist);
    setActiveGenre(genre);
    setActiveYear(year);
    setActiveQuickList(null); 
    setActiveSearchQuery('');
    setPage(0);
    if (viewMode !== 'navi_songs') {
        setViewMode('navi_songs');
        setSelectedPlaylistId(null);
    }
    fetchSongs(0, pageSize, artist, genre, year, undefined);
  };

  const handleQuickListChange = (type: QuickListType) => {
    if (activeQuickList === type) {
        setActiveQuickList(null);
        setPage(0);
        fetchSongs(0, pageSize, '', '', '', undefined);
    } else {
        setActiveQuickList(type);
        if (viewMode !== 'navi_songs') {
            setViewMode('navi_songs');
            setSelectedPlaylistId(null);
        }
        setActiveArtist('');
        setActiveGenre('');
        setActiveYear('');
        setActiveSearchQuery('');
        setPage(0);
        fetchSongs(0, pageSize, '', '', '', type);
    }
  };

  const handleSearch = async (query: string) => {
      setActiveSearchQuery(query);
      if (!query.trim()) {
          handleLibrarySongsClick();
          return;
      }
      setLoadingNavi(true);
      setPage(0);
      setActiveArtist('');
      setActiveGenre('');
      setActiveYear('');
      setActiveQuickList(null);
      setSelectedPlaylistId(null);
      if (viewMode !== 'navi_songs') setViewMode('navi_songs');
      try {
          const { songs, total } = await navidromeService.searchSongs(query, pageSize, 0);
          setNaviSongs(songs);
          setTotalSongs(total);
      } catch(e) {
          console.error(e);
      } finally {
          setLoadingNavi(false);
      }
  };

  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    if (viewMode === 'navi_songs') {
        if (activeSearchQuery) {
            setLoadingNavi(true);
            const { songs, total } = await navidromeService.searchSongs(activeSearchQuery, pageSize, newPage * pageSize);
            setNaviSongs(songs);
            setTotalSongs(total);
            setLoadingNavi(false);
        } else {
            fetchSongs(newPage, pageSize, activeArtist, activeGenre, activeYear, activeQuickList);
        }
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
    if (viewMode === 'navi_songs') {
        if (activeSearchQuery) {
            handleSearch(activeSearchQuery);
        } else {
            fetchSongs(0, newSize, activeArtist, activeGenre, activeYear, activeQuickList);
        }
    }
  };

  const handleLibrarySongsClick = () => {
    setViewMode('navi_songs'); 
    setSelectedPlaylistId(null);
    setActiveSearchQuery('');
    const defaultPageSize = 100;
    setPageSize(defaultPageSize);
    setPage(0);
    fetchSongs(0, defaultPageSize, activeArtist, activeGenre, activeYear, activeQuickList);
  };

  const handleToggleFavorite = async (song: NaviSong) => {
    const isStarred = !!song.starred;
    const success = await navidromeService.toggleStar(song.id, isStarred);
    if (success) {
        const updateSongs = (prev: NaviSong[]) => prev.map(s => {
            if (s.id === song.id) {
                return { ...s, starred: isStarred ? undefined : new Date().toISOString() };
            }
            return s;
        });
        setNaviSongs(updateSongs);
        if (viewMode === 'navi_favorites' && isStarred) {
             setNaviSongs(prev => prev.filter(s => s.id !== song.id));
        }
    }
  };

  const handleSetRating = async (songId: string, rating: number) => {
     const success = await navidromeService.setRating(songId, rating);
     if (success) {
         setNaviSongs(prev => prev.map(s => s.id === songId ? { ...s, userRating: rating } : s));
     }
  };

  const handleOpenInfo = (song: NaviSong) => {
      setInfoSong(song);
      setShowInfoModal(true);
  };

  const handleOpenGroupTagEditor = (song: NaviSong) => {
      setGroupTagSong(song);
      setShowGroupTagModal(true);
  };

  const handleUpdateSongComments = (newComments: string) => {
      if (groupTagSong) {
          setNaviSongs(prev => prev.map(s => 
              s.id === groupTagSong.id ? { ...s, comment: newComments } : s
          ));
      }
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
        setSelectedSongIds(prev => [...prev, id]);
    } else {
        setSelectedSongIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
      if (selected) {
          const currentVisibleIds = naviSongs.map(s => s.id);
          setSelectedSongIds(currentVisibleIds);
      } else {
          setSelectedSongIds([]);
      }
  };

  const playNaviSong = (song: NaviSong) => {
    if (currentTrack?.id === song.id) {
        togglePlayPause();
        return;
    }
    const src = navidromeService.getStreamUrl(song.id);
    const track: PlayerTrack = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        coverUrl: navidromeService.getCoverArtUrl(song.coverArt || song.id),
        src,
        duration: song.duration || 0,
        sourceType: 'navidrome'
    };
    loadAndPlay(track);
  };

  const playSpotifyTrack = (track: SpotifyTrack) => {
      if (!track.preview_url) return;
      if (currentTrack?.id === track.id) {
          togglePlayPause();
          return;
      }
      const playerTrack: PlayerTrack = {
          id: track.id,
          title: track.name,
          artist: track.artists[0].name,
          coverUrl: track.album.images[0]?.url || null,
          src: track.preview_url,
          duration: 30, // Spotify previews are 30s
          sourceType: 'spotify_preview'
      };
      loadAndPlay(playerTrack);
  };

  const loadAndPlay = (track: PlayerTrack) => {
    if (audioRef.current) {
        audioRef.current.src = track.src;
        audioRef.current.play();
        setCurrentTrack(track);
        setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const handleNext = () => {
      if (!currentTrack) return;
      if (currentTrack.sourceType === 'navidrome' && naviSongs.length > 0) {
        const currentIndex = naviSongs.findIndex(s => s.id === currentTrack.id);
        if (currentIndex === -1 || currentIndex >= naviSongs.length - 1) return;
        playNaviSong(naviSongs[currentIndex + 1]);
      }
  };

  const handlePrevious = () => {
      if (!currentTrack) return;
      if (audioRef.current && audioRef.current.currentTime > 3) {
          audioRef.current.currentTime = 0;
          return;
      }
      if (currentTrack.sourceType === 'navidrome' && naviSongs.length > 0) {
        const currentIndex = naviSongs.findIndex(s => s.id === currentTrack.id);
        if (currentIndex > 0) {
            playNaviSong(naviSongs[currentIndex - 1]);
        } else {
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
      }
  };

  const handleSongEnd = () => {
      handleNext();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleSettingsMode = () => {
    if (viewMode === 'settings') {
        handleLibrarySongsClick();
    } else {
        setViewMode('settings');
        setSelectedPlaylistId(null);
    }
  };

  const renderNaviContent = () => {
    if (loadingNavi) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>;

    if (viewMode === 'settings') {
        if (activeSettingsTab === 'groups') {
            return (
                <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950">
                    <GroupSettings 
                        groups={tagGroups}
                        onGroupsChange={loadGroupsFromStorage}
                    />
                </div>
            );
        }
        if (activeSettingsTab === 'spotify') {
            return (
                <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950">
                    <SpotifySettings />
                </div>
            );
        }
        return <div className="p-10 text-zinc-500">Selecione uma opção de configuração.</div>;
    }

    if (viewMode === 'spotify_browse') {
        return <SpotifyBrowse onPreview={playSpotifyTrack} />;
    }

    if (viewMode === 'navi_songs' || viewMode === 'navi_playlist' || viewMode === 'navi_favorites') {
        const isPlaylistOrFav = viewMode === 'navi_playlist' || viewMode === 'navi_favorites';
        return (
            <div className="h-full">
                <SongTable 
                    songs={naviSongs} 
                    onPlay={playNaviSong} 
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    availableArtists={availableArtistNames}
                    availableGenres={availableGenres}
                    onFilter={isPlaylistOrFav ? undefined : handleFilterSongs}
                    onQuickListChange={isPlaylistOrFav ? undefined : handleQuickListChange}
                    onSearch={isPlaylistOrFav ? undefined : handleSearch}
                    onSetRating={handleSetRating}
                    activeArtist={isPlaylistOrFav ? '' : activeArtist}
                    activeGenre={isPlaylistOrFav ? '' : activeGenre}
                    activeYear={isPlaylistOrFav ? '' : activeYear}
                    activeQuickList={isPlaylistOrFav ? null : activeQuickList}
                    activeSearchQuery={isPlaylistOrFav ? '' : activeSearchQuery}
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalSongs}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    hasMore={isPlaylistOrFav ? false : naviSongs.length === pageSize}
                    selectedIds={selectedSongIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    onToggleFavorite={handleToggleFavorite}
                    onInfo={handleOpenInfo}
                    onGroupEdit={handleOpenGroupTagEditor}
                />
            </div>
        );
    }
    if (viewMode === 'navi_albums') {
        return (
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {naviAlbums.map(album => (
                        <div key={album.id} className="group cursor-pointer">
                            <div className="aspect-square rounded-xl bg-zinc-900 mb-3 overflow-hidden border border-zinc-800 relative group-hover:border-indigo-500/50 transition-colors">
                                <img src={navidromeService.getCoverArtUrl(album.coverArt || album.id) || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            </div>
                            <h4 className="font-bold text-zinc-200 truncate text-sm">{album.name}</h4>
                            <p className="text-zinc-500 text-xs truncate">{album.artist}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (viewMode === 'navi_artists') {
        return (
             <div className="h-full overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {naviArtists.map(artist => (
                        <div key={artist.id} className="flex flex-col items-center text-center p-4 bg-zinc-900/50 rounded-xl hover:bg-zinc-800 transition-colors">
                            <div className="w-24 h-24 rounded-full bg-zinc-800 mb-3 overflow-hidden border-2 border-zinc-800">
                                <Mic2 className="w-10 h-10 text-zinc-600 m-auto mt-6" />
                            </div>
                            <h4 className="font-medium text-zinc-200 text-sm truncate w-full">{artist.name}</h4>
                            <span className="text-xs text-zinc-500">{artist.albumCount} Álbuns</span>
                        </div>
                    ))}
                </div>
             </div>
        );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleSongEnd} />

      {/* 1. LEFT MAIN SIDEBAR */}
      <div 
        className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} border-r border-zinc-800 bg-zinc-900/80 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative z-30`}
      >
         <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-6'} border-b border-zinc-800`}>
            {!isSidebarCollapsed && (
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                        <Disc3 className="w-5 h-5 text-white"/> 
                    </div>
                    <h1 className="font-bold tracking-tight whitespace-nowrap">SonicTag</h1>
                </div>
            )}
            
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
            >
                {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
         </div>

         <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar">
            {viewMode === 'settings' ? (
                <div className="animate-fade-in space-y-2">
                    <button
                        onClick={handleLibrarySongsClick}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-colors mb-4 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {!isSidebarCollapsed && "Voltar à Biblioteca"}
                    </button>

                     <button
                        onClick={() => setActiveSettingsTab('groups')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'groups' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        {!isSidebarCollapsed && "Grupos de Tags"}
                    </button>

                    <button
                        onClick={() => setActiveSettingsTab('spotify')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'spotify' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png" className="w-4 h-4 flex-shrink-0 object-contain" alt="" />
                        {!isSidebarCollapsed && "Spotify API"}
                    </button>
                </div>
            ) : (
                <>
                    {/* NAVI SECTION */}
                    <div className="animate-fade-in">
                        {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Navidrome</h3>}
                        <div className="space-y-1">
                            <button onClick={handleLibrarySongsClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'navi_songs' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                <ListMusic className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Músicas</span>}
                            </button>
                            <button onClick={() => { setViewMode('navi_albums'); setSelectedPlaylistId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'navi_albums' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                <Library className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Álbuns</span>}
                            </button>
                            <button onClick={() => { setViewMode('navi_artists'); setSelectedPlaylistId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'navi_artists' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                <Mic2 className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Artistas</span>}
                            </button>
                            <button onClick={handleFavoritesClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'navi_favorites' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                <Heart className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Favoritos</span>}
                            </button>
                        </div>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="animate-fade-in mt-6">
                            <div className="flex items-center justify-between px-3 mb-2 group">
                                <button onClick={() => setIsPlaylistsExpanded(!isPlaylistsExpanded)} className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors">
                                    {isPlaylistsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    <span>Playlists</span>
                                </button>
                                <button onClick={() => setShowCreatePlaylistModal(true)} className="text-zinc-600 hover:text-white transition-colors p-0.5 hover:bg-zinc-800 rounded">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {isPlaylistsExpanded && (
                                <div className="space-y-1">
                                    {naviPlaylists.map(playlist => (
                                        <div key={playlist.id} className="group flex items-center gap-1 pr-1 rounded-lg hover:bg-zinc-800 transition-colors">
                                            <button onClick={() => handlePlaylistClick(playlist)} className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left overflow-hidden ${selectedPlaylistId === playlist.id ? 'text-indigo-400' : 'text-zinc-400 hover:text-white'}`}>
                                                <List className="w-4 h-4 flex-shrink-0" /> 
                                                <span className="truncate">{playlist.name}</span>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id, playlist.name); }} className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SPOTIFY SECTION */}
                    <div className="animate-fade-in mt-6">
                        {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                             Spotify
                        </h3>}
                        <div className="space-y-1">
                            <button 
                                onClick={() => setViewMode('spotify_browse')} 
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'spotify_browse' ? 'bg-green-500/10 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Navigation className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Navegar</span>}
                            </button>
                        </div>
                    </div>
                </>
            )}
         </div>

         <div className="p-3 border-t border-zinc-800 mt-auto">
            <button onClick={toggleSettingsMode} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'settings' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                {viewMode === 'settings' ? <X className="w-4 h-4 flex-shrink-0" /> : <Settings className="w-4 h-4 flex-shrink-0" />}
                {!isSidebarCollapsed && <span className="animate-fade-in">{viewMode === 'settings' ? 'Fechar Opções' : 'Configurações'}</span>}
            </button>
         </div>
      </div>

      {/* 3. MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        <div className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 flex-shrink-0 z-20">
            <h2 className="font-semibold text-lg flex items-center gap-2">
                {viewMode === 'navi_songs' && <><ListMusic className="w-5 h-5 text-indigo-500" /> Músicas</>}
                {viewMode === 'navi_albums' && <><Library className="w-5 h-5 text-indigo-500" /> Álbuns</>}
                {viewMode === 'navi_artists' && <><Mic2 className="w-5 h-5 text-indigo-500" /> Artistas</>}
                {viewMode === 'spotify_browse' && <><img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png" className="w-5 h-5 object-contain" /> Navegador Spotify</>}
                {viewMode === 'settings' && (
                    <>
                        <Settings className="w-5 h-5 text-indigo-500" />
                        {activeSettingsTab === 'groups' ? 'Gerenciar Grupos' : activeSettingsTab === 'spotify' ? 'Configurar Spotify' : 'Configurações'}
                    </>
                )}
                {viewMode === 'navi_favorites' && <><Heart className="w-5 h-5 text-indigo-500 fill-indigo-500" /> Favoritos</>}
                {viewMode === 'navi_playlist' && <><List className="w-5 h-5 text-indigo-500" /> {naviPlaylists.find(p => p.id === selectedPlaylistId)?.name || 'Playlist'}</>}
            </h2>
            <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-mono">ONLINE</span>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
             {renderNaviContent()}
             {selectedSongIds.length > 0 && viewMode !== 'settings' && viewMode !== 'spotify_browse' && (
                 <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 z-50 animate-fade-in-up">
                     <span className="text-sm font-semibold text-white mr-2">{selectedSongIds.length} selecionadas</span>
                     <div className="h-4 w-px bg-zinc-700"></div>
                     <button onClick={() => setShowAddToPlaylistModal(true)} className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors">
                         <Plus className="w-4 h-4" />
                         <span>Adicionar</span>
                     </button>
                     <button onClick={() => setShowRemoveFromPlaylistModal(true)} className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors">
                         <ListX className="w-4 h-4" />
                         <span>Remover de...</span>
                     </button>
                     {selectedPlaylistId && (
                        <button onClick={handleQuickRemoveFromCurrent} className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-red-400 hover:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                            <span>Remover desta</span>
                        </button>
                     )}
                     <button onClick={() => setSelectedSongIds([])} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                     </button>
                 </div>
             )}
        </div>

        {currentTrack && (
            <div className="h-24 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-30 flex-shrink-0">
                <div className="flex items-center gap-4 w-1/3 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden relative border border-zinc-700 flex-shrink-0">
                        {currentTrack.coverUrl ? (
                            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <Disc3 className="w-6 h-6 text-zinc-600 m-auto mt-4" />
                        )}
                        {currentTrack.sourceType === 'spotify_preview' && (
                            <div className="absolute top-0 right-0 p-0.5 bg-green-500 rounded-bl">
                                <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Black.png" className="w-2 h-2" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                        <h4 className="text-white font-medium text-sm truncate">{currentTrack.title}</h4>
                        <p className="text-zinc-500 text-xs truncate">{currentTrack.artist}</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 w-1/3">
                    <div className="flex items-center gap-6">
                        <button onClick={handlePrevious} className="text-zinc-400 hover:text-white transition-colors">
                            <SkipBack className="w-5 h-5" />
                        </button>
                        <button onClick={togglePlayPause} className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform active:scale-95">
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors">
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="w-full max-w-md flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
                            <div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
                            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono w-8">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 w-1/3">
                    <Volume2 className="w-4 h-4 text-zinc-400" />
                    <div className="w-24 h-1 bg-zinc-800 rounded-full relative group">
                        <div className="absolute top-0 left-0 h-full bg-zinc-500 group-hover:bg-indigo-500 rounded-full transition-colors" style={{ width: `${volume * 100}%` }} />
                        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                </div>
            </div>
        )}
      </div>

      {showCreatePlaylistModal && <CreatePlaylistModal onClose={() => setShowCreatePlaylistModal(false)} onCreate={handleCreatePlaylist} />}
      {showAddToPlaylistModal && <PlaylistSelectorModal mode="add" playlists={naviPlaylists} onClose={() => setShowAddToPlaylistModal(false)} onSelect={handleAddToPlaylist} />}
      {showRemoveFromPlaylistModal && <PlaylistSelectorModal mode="remove" playlists={naviPlaylists} onClose={() => setShowRemoveFromPlaylistModal(false)} onSelect={handleRemoveFromPlaylist} />}
      {showInfoModal && infoSong && <SongInfoModal song={infoSong} onClose={() => setShowInfoModal(false)} />}
      {showGroupTagModal && groupTagSong && <GroupTagModal song={groupTagSong} groups={tagGroups} onClose={() => setShowGroupTagModal(false)} onUpdateComments={handleUpdateSongComments} />}
      <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
};

export default App;