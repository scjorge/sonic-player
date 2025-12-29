import React, { useState, useEffect, useRef } from 'react';
import { NaviSong, NaviAlbum, NaviArtist, NaviPlaylist, PlayerTrack, TagGroup, SpotifyTrack, SpotifyCredentials } from './types';
import { navidromeService } from './src/services/navidromeService.ts';
import { spotifyService } from './src/services/spotifyService.ts';
import { tidalService } from './src/services/tidalService.ts';
import TidalBrowse from './src/components/tidal/TidalBrowse.tsx';
import TidalLiked from './src/components/tidal/TidalLiked.tsx';
import TidalPlaylists from './src/components/tidal/TidalPlaylists.tsx';
import NaviDownloads from './src/components/library/Downloads.tsx';
import { TIDAL_COLUMN_CONFIG } from './src/components/tidal/tidalConstants.ts';
import { BACKEND_BASE_URL, TIDAL_QUALITY } from './src/core/config.ts';
import { getStoredGroups, getSpotifyCredentials } from './src/services/data.ts';
import { Disc3, Radio, Mic2, Library, ListMusic, Play, Pause, SkipBack, SkipForward, Volume2, List, ChevronDown, ChevronRight, Plus, X, Trash2, ListX, Heart, PanelLeftClose, PanelLeftOpen, Settings, Tag, ArrowLeft, Navigation, AlertCircle, Download } from 'lucide-react';
import SongTable from './src/components/library/SongTable.tsx';
import CreatePlaylistModal from './src/components/library/CreatePlaylistModal.tsx';
import PlaylistSelectorModal from './src/components/library/PlaylistSelectorModal.tsx';
import SongInfoModal from './src/components/library/SongInfoModal.tsx';
import ConfirmationModal from './src/components/library/ConfirmationModal.tsx';
import GroupSettings from './src/components/settings/GroupSettings.tsx';
import GroupTagModal from './src/components/library/GroupTagModal.tsx';
import SpotifySettings from './src/components/settings/SpotifySettings.tsx';
import TidalSettings from './src/components/settings/TidalSettings.tsx';
import NavidromeSettings from './src/components/settings/NavidromeSettings.tsx';
import LikedSongs from './src/components/spotify/LikedSongs.tsx';
import SpotifyPlaylists from './src/components/spotify/SpotifyPlaylists.tsx';
import { SPOTIFY_COLUMN_CONFIG } from './src/components/spotify/spotifyConstants.ts';
import { SimpleConsoleLogger } from 'typeorm';

type ViewMode = 'navi_songs' | 'navi_albums' | 'navi_artists' | 'navi_playlist' | 'navi_favorites' | 'navi_downloads' | 'settings' | 'spotify_browse' | 'spotify_liked' | 'spotify_playlists' | 'spotify_playlist_tracks' | 'tidal_browse' | 'tidal_liked' | 'tidal_playlists' | 'tidal_playlist_tracks';
type SettingsTab = 'navidrome' | 'groups' | 'spotify' | 'tidal' | 'general'; 
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

  const [totalSpotifyBrowseItems, setTotalSpotifyBrowseItems] = useState(0);
  const [spotifyBrowsePageSize, setSpotifyBrowsePageSize] = useState(50);

  // --- STATE: VIEW & MODALS ---
  const [viewMode, setViewMode] = useState<ViewMode>('navi_songs');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('navidrome');
  const [navidromeConnected, setNavidromeConnected] = useState<boolean | null>(null);
  const [navidromeStatusMessage, setNavidromeStatusMessage] = useState<string | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true);
  
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistName, setselectedPlaylistName] = useState<string | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [showRemoveFromPlaylistModal, setShowRemoveFromPlaylistModal] = useState(false);

  // Tag Groups State (Carregado do LocalStorage)
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [spotifyBrowseTracks, setSpotifyBrowseTracks] = useState<NaviSong[]>([]);
  const [spotifyNavidromeExistenceMap, setSpotifyNavidromeExistenceMap] = useState<Map<string, boolean>>(new Map()); 
  // TIDAL cross-search state (used when triggering TIDAL search from other views)
  const [tidalInitialQuery, setTidalInitialQuery] = useState<string>('');
  const [tidalAutoFocus, setTidalAutoFocus] = useState<boolean>(false);

  // Tidal search state
  const [tidalTracks, setTidalTracks] = useState<NaviSong[]>([]);
  const [tidalTotal, setTidalTotal] = useState(0);
  const [tidalPageSize, setTidalPageSize] = useState(50);

  const [spotifyCreds, setSpotifyCreds] = useState<SpotifyCredentials | null>(null);

  const didInitRef = useRef(false);

  const loadGroupsFromStorage = async () => {
      const groups = await getStoredGroups();
      setTagGroups(groups);
  };

  useEffect(() => {
    loadGroupsFromStorage();
    checkNavidromeConnection();
  }, []);

    const checkNavidromeConnection = async () => {
        try {
            const res = await navidromeService.ping();
            setNavidromeConnected(res.ok);
            setNavidromeStatusMessage(res.ok ? null : (res.message || 'Falha na conexão'));
        } catch (e) {
            setNavidromeConnected(false);
            setNavidromeStatusMessage(e?.message || String(e));
        }
    };
  
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

  // --- SPOTIFY AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(spotifyService.isAuthenticated());
  const [authMessage, setAuthMessage] = useState('');
    // --- SPOTIFY DEVICES ---
    const [spotifyDevices, setSpotifyDevices] = useState<any[]>([]);
    const [spotifyActiveDeviceId, setSpotifyActiveDeviceId] = useState<string | null>(null);
    const [devicesDropdownOpen, setDevicesDropdownOpen] = useState(false);

  // --- SPOTIFY PLAYBACK SYNC ---
  useEffect(() => {
    let spotifyPlaybackInterval: NodeJS.Timeout;

    const syncSpotifyPlayback = async () => {
      if (currentTrack?.sourceType === 'spotify' && isPlaying) {
        const playbackState = await spotifyService.getPlaybackState();
        if (playbackState && playbackState.item) {
          setCurrentTime(playbackState.progress_ms / 1000);
          setDuration(playbackState.item.duration_ms / 1000);
          setIsPlaying(playbackState.is_playing);
          if (playbackState.device) {
            setVolume(playbackState.device.volume_percent / 100);
          }
          // If track changes on spotify side
          if (playbackState.item.uri !== currentTrack.src) {
              setCurrentTrack({
                  id: playbackState.item.id,
                  title: playbackState.item.name,
                  artist: playbackState.item.artists[0]?.name || '',
                  coverUrl: playbackState.item.album.images[0]?.url || null,
                  src: playbackState.item.uri,
                  duration: playbackState.item.duration_ms / 1000,
                  sourceType: 'spotify',
              });
          }
        } else if (playbackState === null && isPlaying) {
          // Playback stopped on Spotify side
          setCurrentTrack(null);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          if (audioRef.current) audioRef.current.pause();
        }
      }
    };

    if (currentTrack?.sourceType === 'spotify' && isPlaying) {
      spotifyPlaybackInterval = setInterval(syncSpotifyPlayback, 1000); // Poll every second
    }

    return () => {
      if (spotifyPlaybackInterval) {
        clearInterval(spotifyPlaybackInterval);
      }
    };
  }, [currentTrack, isPlaying]);

    // Ensure only one player is active at a time
    const setExclusivePlayer = (newSource: 'navidrome' | 'spotify' | 'spotify_preview' | 'tidal') => {
        // Stop Spotify full-player if we're switching to any other source
        if (newSource !== 'spotify') {
            try { spotifyService.stop(); } catch (e) { /* ignore */ }
        }

        // Pause in-page audio (used by navidrome, tidal and spotify_preview) unless we're starting a preview
        if (newSource !== 'spotify_preview') {
            if (audioRef.current && !audioRef.current.paused) {
                try { audioRef.current.pause(); } catch (e) { /* ignore */ }
            }
        }
    };

  // --- EFFECTS ---

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Initial Load (Filters + Initial Data + Playlists)
  useEffect(() => {
    if (didInitRef.current) return; // impede rodar duas vezes no StrictMode
    didInitRef.current = true;
    const init = async () => {
        // Register Spotify re-authentication callback
        spotifyService.setOnAuthenticationRequiredCallback(() => {
            console.log("999999999999")
            setAuthMessage("Sua sessão do Spotify expirou. Por favor, autentique-se novamente.");
            setViewMode('settings');
            setActiveSettingsTab('spotify');
            setTimeout(() => setAuthMessage(''), 5000);
        });
        try {
            // Check for Spotify callback
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const path = window.location.pathname;

            if (path === '/callback' && code) {
                console.log("Código de autorização recebido em App.tsx:", code, 'state=', state);
                const success = await spotifyService.exchangeCodeForTokens(code);
                console.log(success, "888888888888888")
                if (success) {
                    setIsAuthenticated(true);
                } else {
                    setAuthMessage("Falha na autenticação com Spotify.");
                    setTimeout(() => setAuthMessage(''), 5000);
                }

                // Set view to spotify settings
                setViewMode('settings');
                setActiveSettingsTab('spotify');

                // Clear the code from URL after processing
                window.history.replaceState({}, document.title, window.location.pathname);
                return; // Do not proceed with normal data loading if it's a callback
            }
            
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
            } else if (viewMode === 'spotify_browse') {
                handleSpotifyBrowseClick(0, spotifyBrowsePageSize);
            }
            // if tidal_browse was default, nothing to do until user searches
        } catch (e) {
            console.error("Init failed", e);
            setAuthMessage("Erro durante a inicialização da aplicação.");
            setTimeout(() => setAuthMessage(''), 5000);
        }
    };
    init();
  }, []);

    const openTidalSearchByTitle = (q: string) => {
        if (!q) return;
        setTidalInitialQuery(q);
        setTidalAutoFocus(true);
        setViewMode('tidal_browse');
        setTimeout(() => setTidalAutoFocus(false), 500);
    };

    const openTidalSearchByISRC = (isrc: string) => {
        if (!isrc) return;
        setTidalInitialQuery(isrc);
        setTidalAutoFocus(true);
        setViewMode('tidal_browse');
        setTimeout(() => setTidalAutoFocus(false), 500);
    };

    // Load Spotify devices when authenticated
    useEffect(() => {
        const load = async () => {
            if (!isAuthenticated) return;
            try {
                const devices = await spotifyService.getDevices();
                setSpotifyDevices(devices);
                const active = await spotifyService.getActiveDevice();
                setSpotifyActiveDeviceId(active);
            } catch (e) {
                console.error('Failed loading spotify devices', e);
            }
        };
        load();
    }, [isAuthenticated]);

    const toggleDevicesDropdown = async () => {
        if (!devicesDropdownOpen) {
            try {
                const devices = await spotifyService.getDevices();
                setSpotifyDevices(devices);
                const active = await spotifyService.getActiveDevice();
                setSpotifyActiveDeviceId(active);
            } catch (e) {
                console.error('Failed to refresh devices', e);
            }
        }
        setDevicesDropdownOpen(prev => !prev);
    };

    const selectSpotifyDevice = async (deviceId: string) => {
        setDevicesDropdownOpen(false);
        try {
            const ok = await spotifyService.transferPlayback(deviceId, true);
            if (ok) setSpotifyActiveDeviceId(deviceId);
        } catch (e) {
            console.error('Failed to transfer playback', e);
        }
    };

  // Load Navidrome Data when View Changes (Specific views)
  useEffect(() => {
    const loadData = async () => {
        if (viewMode === 'navi_albums' && naviAlbums.length === 0) {
            setLoadingNavi(true);
            try {
                const albums = await navidromeService.getAlbums('newest', 50);
                setNaviAlbums(albums);
            } catch (e) {
                console.error('Failed loading albums', e);
            } finally {
                setLoadingNavi(false);
            }
        } else if (viewMode === 'navi_artists' && naviArtists.length === 0) {
            setLoadingNavi(true);
            try {
                const artists = await navidromeService.getArtists();
                setNaviArtists(artists);
            } catch (e) {
                console.error('Failed loading artists', e);
            } finally {
                setLoadingNavi(false);
            }
        }
    };
    loadData();
  }, [viewMode]);

    useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const init = async () => {
      // ...existing code...

      // depois de registrar callbacks / antes ou depois de carregar Navidrome
      try {
        const creds = await getSpotifyCredentials();
        setSpotifyCreds(creds);
      } catch (e) {
        console.error('Failed to load spotify credentials', e);
        setSpotifyCreds({
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          accessToken: '',
          refreshToken: '',
          expiresAt: 0,
        });
      }

      // ...existing code...
    };
    init();
  }, []);

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

  const handleSpotifyPlaylistClick = async (playlist: NaviPlaylist) => {
    setLoadingNavi(true);
    setViewMode('spotify_playlist_tracks');
    setSelectedPlaylistId(playlist.id);
    setselectedPlaylistName(playlist.name);
    setActiveSearchQuery('');
    setPage(0);

    const currentSize = pageSize > 50 ? 50 : pageSize;
    if (pageSize > 50) {
      setPageSize(50);
    }

    try {
        const { items, total } = await spotifyService.getPlaylistTracks(playlist.id, 0, currentSize);
        const mappedSongs: NaviSong[] = await spotifyService.getSpotifyMappedTracks(items);
        setNaviSongs(mappedSongs);
        setTotalSongs(total);

        // Check Navidrome existence for each song in the playlist
        const existenceChecks = await Promise.all(mappedSongs.map(async song => {
            const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
            return [song.id, exists] as [string, boolean];
        }));
        setSpotifyNavidromeExistenceMap(new Map(existenceChecks));
    } catch (e) {
        console.error("Fetch spotify playlist failed", e);
    } finally {
        setLoadingNavi(false);
    }
  };

    const handleTidalPlaylistClick = async (playlist: NaviPlaylist) => {
        setLoadingNavi(true);
        setViewMode('tidal_playlist_tracks');
        setSelectedPlaylistId(playlist.id);
        setselectedPlaylistName(playlist.name); // reuse field for display
        setActiveSearchQuery('');
        setPage(0);

        const currentSize = pageSize > 100 ? 100 : pageSize;
        if (pageSize > 100) setPageSize(100);

        try {
            const { items, total } = await tidalService.getPlaylistItems(playlist.id, 0, currentSize);
            const mappedSongs = items || [];
            setNaviSongs(mappedSongs);
            setTotalSongs(total || mappedSongs.length);

            const existenceChecks = await Promise.all(mappedSongs.map(async song => {
                    const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
                    return [song.id, exists] as [string, boolean];
            }));
            setSpotifyNavidromeExistenceMap(new Map(existenceChecks));
        } catch (e) {
            console.error('Fetch tidal playlist failed', e);
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

  const handleSpotifyBrowseSearch = async (query: string, pageNum: number = 0, size: number = spotifyBrowsePageSize) => {
      setActiveSearchQuery(query);
      if (!query.trim()) {
          // If query is empty, load new releases instead
          handleSpotifyBrowseClick(pageNum, size);
          return;
      }
      setLoadingNavi(true);
      setPage(pageNum);
      setSpotifyBrowsePageSize(size);
      try {
          const offset = pageNum * size;
          const { items: results, total } = await spotifyService.searchTracks(query, size, offset);
          const mappedSongs: NaviSong[] = await spotifyService.getSpotifyMappedTracks(results);
          setSpotifyBrowseTracks(mappedSongs);
          setTotalSpotifyBrowseItems(total);

          // Check Navidrome existence for each song
          const existenceChecks = await Promise.all(mappedSongs.map(async song => {
              const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
              return [song.id, exists] as [string, boolean];
          }));
          setSpotifyNavidromeExistenceMap(new Map(existenceChecks));
      } catch (e) {
          console.error("Failed to search Spotify tracks", e);
          setSpotifyBrowseTracks([]);
          setTotalSpotifyBrowseItems(0);
      } finally {
          setLoadingNavi(false);
      }
  };

  const handleTidalSearch = async (query: string, pageNum: number = 0, size: number = tidalPageSize) => {
      setActiveSearchQuery(query);
      if (!query.trim()) {
          // clear results
          setTidalTracks([]);
          setTidalTotal(0);
          return;
      }
      setLoadingNavi(true);
      setPage(pageNum);
      setTidalPageSize(size);
      try {
          const offset = pageNum * size;
          const { items, total } = await tidalService.searchTracks(query, size, offset);
          setTidalTracks(items);
          setTidalTotal(total || items.length);
      } catch (e) {
          console.error('Failed to search TIDAL tracks', e);
          setTidalTracks([]);
          setTidalTotal(0);
      } finally {
          setLoadingNavi(false);
      }
  };

  const handleSpotifyBrowsePageChange = (newPage: number) => {
    if (activeSearchQuery) {
      handleSpotifyBrowseSearch(activeSearchQuery, newPage, spotifyBrowsePageSize);
    } else {
      handleSpotifyBrowseClick(newPage, spotifyBrowsePageSize);
    }
  };

  const handleSpotifyBrowsePageSizeChange = (newSize: number) => {
    // Spotify API has a maximum limit of 50 items per request for search.
    // New releases might also have a limit.
    const effectiveSize = Math.min(newSize, 50);
    setSpotifyBrowsePageSize(effectiveSize);
    if (activeSearchQuery) {
      handleSpotifyBrowseSearch(activeSearchQuery, 0, effectiveSize);
    } else {
      handleSpotifyBrowseClick(0, effectiveSize);
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
    } else if (viewMode === 'spotify_playlist_tracks' && selectedPlaylistId) {
        setLoadingNavi(true);
        try {
            const { items, total } = await spotifyService.getPlaylistTracks(selectedPlaylistId, newPage * pageSize, pageSize);
            const mappedSongs: NaviSong[] = await spotifyService.getSpotifyMappedTracks(items);
            setNaviSongs(mappedSongs);
            setTotalSongs(total);

            // Check Navidrome existence for each song in the playlist
            const existenceChecks = await Promise.all(mappedSongs.map(async song => {
                const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
                return [song.id, exists] as [string, boolean];
            }));
            setSpotifyNavidromeExistenceMap(new Map(existenceChecks));
        } catch (e) {
            console.error("Failed to fetch spotify playlist page", e);
        } finally {
            setLoadingNavi(false);
        }
    }
    else if (viewMode === 'tidal_browse') {
        // perform paginated tidal search
        const q = activeSearchQuery;
        setLoadingNavi(true);
        try {
            const offset = newPage * tidalPageSize;
            const { items, total } = await tidalService.searchTracks(q, tidalPageSize, offset);
            setTidalTracks(items);
            setTidalTotal(total || items.length);
        } catch (e) {
            console.error('Failed tidal page fetch', e);
        } finally {
            setLoadingNavi(false);
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
    } else if (viewMode === 'spotify_playlist_tracks' && selectedPlaylistId) {
        const playlistId = selectedPlaylistId;
        const fetchNewSizePage = async () => {
            setLoadingNavi(true);
            try {
                const { items, total } = await spotifyService.getPlaylistTracks(playlistId, 0, newSize);
                const mappedSongs: NaviSong[] = await spotifyService.getSpotifyMappedTracks(items);
                setNaviSongs(mappedSongs);
                setTotalSongs(total);

                // Check Navidrome existence for each song in the playlist
                const existenceChecks = await Promise.all(mappedSongs.map(async song => {
                    const exists = await navidromeService.checkIfSongExists(song.artist, song.title);
                    return [song.id, exists] as [string, boolean];
                }));
                setSpotifyNavidromeExistenceMap(new Map(existenceChecks));
            } catch (e) {
                console.error("Failed to fetch spotify playlist page", e);
            } finally {
                setLoadingNavi(false);
            }
        };
        fetchNewSizePage();
    }
    else if (viewMode === 'tidal_browse') {
        setTidalPageSize(newSize);
        setPage(0);
        if (activeSearchQuery) handleTidalSearch(activeSearchQuery, 0, newSize);
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



  const handleSpotifyBrowseClick = async (pageNum: number = 0, size: number = spotifyBrowsePageSize) => {
    setLoadingNavi(true);
    setViewMode('spotify_browse');
    setSelectedPlaylistId(null);
    setActiveSearchQuery(''); // Clear search query for browse
    setPage(pageNum);
    setSpotifyBrowsePageSize(size); // Ensure page size is updated if changed

    try {
        setSpotifyBrowseTracks([]);
        setTotalSpotifyBrowseItems(0);
        setSpotifyNavidromeExistenceMap(new Map());
    } catch (e) {
        console.error("Failed to clear Spotify browse tracks", e);
    } finally {
        setLoadingNavi(false);
    }
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
        setExclusivePlayer('navidrome');

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

  const playSpotifySong = (song: NaviSong) => {
        setExclusivePlayer('spotify');

    if (song.uri) {
      spotifyService.playTrack(song.uri);
      const playerTrack: PlayerTrack = {
            id: song.id,
            title: song.title,
            artist: song.artist,
            coverUrl: song.coverArt || null,
            src: song.path, // Not used for playback, but good for consistency
            duration: song.duration,
            sourceType: 'spotify',
        };
        setCurrentTrack(playerTrack);
        setIsPlaying(true); // Assume playback starts immediately
        setCurrentTime(0); // Reset local time for new Spotify track
        setDuration(song.duration); // Set duration based on Spotify track
    }
  };

    const playTidalSong = async (song: NaviSong) => {
        try {
            // If a path URL is provided, prefer opening it
            if (song.path) {
                window.open(song.path, '_blank');
                return;
            }

            // Ensure other players (eg. Spotify) are stopped before starting TIDAL
            setExclusivePlayer('tidal');

            // Attempt to get playback info from TIDAL
            const creds = tidalService.getCredentials();
            const info = await tidalService.getTidalPlaybackInfo(creds, song.id, TIDAL_QUALITY);
            if (!info || !info.urls || info.urls.length === 0) {
                console.warn('No playback URLs returned for TIDAL track', song.id, info);
                return;
            }

            // urls may be strings or objects with a url property
            const firstUrl: any = info.urls.find((u: any) => typeof u === 'string' || (u && (u.url || u.uri))) || info.urls[0];
            let streamUrl: string | null = null;
            if (typeof firstUrl === 'string') streamUrl = firstUrl;
            else if (firstUrl && firstUrl.url) streamUrl = firstUrl.url;
            else if (firstUrl && firstUrl.uri) streamUrl = firstUrl.uri;

            if (!streamUrl) {
                console.warn('Unable to determine stream URL from TIDAL playback info', info);
                return;
            }

            const playerTrack: PlayerTrack = {
                id: song.id,
                title: song.title,
                artist: song.artist,
                coverUrl: song.coverArt || null,
                src: streamUrl,
                duration: song.duration || 0,
                sourceType: 'tidal',
            };

            loadAndPlay(playerTrack);
        } catch (e) {
            console.error('Failed to play TIDAL track', e);
            // fallback: open path if available
            if (song.path) window.open(song.path, '_blank');
        }
    };

    const playTidalDownloadedSong = (song: NaviSong) => {
        setExclusivePlayer('tidal');

        if (currentTrack?.id === song.id && currentTrack.sourceType === 'tidal') {
            togglePlayPause();
            return;
        }

        const streamUrl = `${BACKEND_BASE_URL}/api/downloads/stream?id=${encodeURIComponent(song.id)}`;

        const playerTrack: PlayerTrack = {
            id: song.id,
            title: song.title,
            artist: song.artist,
            coverUrl: song.coverArt || null,
            src: streamUrl,
            duration: song.duration || 0,
            sourceType: 'tidal',
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
    if (!currentTrack) return;

    if (currentTrack.sourceType === 'spotify') {
      spotifyService.togglePlayPause();
    } else if (audioRef.current) {
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
    if (currentTrack?.sourceType === 'spotify') {
      spotifyService.seek(time * 1000);
    } else if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const handleNext = () => {
      if (!currentTrack) return;

      if (currentTrack.sourceType === 'spotify') {
        spotifyService.skipToNext();
      } else if (currentTrack.sourceType === 'navidrome' && naviSongs.length > 0) {
        const currentIndex = naviSongs.findIndex(s => s.id === currentTrack.id);
        if (currentIndex === -1 || currentIndex >= naviSongs.length - 1) return;
        playNaviSong(naviSongs[currentIndex + 1]);
      }
  };

  const handlePrevious = () => {
      if (!currentTrack) return;

      if (currentTrack.sourceType === 'spotify') {
        spotifyService.skipToPrevious();
      } else if (currentTrack.sourceType === 'navidrome' && naviSongs.length > 0) {
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }
        const currentIndex = naviSongs.findIndex(s => s.id === currentTrack.id);
        if (currentIndex > 0) {
            playNaviSong(naviSongs[currentIndex - 1]);
        } else {
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
      }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (currentTrack?.sourceType === 'spotify' || currentTrack?.sourceType === 'spotify_preview') {
      spotifyService.setVolume(Math.round(newVolume * 100));
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
    const isSpotifyView = ['spotify_browse', 'spotify_liked', 'spotify_playlists', 'spotify_playlist_tracks'].includes(viewMode);
    if (loadingNavi) return <div className="flex justify-center items-center h-full"><div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isSpotifyView ? 'border-green-500' : 'border-indigo-500'}`}></div></div>;

    if (viewMode === 'settings') {
        if (activeSettingsTab === 'navidrome') {
            return (
                <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950">
                    <NavidromeSettings onCredsChange={checkNavidromeConnection} />
                </div>
            );
        }
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
                    <SpotifySettings 
                        isAuthenticated={isAuthenticated}
                        authMessage={authMessage}
                        setIsAuthenticated={setIsAuthenticated}
                        setAuthMessage={setAuthMessage}
                    />
                </div>
            );
        }
        if (activeSettingsTab === 'tidal') {
            return (
                <div className="h-full overflow-y-auto custom-scrollbar bg-zinc-950">
                    <TidalSettings />
                </div>
            );
        }
        return <div className="p-10 text-zinc-500">Selecione uma opção de configuração.</div>;
    }

    if (viewMode === 'spotify_browse') {
        // NÃO pode usar await aqui:
        // const creds = await getSpotifyCredentials();

        if (!isAuthenticated || !spotifyCreds) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do Spotify indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Configure seu Client ID e Client Secret nas configurações do Spotify para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('spotify'); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        if (!spotifyCreds.clientId || !spotifyCreds.clientSecret) {
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
            <div className="h-full">
                <SongTable
                    songs={spotifyBrowseTracks}
                    onPlay={playSpotifySong}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    isSpotifyTable={true}
                    defaultColumns={SPOTIFY_COLUMN_CONFIG}
                    onSearch={handleSpotifyBrowseSearch}
                    activeSearchQuery={activeSearchQuery}
                    page={page}
                    pageSize={spotifyBrowsePageSize}
                    totalItems={totalSpotifyBrowseItems}
                    onPageChange={handleSpotifyBrowsePageChange}
                    onPageSizeChange={handleSpotifyBrowsePageSizeChange}
                    onNavigateToLibraryQuery={handleSearch}
                    navidromeExistenceMap={spotifyNavidromeExistenceMap}
                    onSearchTidalByTitle={openTidalSearchByTitle}
                    onSearchTidalByISRC={openTidalSearchByISRC}
                />
            </div>
        );
    }

    if (viewMode === 'tidal_liked') {
        const creds = tidalService.getCredentials();
        if (!creds?.clientId || !creds?.clientSecret) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="p-4 bg-yellow-500/10 rounded-full">
                        <AlertCircle className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Configuração Necessária</h3>
                    <p className="text-zinc-500 max-w-md">Você precisa configurar seu Client ID e Client Secret do TIDAL nas configurações antes de acessar os favoritos.</p>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        if (!tidalService.isAuthenticated()) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Sessão TIDAL não autenticada.</div>
                    <div className="text-zinc-400 mb-6">Autentique-se nas configurações do TIDAL para acessar os favoritos.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        return <TidalLiked onOpen={playTidalSong} onNavigateToLibraryQuery={handleSearch} currentTrackId={currentTrack?.id} isPlaying={isPlaying} />;
    }

    if (viewMode === 'tidal_browse') {
        const creds = tidalService.getCredentials();
        if (!creds?.clientId || !creds?.clientSecret) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="p-4 bg-yellow-500/10 rounded-full">
                        <AlertCircle className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Configuração Necessária</h3>
                    <p className="text-zinc-500 max-w-md">
                        Você precisa configurar seu Client ID e Client Secret do TIDAL nas configurações antes de buscar.
                    </p>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        if (!tidalService.isAuthenticated()) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Sessão TIDAL não autenticada.</div>
                    <div className="text-zinc-400 mb-6">Autentique-se nas configurações do TIDAL para usar a busca.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full">
                <TidalBrowse onOpen={playTidalSong} onNavigateToLibraryQuery={handleSearch} initialQuery={tidalInitialQuery} autoFocus={tidalAutoFocus} currentTrackId={currentTrack?.id} isPlaying={isPlaying} />
            </div>
        );
    }

    if (viewMode === 'spotify_liked') {
        if (!isAuthenticated) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do Spotify indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Configure seu Client ID e Client Secret nas configurações do Spotify para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('spotify'); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }
        return <LikedSongs onPlay={playSpotifySong} currentTrackId={currentTrack?.id} isPlaying={isPlaying} onNavigateToLibraryQuery={handleSearch} onSearchTidalByTitle={openTidalSearchByTitle} onSearchTidalByISRC={openTidalSearchByISRC} />;
    }

    if (viewMode === 'spotify_playlists') {
        if (!isAuthenticated) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do Spotify indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Configure seu Client ID e Client Secret nas configurações do Spotify para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('spotify'); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        return <SpotifyPlaylists onPlaylistClick={handleSpotifyPlaylistClick} />;
    }

    if (viewMode === 'tidal_playlists') {
        if (!tidalService.isAuthenticated()) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do TIDAL indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Autentique-se nas configurações do TIDAL para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        return <TidalPlaylists onPlaylistClick={handleTidalPlaylistClick} />;
    }

    if (viewMode === 'navi_downloads') {
        return (
            <NaviDownloads
                onPlayDownload={playTidalDownloadedSong}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
            />
        );
    }

    if (viewMode === 'tidal_playlist_tracks') {
        if (!tidalService.isAuthenticated()) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do TIDAL indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Autentique-se nas configurações do TIDAL para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('tidal'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        // Reuse existing naviSongs rendering for playlist tracks
        return (
            <div className="h-full">
                <SongTable
                    songs={naviSongs}
                    onPlay={playTidalSong}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    defaultColumns={TIDAL_COLUMN_CONFIG}
                    isTidalTable={true}
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalSongs}
                    onPageChange={(p) => { setPage(p); }}
                    onPageSizeChange={(s) => setPageSize(s)}
                    navidromeExistenceMap={spotifyNavidromeExistenceMap}
                    onNavigateToLibraryQuery={handleSearch}
                />
            </div>
        );
    }

    if (viewMode === 'spotify_playlist_tracks') {
        if (!isAuthenticated) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Recursos do Spotify indisponíveis.</div>
                    <div className="text-zinc-400 mb-6">Configure seu Client ID e Client Secret nas configurações do Spotify para usar este recurso.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('spotify'); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full">
                <SongTable 
                    songs={naviSongs} 
                    onPlay={playSpotifySong} 
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalSongs}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    isSpotifyTable={true}
                    defaultColumns={SPOTIFY_COLUMN_CONFIG}
                    navidromeExistenceMap={spotifyNavidromeExistenceMap}
                    onNavigateToLibraryQuery={handleSearch}
                    onSearchTidalByTitle={openTidalSearchByTitle}
                    onSearchTidalByISRC={openTidalSearchByISRC}
                />
            </div>
        );
    }
    
    if (viewMode === 'navi_songs' || viewMode === 'navi_playlist' || viewMode === 'navi_favorites') {
        const isPlaylistOrFav = viewMode === 'navi_playlist' || viewMode === 'navi_favorites';
        // If we explicitly know Navidrome is not connected, show a friendly prompt
        if (navidromeConnected === false) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Não foi possível conectar ao Navidrome.</div>
                    <div className="text-zinc-400 mb-6">Configure suas credenciais do Navidrome nas configurações para acessar a biblioteca local.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('navidrome'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

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
                    navidromeConnected={navidromeConnected}
                    onOpenNavidromeSettings={() => { setViewMode('settings'); setActiveSettingsTab('navidrome'); }}
                />
            </div>
        );
    }
    if (viewMode === 'navi_albums') {
        if (navidromeConnected === false) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Não foi possível conectar ao Navidrome.</div>
                    <div className="text-zinc-400 mb-6">Configure suas credenciais do Navidrome nas configurações para acessar álbuns.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('navidrome'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

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
        if (navidromeConnected === false) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-zinc-300 mb-4">Não foi possível conectar ao Navidrome.</div>
                    <div className="text-zinc-400 mb-6">Configure suas credenciais do Navidrome nas configurações para acessar artistas.</div>
                    <div className="flex gap-3">
                        <button onClick={() => { setViewMode('settings'); setActiveSettingsTab('navidrome'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Ir para Configurações</button>
                    </div>
                </div>
            );
        }

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
                <button type="button" onClick={() => window.location.reload()} title="Recarregar" className="flex items-center gap-3 overflow-hidden hover:opacity-90 transition-opacity">
                    <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                        <Disc3 className="w-5 h-5 text-white"/> 
                    </div>
                    <h1 className="font-bold tracking-tight whitespace-nowrap">SonicTag</h1>
                </button>
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
                        onClick={() => setActiveSettingsTab('navidrome')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'navidrome' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <img src="https://raw.githubusercontent.com/navidrome/navidrome/master/ui/public/favicon-32x32.png" className="w-4 h-4 flex-shrink-0 object-contain" alt="Navidrome" />
                        {!isSidebarCollapsed && "Navidrome"}
                    </button>

                    <button
                        onClick={() => setActiveSettingsTab('spotify')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'spotify' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png" className="w-4 h-4 flex-shrink-0 object-contain" alt="" />
                        {!isSidebarCollapsed && "Spotify API"}
                    </button>

                    <button
                        onClick={() => setActiveSettingsTab('tidal')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'tidal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <img src="https://tidal.com/favicon.ico" className="w-4 h-4 flex-shrink-0 object-contain" alt="" />
                        {!isSidebarCollapsed && "TIDAL API"}
                    </button>

                    <button
                        onClick={() => setActiveSettingsTab('groups')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${isSidebarCollapsed ? 'justify-center' : ''} ${activeSettingsTab === 'groups' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                    >
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        {!isSidebarCollapsed && "Tags/Metadados"}
                    </button>
                </div>
            ) : (
                <>
                    {/* NAVI SECTION */}
                    <div className="animate-fade-in">
                        {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">Biblioteca</h3>}
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

                            <button 
                                onClick={() => setViewMode('navi_downloads')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'navi_downloads' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Download className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Downloads</span>}
                            </button>

                    {!isSidebarCollapsed && (
                        <div className="animate-fade-in !mt-3">
                            <div className="flex items-center justify-between px-3 mb-2 group">
                                <button onClick={() => setIsPlaylistsExpanded(!isPlaylistsExpanded)} className={`flex items-center gap-3.5 text-sm font-medium ${viewMode === 'navi_playlist' ? 'text-indigo-400' : 'text-zinc-500'} tracking-wider hover:text-zinc-300 transition-colors`}>
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
                                            <button onClick={() => handlePlaylistClick(playlist)} className={`flex-1 flex items-center gap-3.5 ${isSidebarCollapsed ? 'justify-center px-3' : 'pl-10 pr-3'} py-2 rounded-lg text-sm font-medium transition-colors text-left overflow-hidden ${selectedPlaylistId === playlist.id ? 'text-indigo-400' : 'text-zinc-400 hover:text-white'}`}>
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
                    </div>
                </div>

                    {/* SPOTIFY SECTION */}
                    <div className="animate-fade-in mt-6">
                        {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">
                             Spotify
                        </h3>}
                        <div className="space-y-1">
                                                        <button
                                                            onClick={() => handleSpotifyBrowseClick(0, spotifyBrowsePageSize)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'spotify_browse' ? 'bg-green-500/10 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                                        >                                <Navigation className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Navegar</span>}
                            </button>
                            <button 
                                onClick={() => setViewMode('spotify_liked')} 
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'spotify_liked' ? 'bg-green-500/10 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Heart className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Curtidas</span>}
                            </button>
                            <button 
                                onClick={() => setViewMode('spotify_playlists')} 
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'spotify_playlists' ? 'bg-green-500/10 text-green-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <List className="w-4 h-4 flex-shrink-0" /> 
                                {!isSidebarCollapsed && <span>Playlists</span>}
                            </button>
                                                        
                        </div>
                    </div>
                    {/* TIDAL SECTION */}
                    <div className="animate-fade-in mt-6">
                        {!isSidebarCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-2">TIDAL</h3>}
                        <div className="space-y-1">
                            <button
                                onClick={() => { setViewMode('tidal_browse'); setActiveSearchQuery(''); setPage(0); setTidalTracks([]); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'tidal_browse' ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Navigation className="w-4 h-4 flex-shrink-0" />
                                {!isSidebarCollapsed && <span>Navegar</span>}
                            </button>
                            <button 
                                onClick={() => { setViewMode('tidal_liked'); setPage(0); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'tidal_liked' ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Heart className="w-4 h-4 flex-shrink-0" />
                                {!isSidebarCollapsed && <span>Curtidas</span>}
                            </button>
                            <button 
                                onClick={() => setViewMode('tidal_playlists')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${viewMode === 'tidal_playlists' ? 'bg-yellow-500/10 text-yellow-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <List className="w-4 h-4 flex-shrink-0" />
                                {!isSidebarCollapsed && <span>Playlists</span>}
                            </button>
                            {/* Downloads moved to Navidrome section */}
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
                {viewMode === 'navi_favorites' && <><Heart className="w-5 h-5 text-indigo-500 fill-indigo-500" /> Favoritos</>}
                {viewMode === 'navi_downloads' && <><Download className="w-5 h-5 text-indigo-500" /> Downloads</>}
                {viewMode === 'navi_playlist' && <><List className="w-5 h-5 text-indigo-500" /> {naviPlaylists.find(p => p.id === selectedPlaylistId)?.name || 'Playlist'}</>}
                {viewMode === 'spotify_browse' && <><Navigation className="w-4 h-4 flex-shrink-0 text-green-500" /> Navegador</>}
                {viewMode === 'spotify_liked' && <><Heart className="w-5 h-5 text-green-500 fill-green-500" /> Músicas Curtidas</>}
                {viewMode === 'spotify_playlists' && <><List className="w-5 h-5 text-green-500" /> Playlists</>}
                {viewMode === 'spotify_playlist_tracks' && <><List className="w-5 h-5 text-green-500" /> {selectedPlaylistName || 'Playlist'}</>}
                {viewMode === 'tidal_browse' && <><Navigation className="w-4 h-4 flex-shrink-0 text-yellow-500" /> Navegador</>}
                {viewMode === 'tidal_liked' && <><Heart className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Músicas Curtidas</>}
                {viewMode === 'tidal_playlists' && <><List className="w-5 h-5 text-yellow-500" /> Playlists</>}
                {viewMode === 'tidal_playlist_tracks' && <><List className="w-5 h-5 text-yellow-500" /> {selectedPlaylistName || 'Playlist'}</>}
                {viewMode === 'settings' && <><Settings className="w-5 h-5 text-indigo-500" />Configurações</>}
            </h2>
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
                        <button onClick={togglePlayPause} className={`w-10 h-10 rounded-full ${currentTrack?.sourceType === 'spotify' ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20' : currentTrack?.sourceType === 'tidal' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'} text-white flex items-center justify-center transition-transform active:scale-95`}>
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors">
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="w-full max-w-md flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
                            <div className={`absolute top-0 left-0 h-full ${currentTrack?.sourceType === 'spotify' ? 'bg-green-500' : currentTrack?.sourceType === 'tidal' ? 'bg-yellow-500' : 'bg-indigo-500'} rounded-full`} style={{ width: `${(currentTime / duration) * 100}%` }} />
                            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono w-8">{formatTime(duration)}</span>
                    </div>
                </div>

                                <div className="flex items-center justify-end gap-3 w-1/3">
                                        {isAuthenticated && (currentTrack?.sourceType === 'spotify' || currentTrack?.sourceType === 'spotify_preview') && (
                                            <div className="relative">
                                                <button onClick={toggleDevicesDropdown} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                                    <Radio className="w-4 h-4" />
                                                </button>
                                                {devicesDropdownOpen && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-56 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-50">
                                                        <div className="p-2 text-xs text-zinc-400 border-b border-zinc-800">Dispositivos</div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {spotifyDevices.length === 0 && (
                                                                <div className="p-2 text-sm text-zinc-500">Nenhum dispositivo encontrado</div>
                                                            )}
                                                            {spotifyDevices.map(d => (
                                                                <button key={d.id} onClick={() => selectSpotifyDevice(d.id)} className={`w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center justify-between ${spotifyActiveDeviceId === d.id ? 'text-green-400' : 'text-zinc-300'}`}>
                                                                    <span className="truncate mr-2">{d.name || d.id}</span>
                                                                    <span className="text-xs text-zinc-500">{d.is_active ? 'Ativo' : ''}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <Volume2 className="w-4 h-4 text-zinc-400" />
                                        <div className="w-24 h-1 bg-zinc-800 rounded-full relative group">
                                                <div className={`absolute top-0 left-0 h-full rounded-full transition-colors ${currentTrack?.sourceType === 'spotify' || currentTrack?.sourceType === 'spotify_preview' ? 'bg-green-500 group-hover:bg-green-400' : currentTrack?.sourceType === 'tidal' ? 'bg-yellow-500 group-hover:bg-yellow-400' : 'bg-indigo-500 group-hover:bg-indigo-400'}`} style={{ width: `${volume * 100}%` }} />
                                                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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