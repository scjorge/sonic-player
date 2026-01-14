import React, { useState, useEffect, useRef } from 'react';
import { NaviSong } from '../../../../types';
import { BACKEND_BASE_URL } from '../../../core/config';
import showToast from '../utils/toast';
import { Play, Pause, Download, Save, Upload, Scissors, Copy, Trash2, FolderOpen, Volume2, VolumeX, ZoomIn, ZoomOut, SkipBack, SkipForward, Plus, Layers, Music, Edit3, Link, Search } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';
import { getAudioEditorState as apiGetAudioEditorState, saveAudioEditorState as apiSaveAudioEditorState } from '../../repository/audioEditor';

type TrackOriginType = 'upload' | 'library' | 'preparo' | 'blank';

const AUDIO_EDITOR_DB_NAME = 'audioEditorDB';
const AUDIO_EDITOR_DB_VERSION = 1;
const AUDIO_EDITOR_DB_STORE = 'audioBlobs';

interface AudioTrack {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  audioUrl: string;
  file: File | null;
  volume: number;
  muted: boolean;
  startOffset: number; // Position in timeline (seconds)
  duration: number; // Visual duration (can be extended with blank space)
  originalDuration: number; // Original audio duration (cannot be reduced below this)
  regions: AudioRegion[];
  originType: TrackOriginType;
  songId?: string;
  contentType?: string;
  // Metadados de trim em relação ao áudio original (para saber de onde veio o subtrecho)
  trimStart?: number; // segundos a partir do início do arquivo original
  trimEnd?: number;   // segundos a partir do início do arquivo original
}

interface AudioRegion {
  id: string;
  start: number; // relative to track
  end: number;
  selected: boolean;
}

interface AudioEditorProps {
  onNavigateToLibrary?: () => void;
}

interface EditorSnapshot {
  tracks: AudioTrack[];
  selectedTrackId: string | null;
  currentTime: number;
  zoom: number;
  globalSelection: { start: number; end: number; trackId: string } | null;
}

interface SerializedTrack {
  id: string;
  name: string;
  audioUrl: string;
  volume: number;
  muted: boolean;
  startOffset: number;
  duration: number;
  originalDuration: number;
  regions: AudioRegion[];
  originType: TrackOriginType;
  songId?: string;
  contentType?: string;
  trimStart?: number;
  trimEnd?: number;
}

interface AudioEditorPersistedState {
  tracks: SerializedTrack[];
  zoom: number;
  currentTime: number;
  selectedTrackId: string | null;
  globalSelection: { start: number; end: number; trackId: string } | null;
}

interface AudioBlobRecord {
  id: string;
  blob: Blob;
  type: string;
}

function openAudioEditorDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB não disponível'));
      return;
    }

    const request = window.indexedDB.open(AUDIO_EDITOR_DB_NAME, AUDIO_EDITOR_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_EDITOR_DB_STORE)) {
        db.createObjectStore(AUDIO_EDITOR_DB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Falha ao abrir IndexedDB'));
    };
  });
}

async function saveTrackBlobToIndexedDB(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openAudioEditorDB();
    const tx = db.transaction(AUDIO_EDITOR_DB_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_EDITOR_DB_STORE);
    const record: AudioBlobRecord = { id, blob, type: blob.type };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar blob de áudio'));
      tx.onabort = () => reject(tx.error || new Error('Transação abortada ao salvar blob'));
    });
    db.close();
  } catch (e) {
    console.error('Erro ao salvar blob de faixa no IndexedDB', e);
  }
}

async function getTrackBlobFromIndexedDB(id: string): Promise<Blob | null> {
  try {
    const db = await openAudioEditorDB();
    const tx = db.transaction(AUDIO_EDITOR_DB_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_EDITOR_DB_STORE);
    const request = store.get(id);

    const record = await new Promise<AudioBlobRecord | undefined | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as AudioBlobRecord | undefined | null);
      request.onerror = () => reject(request.error || new Error('Falha ao ler blob de áudio'));
    });

    db.close();
    if (!record) return null;
    return record.blob;
  } catch (e) {
    console.error('Erro ao recuperar blob de faixa do IndexedDB', e);
    return null;
  }
}

async function deleteTrackBlobFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openAudioEditorDB();
    const tx = db.transaction(AUDIO_EDITOR_DB_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_EDITOR_DB_STORE);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao apagar blob de áudio'));
      tx.onabort = () => reject(tx.error || new Error('Transação abortada ao apagar blob'));
    });
    db.close();
  } catch (e) {
    console.error('Erro ao apagar blob de faixa do IndexedDB', e);
  }
}

async function clearAllTrackBlobsFromIndexedDB(): Promise<void> {
  try {
    const db = await openAudioEditorDB();
    const tx = db.transaction(AUDIO_EDITOR_DB_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_EDITOR_DB_STORE);
    store.clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao limpar blobs de áudio'));
      tx.onabort = () => reject(tx.error || new Error('Transação abortada ao limpar blobs'));
    });
    db.close();
  } catch (e) {
    console.error('Erro ao limpar blobs de faixa do IndexedDB', e);
  }
}

const AudioEditor: React.FC<AudioEditorProps> = ({ onNavigateToLibrary }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  // `zoom` is pixels per second (px/s). Higher => more zoomed in.
  const [zoom, setZoom] = useState(100);
  const [globalSelection, setGlobalSelection] = useState<{ start: number; end: number; trackId: string } | null>(null);
  const [controlsWidth, setControlsWidth] = useState<number>(192); // fallback for w-48 (12rem)
  const [isRestoringState, setIsRestoringState] = useState(false);
  const [history, setHistory] = useState<EditorSnapshot[]>([]);

  // Selection and clipboard states
  const [clipboard, setClipboard] = useState<{
    audioData: AudioBuffer;
    duration: number;
    trackId: string;
    track: any;
    // Limites do trecho copiado em relação ao áudio original da faixa de origem
    trimStart?: number;
    trimEnd?: number;
  } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ trackId: string; time: number } | null>(null);

  // Import/Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSource, setImportSource] = useState<'library' | 'preparo'>('library');
  const [importSongs, setImportSongs] = useState<NaviSong[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importSearchQuery, setImportSearchQuery] = useState('');

  // Faixa em "solo" (escutar apenas essa faixa)
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInnerRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSyncingScrollRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollRef = useRef(0);

  const pushHistory = (custom?: Partial<EditorSnapshot>) => {
    setHistory(prev => {
      const snapshot: EditorSnapshot = {
        tracks: tracks.map(t => ({ ...t, regions: [...t.regions] })),
        selectedTrackId,
        currentTime,
        zoom,
        globalSelection,
        ...custom,
      };
      const next = [...prev, snapshot];
      // Limita tamanho do histórico para evitar uso excessivo de memória
      const MAX_HISTORY = 50;
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  };

  const handleUndo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setTracks(last.tracks);
      setSelectedTrackId(last.selectedTrackId);
      setCurrentTime(last.currentTime);
      setZoom(last.zoom);
      setGlobalSelection(last.globalSelection);
      return newHistory;
    });
  };

  useEffect(() => {
    console.log('AudioEditor montado!');
    // Initialize Web Audio API
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Cleanup
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      sourceNodesRef.current.forEach(node => node.stop());
      sourceNodesRef.current.clear();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync horizontal scrolling: only listen to the lower tracks scroll and
  // update the (non-scrollable) timeline header so there is a single scrollbar.
  useEffect(() => {
    const timeline = timelineRef.current;
    const tracks = tracksScrollRef.current;
    if (!timeline || !tracks) return;

    const onTracksScroll = () => {
      if (isSyncingScrollRef.current) return;
      const inner = timelineInnerRef.current;
      if (inner && tracks) {
        inner.style.transform = `translateX(${-tracks.scrollLeft}px)`;
      }
    };

    // Add both scroll and input events to catch all scrollbar interactions
    tracks.addEventListener('scroll', onTracksScroll, { passive: true });
    tracks.addEventListener('input', onTracksScroll, { passive: true });

    // Force initial sync
    onTracksScroll();

    return () => {
      tracks.removeEventListener('scroll', onTracksScroll);
      tracks.removeEventListener('input', onTracksScroll);
    };
  }, [tracks.length]); // Re-run when tracks change

  // Measure controls width (first track-controls) and update on resize
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('.track-controls') as HTMLElement | null;
      if (el) {
        setControlsWidth(el.getBoundingClientRect().width);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    // Recalculate max duration when tracks change
    const newMaxDuration = Math.max(
      ...tracks.map(t => t.startOffset + t.duration),
      10
    );
    // Keep a small padding at the end (1s) instead of a large 20% extra space
    setMaxDuration(newMaxDuration);
  }, [tracks]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await addTrackFromFile(files[i], 'upload');
      }
    }
    e.target.value = ''; // Reset input
  };

  const addTrackFromFile = async (file: File, originType: TrackOriginType, songId?: string, contentType?: string) => {
    try {
      const trackId = `track-${Date.now()}-${Math.random()}`;
      const url = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const newTrack: AudioTrack = {
        id: trackId,
        name: file.name,
        audioBuffer,
        audioUrl: url,
        file,
        volume: 1,
        muted: false,
        startOffset: 0,
        duration: audioBuffer.duration,
        originalDuration: audioBuffer.duration,
        regions: [],
        originType,
        songId,
        contentType,
        trimStart: 0,
        trimEnd: audioBuffer.duration,
      };

      pushHistory();
      setTracks(prev => [...prev, newTrack]);
      setSelectedTrackId(newTrack.id);
      // Salva o blob original no IndexedDB para evitar novo download no futuro
      saveTrackBlobToIndexedDB(trackId, file);
      showToast(`Faixa "${file.name}" adicionada`, 'success');
    } catch (error: any) {
      showToast(`Erro ao carregar arquivo: ${error?.message || String(error)}`, 'error');
    }
  };

  const addBlankTrack = () => {
    const defaultDuration = 5; // 5 seconds default

    const newTrack: AudioTrack = {
      id: `blank-track-${Date.now()}-${Math.random()}`,
      name: `Faixa em Branco ${tracks.length + 1}`,
      audioBuffer: null,
      audioUrl: '',
      file: null,
      volume: 1,
      muted: false,
      startOffset: 0,
      duration: defaultDuration,
      originalDuration: defaultDuration,
      regions: [],
      originType: 'blank',
      trimStart: 0,
      trimEnd: defaultDuration,
    };

    pushHistory();
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrackId(newTrack.id);
    showToast(`Faixa em branco adicionada (${defaultDuration}s)`, 'success');
  };

  const handleImportFromSource = async (searchQuery: string = '') => {
    setLoadingImport(true);
    try {
      if (importSource === 'library') {
        // Usa a busca específica se houver query, senão lista todas
        const response = searchQuery ? await navidromeService.searchSongs(searchQuery, 100, 0) : { songs: [], total: 0 };
        setImportSongs(response.songs || []);
      } else {
        const res = await fetch(`${BACKEND_BASE_URL}/downloads/completed`);
        if (!res.ok) {
          throw new Error('Erro ao buscar arquivos de preparo');
        }
        const json = await res.json();
        const items = (json.items || []) as any[];
        const songs: NaviSong[] = items.map((it) => ({
          id: it.id,
          title: it.title,
          album: it.album,
          artist: it.artist,
          path: it.path,
          contentType: it.contentType,
        }));

        // Filtra por query se houver
        const filtered = searchQuery
          ? songs.filter(s =>
            s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.artist?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          : songs;

        setImportSongs(filtered);
      }
    } catch (error: any) {
      showToast(`Erro ao buscar músicas: ${error?.message || String(error)}`, 'error');
    } finally {
      setLoadingImport(false);
    }
  };

  // Busca inicial quando o modal abre
  useEffect(() => {
    if (showImportModal) {
      setImportSearchQuery('');
      handleImportFromSource('');
    }
  }, [showImportModal, importSource]);

  // Debounce para busca
  useEffect(() => {
    if (!showImportModal) return;

    const timeoutId = setTimeout(() => {
      handleImportFromSource(importSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [importSearchQuery]);

  const handleImportSong = async (song: NaviSong) => {
    try {
      let audioUrl: string;

      if (song.contentType === 'audio/preparation') {
        audioUrl = `${BACKEND_BASE_URL}/downloads/stream?id=${encodeURIComponent(song.id)}`;
      } else {
        audioUrl = navidromeService.getStreamUrl(song.id);
      }

      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo de áudio');
      }

      const blob = await response.blob();
      const file = new File([blob], `${song.title || 'audio'}.mp3`, { type: blob.type });

      const originType: TrackOriginType = song.contentType === 'audio/preparation' ? 'preparo' : 'library';
      await addTrackFromFile(file, originType, song.id, song.contentType);
      showToast(`"${song.title}" importado com sucesso`, 'success');
    } catch (error: any) {
      showToast(`Erro ao importar: ${error?.message || String(error)}`, 'error');
    }
  };

  // Restaura estado salvo do editor (tracks, seleção, zoom etc.)
  useEffect(() => {
    const restoreFromApi = async () => {
      setIsRestoringState(true);
      try {
        const parsed = await apiGetAudioEditorState();
        if (!parsed || !Array.isArray(parsed.tracks)) {
          setIsRestoringState(false);
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const restoredTracks: AudioTrack[] = [];

        for (const st of parsed.tracks) {
          let audioBuffer: AudioBuffer | null = null;
          let audioUrl = st.audioUrl || '';

          if (st.originType === 'blank') {
            audioBuffer = null;
            audioUrl = '';
          } else {
            try {
              // 1) Tenta restaurar a partir do IndexedDB (sem novo download)
              const cachedBlob = await getTrackBlobFromIndexedDB(st.id);

              if (cachedBlob) {
                const buf = await cachedBlob.arrayBuffer();
                audioBuffer = await audioContextRef.current!.decodeAudioData(buf);
                audioUrl = URL.createObjectURL(cachedBlob);
              } else {
                // 2) Fallback: baixa novamente quando for faixa de biblioteca/preparo
                let fetchUrl: string | null = null;

                if (st.originType === 'library' && st.songId) {
                  fetchUrl = navidromeService.getStreamUrl(st.songId);
                } else if (st.originType === 'preparo' && st.songId) {
                  fetchUrl = `${BACKEND_BASE_URL}/downloads/stream?id=${encodeURIComponent(st.songId)}`;
                }

                if (fetchUrl) {
                  const res = await fetch(fetchUrl);
                  if (res.ok) {
                    const blob = await res.blob();
                    const buf = await blob.arrayBuffer();
                    audioBuffer = await audioContextRef.current!.decodeAudioData(buf);
                    audioUrl = URL.createObjectURL(blob);
                    // Armazena no cache para os próximos usos
                    saveTrackBlobToIndexedDB(st.id, blob);
                  } else {
                    console.warn('Falha ao restaurar faixa do editor (download):', st.name);
                  }
                } else if (st.originType === 'upload') {
                  console.warn('Faixa de upload não pôde ser restaurada sem novo envio do arquivo:', st.name);
                }
              }

              // Se houver trimStart/trimEnd, recortamos o buffer restaurado
              if (audioBuffer && typeof st.trimStart === 'number' && typeof st.trimEnd === 'number') {
                const sampleRate = audioBuffer.sampleRate;
                const channels = audioBuffer.numberOfChannels;

                const totalDuration = audioBuffer.length / sampleRate;
                const trimStartSec = Math.max(0, Math.min(st.trimStart, totalDuration));
                const trimEndSec = Math.max(trimStartSec, Math.min(st.trimEnd, totalDuration));

                const startSample = Math.floor(trimStartSec * sampleRate);
                const endSample = Math.floor(trimEndSec * sampleRate);
                const length = endSample - startSample;

                if (length > 0 && endSample <= audioBuffer.length) {
                  const trimmedBuffer = audioContextRef.current!.createBuffer(channels, length, sampleRate);

                  for (let ch = 0; ch < channels; ch++) {
                    const src = audioBuffer.getChannelData(ch);
                    const dst = trimmedBuffer.getChannelData(ch);
                    dst.set(src.subarray(startSample, endSample));
                  }

                  audioBuffer = trimmedBuffer;
                }
              }
            } catch (e) {
              console.error('Erro ao restaurar faixa do editor', e);
            }
          }

          const effectiveDuration = audioBuffer
            ? audioBuffer.length / (audioBuffer.sampleRate || 44100)
            : st.duration;

          restoredTracks.push({
            id: st.id,
            name: st.name,
            audioBuffer,
            audioUrl,
            file: null,
            volume: st.volume,
            muted: st.muted,
            startOffset: st.startOffset,
            duration: effectiveDuration,
            originalDuration: effectiveDuration,
            regions: st.regions || [],
            originType: st.originType,
            songId: st.songId,
            contentType: st.contentType,
            trimStart: st.trimStart,
            trimEnd: st.trimEnd,
          });
        }

        setTracks(restoredTracks);
        setZoom(parsed.zoom || 100);
        setCurrentTime(parsed.currentTime || 0);
        setSelectedTrackId(parsed.selectedTrackId || null);
        setGlobalSelection(parsed.globalSelection || null);
      } catch (e) {
        console.error('Erro ao restaurar estado do AudioEditor via API', e);
      } finally {
        setIsRestoringState(false);
      }
    };

    restoreFromApi();
  }, []);

  // Salva automaticamente o estado do editor no localStorage
  useEffect(() => {
    const persist = async () => {
      try {
        const serializableTracks: SerializedTrack[] = tracks.map((t) => ({
          id: t.id,
          name: t.name,
          audioUrl: t.audioUrl,
          volume: t.volume,
          muted: t.muted,
          startOffset: t.startOffset,
          duration: t.duration,
          originalDuration: t.originalDuration,
          regions: t.regions,
          originType: t.originType,
          songId: t.songId,
          contentType: t.contentType,
          trimStart: t.trimStart,
          trimEnd: t.trimEnd,
        }));

        const payload: AudioEditorPersistedState = {
          tracks: serializableTracks,
          zoom,
          currentTime,
          selectedTrackId,
          globalSelection,
        };

        await apiSaveAudioEditorState(payload);
      } catch (e) {
        console.error('Erro ao salvar estado do AudioEditor via API', e);
      }
    };

    persist();
  }, [tracks, zoom, currentTime, selectedTrackId, globalSelection]);

  const clearEditorState = () => {
    try {
      // Revoga URLs de blob criadas para as faixas
      tracks.forEach((track) => {
        if (track.audioUrl && track.audioUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(track.audioUrl);
          } catch (e) {
            console.error('Erro ao revogar URL de blob', e);
          }
        }
      });

      // Limpa também o cache de blobs no IndexedDB
      clearAllTrackBlobsFromIndexedDB();
    } catch (e) {
      console.error('Erro ao limpar estado do AudioEditor', e);
    }

    if (isPlaying) {
      togglePlayPause();
    }

    pushHistory();
    setTracks([]);
    setSelectedTrackId(null);
    setCurrentTime(0);
    setGlobalSelection(null);
    setClipboard(null);
    setZoom(100);

    showToast('Editor limpo e estado salvo removido', 'success');
  };

  const togglePlayPause = async () => {
    if (!audioContextRef.current) return;

    if (isPlaying) {
      // Stop playback
      sourceNodesRef.current.forEach(node => {
        try {
          node.stop();
        } catch (e) {
          // Node might already be stopped
        }
      });
      sourceNodesRef.current.clear();
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const startTime = audioContextRef.current.currentTime;
      const offsetTime = currentTime;

      const isSoloActive = soloTrackId !== null;

      // Schedule all tracks (respeitando solo se ativo)
      tracks.forEach(track => {
        const shouldPlay =
          track.audioBuffer &&
          (!isSoloActive ? !track.muted : track.id === soloTrackId);

        if (shouldPlay) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = track.audioBuffer;

          const gainNode = audioContextRef.current!.createGain();
          gainNode.gain.value = track.volume;
          source.connect(gainNode);
          gainNode.connect(audioContextRef.current!.destination);

          // Calculate when this track should start
          const trackStart = track.startOffset;
          if (offsetTime < trackStart + track.duration) {
            const delay = Math.max(0, trackStart - offsetTime);
            const offset = Math.max(0, offsetTime - trackStart);
            source.start(startTime + delay, offset);
          }

          sourceNodesRef.current.set(track.id, source);
        }
      });

      // Update playback position
      const playbackStartTime = Date.now();
      playbackIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - playbackStartTime) / 1000;
        const newTime = offsetTime + elapsed;

        if (newTime >= maxDuration) {
          togglePlayPause();
          setCurrentTime(0);
        } else {
          setCurrentTime(newTime);
          // keep playhead visible while playing
          try { ensurePlayheadVisibleAt(newTime); } catch (e) { /* ignore */ }
        }
      }, 50);

      setIsPlaying(true);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const tracksScroll = tracksScrollRef.current;
    const scrollLeft = tracksScroll ? tracksScroll.scrollLeft : timelineRef.current.scrollLeft;
    const absoluteX = scrollLeft + x; // account for bottom scroll
    const time = (absoluteX - controlsWidth) / zoom;

    const targetTime = Math.max(0, Math.min(maxDuration, time));
    pushHistory({ currentTime: targetTime });
    setCurrentTime(targetTime);
    ensurePlayheadVisibleAt(targetTime);

    if (isPlaying) {
      togglePlayPause();
    }
  };

  const ensurePlayheadVisibleAt = (time: number) => {
    const tracks = tracksScrollRef.current;
    const timeline = timelineRef.current;
    if (!tracks) return;

    const playX = controlsWidth + time * zoom;
    const viewLeft = tracks.scrollLeft;
    const viewRight = viewLeft + tracks.clientWidth;
    const margin = Math.min(200, Math.floor(tracks.clientWidth * 0.25));

    if (playX < viewLeft + margin) {
      const target = Math.max(0, playX - margin);
      tracks.scrollLeft = target;
    } else if (playX > viewRight - margin) {
      const target = Math.max(0, playX - tracks.clientWidth + margin);
      tracks.scrollLeft = target;
    }
  };

  // Center timeline scroll around current playhead when zoom changes
  const centerTimelineOnPlayhead = (newZoom: number) => {
    const tracks = tracksScrollRef.current;
    if (!tracks) return;
    const center = tracks.clientWidth / 2;
    const target = controlsWidth + currentTime * newZoom - center;
    const final = Math.max(0, target);
    tracks.scrollLeft = final;
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(2000, Math.round(zoom * 1.2));
    setZoom(newZoom);
    centerTimelineOnPlayhead(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(20, Math.round(zoom / 1.2));
    setZoom(newZoom);
    centerTimelineOnPlayhead(newZoom);
  };

  const drawWaveform = (canvas: HTMLCanvasElement, audioBuffer: AudioBuffer | null, trackWidth: number, originalDuration: number, totalDuration: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas width matches requested trackWidth (in pixels)
    const w = Math.max(1, Math.floor(trackWidth));
    const h = canvas.height;
    if (canvas.width !== w) canvas.width = w;

    ctx.clearRect(0, 0, w, h);

    if (!audioBuffer) {
      // Draw blank track background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Draw dotted line pattern for blank track
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Add text indicating it's a blank track
      ctx.fillStyle = '#71717a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Faixa em Branco', w / 2, h / 2 - 8);
      ctx.font = '10px monospace';
      return;
    }

    // Calculate audio portion width and blank space width
    const audioPortionWidth = Math.floor((originalDuration / totalDuration) * w);
    const blankSpaceWidth = w - audioPortionWidth;

    // Draw audio portion background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, audioPortionWidth, h);

    // Draw waveform from audio buffer
    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / audioPortionWidth));
    const amp = h / 2;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < audioPortionWidth; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const idx = (i * step) + j;
        if (idx >= data.length) break;
        const datum = data[idx];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;

      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }

    ctx.stroke();

    // Draw blank space portion if there is extended duration
    if (blankSpaceWidth > 0) {
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(audioPortionWidth, 0, blankSpaceWidth, h);

      // Draw dotted line pattern for extended blank space
      ctx.strokeStyle = '#2d2d30';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(audioPortionWidth, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Add separator line
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(audioPortionWidth, 0);
      ctx.lineTo(audioPortionWidth, h);
      ctx.stroke();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCutTrack = () => {
    if (!selectedTrackId || !globalSelection) {
      showToast('Selecione uma faixa e uma região para cortar', 'error');
      return;
    }

    const track = tracks.find(t => t.id === selectedTrackId);
    if (!track || !track.audioBuffer) return;

    const { start, end } = globalSelection;
    const relativeStart = Math.max(0, start - track.startOffset);
    const relativeEnd = Math.min(track.duration, end - track.startOffset);

    if (relativeStart >= relativeEnd) {
      showToast('Seleção inválida para esta faixa', 'error');
      return;
    }

    // Create two new tracks: before cut and after cut
    const sampleRate = track.audioBuffer.sampleRate;
    const channels = track.audioBuffer.numberOfChannels;

    const beforeLength = Math.floor(relativeStart * sampleRate);
    const afterStart = Math.ceil(relativeEnd * sampleRate);
    const afterLength = track.audioBuffer.length - afterStart;

    try {
      const newTracks: AudioTrack[] = [];

      // Before part
      if (beforeLength > 0) {
        const beforeBuffer = audioContextRef.current!.createBuffer(channels, beforeLength, sampleRate);
        for (let ch = 0; ch < channels; ch++) {
          const channelData = track.audioBuffer.getChannelData(ch);
          beforeBuffer.copyToChannel(channelData.slice(0, beforeLength), ch);
        }

        newTracks.push({
          ...track,
          id: `${track.id}-before`,
          name: `${track.name} (início)`,
          audioBuffer: beforeBuffer,
          duration: beforeLength / sampleRate,
          originalDuration: beforeLength / sampleRate,
          // Mantém trim relativo ao original (início continua igual, fim ajusta)
          trimStart: track.trimStart ?? 0,
          trimEnd: (track.trimStart ?? 0) + beforeLength / sampleRate,
        });
      }

      // After part
      if (afterLength > 0) {
        const afterBuffer = audioContextRef.current!.createBuffer(channels, afterLength, sampleRate);
        for (let ch = 0; ch < channels; ch++) {
          const channelData = track.audioBuffer.getChannelData(ch);
          afterBuffer.copyToChannel(channelData.slice(afterStart), ch);
        }

        newTracks.push({
          ...track,
          id: `${track.id}-after`,
          name: `${track.name} (fim)`,
          audioBuffer: afterBuffer,
          duration: afterLength / sampleRate,
          originalDuration: afterLength / sampleRate,
          startOffset: track.startOffset + relativeEnd,
          // Trim do fim começa onde o corte começou em relação ao original
          trimStart: (track.trimStart ?? 0) + relativeEnd,
          trimEnd: track.trimEnd ?? track.originalDuration,
        });
      }

      // Replace old track with new tracks, preservando a ordem da lista
      pushHistory();
      setTracks(prev => {
        const index = prev.findIndex(t => t.id === selectedTrackId);
        if (index === -1) {
          // fallback: se não achar a faixa, mantém comportamento antigo
          const filtered = prev.filter(t => t.id !== selectedTrackId);
          return [...filtered, ...newTracks];
        }

        const beforeList = prev.slice(0, index);
        const afterList = prev.slice(index + 1); // remove a faixa original
        // newTracks já está em ordem: [beforePart?, afterPart?]
        return [...beforeList, ...newTracks, ...afterList];
      });

      setGlobalSelection(null);
      showToast('Faixa cortada com sucesso', 'success');
      if (isPlaying) {
        togglePlayPause();
      }
    } catch (error: any) {
      showToast(`Erro ao cortar: ${error?.message || String(error)}`, 'error');
    }
  };

  const handleJoinTracks = () => {
    const selectedTracks = tracks.filter(t => t.id === selectedTrackId || globalSelection);

    if (tracks.length < 2) {
      showToast('Selecione pelo menos 2 faixas para juntar', 'error');
      return;
    }

    showToast('Selecione as faixas que deseja juntar e posicione-as em sequência', 'warning');
  };

  const handleDeleteTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);

    pushHistory();
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }

    if (track) {
      if (track.audioUrl && track.audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(track.audioUrl);
        } catch (e) {
          console.error('Erro ao revogar URL de blob da faixa removida', e);
        }
      }

      if (track.originType !== 'blank') {
        deleteTrackBlobFromIndexedDB(track.id);
      }
    }

    showToast('Faixa removida', 'success');
    if (isPlaying) {
      togglePlayPause();
    }
  };

  const renderMixToWav = async (): Promise<Blob> => {
    if (!audioContextRef.current) {
      throw new Error('Contexto de áudio não inicializado');
    }

    const sampleRate = 44100;
    const channels = 2;
    const lengthInSamples = Math.ceil(maxDuration * sampleRate);
    const offlineContext = new OfflineAudioContext(channels, lengthInSamples, sampleRate);

    tracks.forEach(track => {
      if (track.audioBuffer && !track.muted) {
        const source = offlineContext.createBufferSource();
        source.buffer = track.audioBuffer;

        const gainNode = offlineContext.createGain();
        gainNode.gain.value = track.volume;

        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        source.start(track.startOffset);
      }
    });

    const renderedBuffer = await offlineContext.startRendering();
    return audioBufferToWav(renderedBuffer);
  };

  const handleExportMix = async () => {
    if (tracks.length === 0) {
      showToast('Nenhuma faixa para exportar', 'error');
      return;
    }
    if (isPlaying) {
      togglePlayPause();
    }
    setExportLoading(true);

    try {
      const wavBlob = await renderMixToWav();
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mixagem-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Mixagem exportada com sucesso', 'success');
    } catch (error: any) {
      showToast(`Erro ao exportar: ${error?.message || String(error)}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const extractAudioSegment = (track: AudioTrack, startTime: number, endTime: number): AudioBuffer | null => {
    if (!track.audioBuffer || !audioContextRef.current) return null;

    const sampleRate = track.audioBuffer.sampleRate;
    const channels = track.audioBuffer.numberOfChannels;

    // duração real do buffer carregado
    const bufferDuration = track.audioBuffer.length / sampleRate;

    // tempos relativos à faixa, limitados ao que de fato existe no buffer
    const trackRelativeStart = Math.max(0, startTime - track.startOffset);
    const trackRelativeEnd = Math.min(bufferDuration, endTime - track.startOffset);

    if (trackRelativeStart >= trackRelativeEnd) return null;

    const startSample = Math.floor(trackRelativeStart * sampleRate);
    const endSample = Math.floor(trackRelativeEnd * sampleRate);
    const segmentLength = endSample - startSample;

    if (segmentLength <= 0 || startSample < 0 || endSample > track.audioBuffer.length) {
      return null;
    }

    const segmentBuffer = audioContextRef.current.createBuffer(channels, segmentLength, sampleRate);

    for (let ch = 0; ch < channels; ch++) {
      const channelData = track.audioBuffer.getChannelData(ch);
      const segmentData = channelData.slice(startSample, endSample);
      segmentBuffer.copyToChannel(segmentData, ch);
    }

    return segmentBuffer;
  };

  const handleCopySelection = () => {
    if (!globalSelection) {
      showToast('Selecione um trecho de áudio primeiro', 'error');
      return;
    }

    const track = tracks.find(t => t.id === globalSelection.trackId);
    if (!track || !track.audioBuffer) {
      showToast('Faixa não encontrada ou sem áudio', 'error');
      return;
    }

    const audioData = extractAudioSegment(track, globalSelection.start, globalSelection.end);
    if (!audioData) {
      showToast('Erro ao extrair segmento de áudio', 'error');
      return;
    }

    // Calcula os trims originais: parte da faixa que está sendo copiada
    const baseTrimStart = track.trimStart ?? 0;
    const selectionRelativeStart = Math.max(0, globalSelection.start - track.startOffset);
    const selectionRelativeEnd = Math.max(selectionRelativeStart, globalSelection.end - track.startOffset);
    setClipboard({
      audioData,
      duration: globalSelection.end - globalSelection.start,
      trackId: globalSelection.trackId,
      track: track,
      trimStart: baseTrimStart + selectionRelativeStart,
      trimEnd: baseTrimStart + selectionRelativeEnd,
    });



    showToast('Trecho copiado para a área de transferência', 'success');
    if (isPlaying) {
      togglePlayPause();
    }
  };

  const handlePasteToBlankTrack = async (targetTrackId: string) => {
    if (!clipboard) {
      showToast('Nada na área de transferência para colar', 'error');
      return;
    }

    if (!selectedTrackId) {
      showToast('Selecione uma faixa primeiro', 'error');
      return;
    }

    const targetTrack = tracks.find(t => t.id === selectedTrackId);
    if (!targetTrack) {
      showToast('Faixa selecionada não encontrada', 'error');
      return;
    }

    // Só permite colar em faixa em branco que ainda não recebeu áudio
    if (targetTrack.originType !== 'blank' || targetTrack.audioBuffer !== null) {
      showToast('Só é possível colar em uma faixa em branco que ainda não recebeu áudio', 'error');
      return;
    }

    // Use currentTime (playhead position) as paste position relative to track start
    const pastePosition = currentTime;

    // Check if paste position is within the track bounds
    if (pastePosition < targetTrack.startOffset || pastePosition > targetTrack.startOffset + targetTrack.duration) {
      showToast('Posicione o playhead dentro da faixa selecionada', 'error');
      return;
    }

    const relativePosition = pastePosition - targetTrack.startOffset;

    // Se a faixa é em branco (garantido acima), simplesmente a transformamos em faixa com áudio uma única vez
    if (targetTrack.audioBuffer === null) {
      // Check if there's enough space in the blank track
      const remainingSpace = targetTrack.duration - relativePosition;

      if (remainingSpace < clipboard.duration) {
        showToast(`Espaço insuficiente. Precisa de ${formatTime(clipboard.duration)}, mas há apenas ${formatTime(remainingSpace)}`, 'error');
        return;
      }
      console.log(clipboard)
      const updatedTrack: AudioTrack = {
        ...targetTrack,
        name: `${targetTrack.name} - Com Áudio`,
        audioBuffer: clipboard.audioData,
        startOffset: pastePosition,
        duration: clipboard.duration,
        originalDuration: clipboard.duration,
        // Deixa de ser uma faixa "em branco" para não ser recriada vazia na restauração
        // e passa a ser tratada como faixa com áudio gerado localmente
        trimStart: clipboard.trimStart ?? 0,
        trimEnd: clipboard.trimEnd ?? clipboard.duration,
        originType: clipboard.track.originType,
        contentType: clipboard.track.contentType,
        songId: clipboard.track.songId,
      };

      pushHistory();
      setTracks(prev => prev.map(t => t.id === selectedTrackId ? updatedTrack : t));
      // Como este áudio é gerado localmente (a partir de cópia), também salvamos o blob
      // correspondente no IndexedDB para tentar restaurar em sessões futuras.
      try {
        if (audioContextRef.current) {
          const sampleRate = clipboard.audioData.sampleRate;
          const channels = clipboard.audioData.numberOfChannels;
          const length = clipboard.audioData.length;

          // Converte o AudioBuffer do clipboard em WAV Blob reutilizando audioBufferToWav
          const tempBuffer = audioContextRef.current.createBuffer(channels, length, sampleRate);
          for (let ch = 0; ch < channels; ch++) {
            const src = clipboard.audioData.getChannelData(ch);
            tempBuffer.copyToChannel(src, ch);
          }

          const blob = audioBufferToWav(tempBuffer);
          saveTrackBlobToIndexedDB(updatedTrack.id, blob);
        }
      } catch (e) {
        console.error('Erro ao salvar blob de faixa colada no IndexedDB', e);
      }
      showToast(`Trecho colado na faixa em branco em ${formatTime(pastePosition)}`, 'success');
      return;
    }
    if (isPlaying) {
      togglePlayPause();
    }
  };

  const handleSaveToPreparation = async () => {
    if (tracks.length === 0) {
      showToast('Nenhuma faixa para salvar', 'error');
      return;
    }

    try {
      setExportLoading(true);

      const wavBlob = await renderMixToWav();
      const timestamp = new Date();
      const yyyy = timestamp.getFullYear();
      const mm = String(timestamp.getMonth() + 1).padStart(2, '0');
      const dd = String(timestamp.getDate()).padStart(2, '0');
      const hh = String(timestamp.getHours()).padStart(2, '0');
      const mi = String(timestamp.getMinutes()).padStart(2, '0');
      const ss = String(timestamp.getSeconds()).padStart(2, '0');
      const filename = `mixagem-${yyyy}${mm}${dd}-${hh}${mi}${ss}.wav`;

      const file = new File([wavBlob], filename, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch(`${BACKEND_BASE_URL}/downloads/upload-preparation`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar mixagem no preparo');
      }

      showToast('Mixagem salva no diretório de preparo', 'success');
    } catch (error: any) {
      showToast(`Erro ao salvar: ${error?.message || String(error)}`, 'error');
    } finally {
      setExportLoading(false);
    }
    if (isPlaying) {
      togglePlayPause();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 relative">
      {isRestoringState && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-zinc-100 font-medium">Carregando sua edição salva...</div>
            <div className="text-xs text-zinc-400 max-w-xs text-center">
              Restaurando faixas e configurações da última sessão.
            </div>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 p-2 space-y-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => {
              console.log('Botão Adicionar Faixas clicado');
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportSource('library');
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500/20"
          >
            <FolderOpen className="w-4 h-4" />
            Importar da Biblioteca
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportSource('preparo');
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500/20"
          >
            <FolderOpen className="w-4 h-4" />
            Importar do Preparo
          </button>

          <div className="h-6 w-px bg-zinc-700 mx-2" />

          <button
            onClick={addBlankTrack}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-600 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" />
            Faixa em Branco
          </button>
          <button
            onClick={handleCopySelection}
            disabled={!globalSelection}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-blue-600 text-blue-300 hover:bg-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </button>
          <button
            onClick={() => {
              if (selectedTrackId) {
                handlePasteToBlankTrack(selectedTrackId);
              } else {
                showToast('Selecione uma faixa primeiro', 'error');
              }
            }}
            disabled={!clipboard || !selectedTrackId}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-green-600 text-green-300 hover:bg-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="w-4 h-4" />
            Colar
          </button>
          <button
            onClick={handleCutTrack}
            disabled={!selectedTrackId || !globalSelection}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scissors className="w-4 h-4" />
            Cortar
          </button>
          <div className="h-6 w-px bg-zinc-700 mx-2" />

          <button
            onClick={handleExportMix}
            disabled={tracks.length === 0 || exportLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-green-600 text-green-300 hover:bg-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Exportando...' : 'Exportar'}
          </button>

          <button
            onClick={handleSaveToPreparation}
            disabled={tracks.length === 0 || exportLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-600 text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {exportLoading ? 'Salvando...' : 'Salvar no Preparo'}
          </button>

          <div className="h-6 w-px bg-zinc-700 mx-2" />

          <button
            onClick={() => {
              if (tracks.length === 0) return;
              if (window.confirm('Tem certeza que deseja excluir todas as faixas? Esta ação não pode ser desfeita.')) {
                clearEditorState();
              }
            }}
            disabled={tracks.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-red-600 text-red-300 hover:bg-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Resetar
          </button>
        </div>

        {/* Track count info */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>{tracks.length} faixa{tracks.length !== 1 ? 's' : ''}</span>
          </div>
          {selectedTrackId && (
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5" />
              <span>Selecionada: {tracks.find(t => t.id === selectedTrackId)?.name}</span>
            </div>
          )}
          {globalSelection && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Seleção: {formatTime(globalSelection.start)} - {formatTime(globalSelection.end)} ({formatTime(globalSelection.end - globalSelection.start)})</span>
            </div>
          )}
          {clipboard && (
            <div className="flex items-center gap-1.5 text-green-400">
              <Copy className="w-3.5 h-3.5" />
              <span>Clipboard: {formatTime(clipboard.duration)} pronto para colar</span>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="border-t border-zinc-700 pt-2 flex items-center justify-start gap-2">
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={tracks.length === 0}
            className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={() => setCurrentTime(Math.min(maxDuration, currentTime + 5))}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 ml-3">
            <span className="text-xs text-zinc-500 font-mono w-20">
              {formatTime(currentTime)} / {formatTime(maxDuration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-3">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              disabled={zoom <= 20}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-zinc-500 w-16 text-center">{zoom.toFixed(0)} px/s</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              disabled={zoom >= 2000}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-track view */}
      <div className="flex-1 flex flex-col overflow-hidden" onClick={(e) => {
        // Clear selection when clicking outside of tracks
        if (e.target === e.currentTarget) {
          setGlobalSelection(null);
        }
      }}>
        {tracks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div className="space-y-4">
              <Layers className="w-16 h-16 text-zinc-700 mx-auto" />
              <div className="text-zinc-500 text-lg">Nenhuma faixa carregada</div>
              <div className="text-zinc-600 text-sm max-w-md">
                Adicione faixas de áudio para começar a editar. Você pode importar várias faixas, cortá-las e juntá-las para criar uma nova mixagem.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Timeline ruler */}
            <div className="h-8 border-b border-zinc-800 bg-zinc-900/30 overflow-x-hidden flex-shrink-0" ref={timelineRef}>
              <div ref={timelineInnerRef} className="relative h-full" style={{ width: `${controlsWidth + maxDuration * zoom}px`, minWidth: '100%' }} onClick={handleTimelineClick}>
                <div className="absolute inset-0">
                  {Array.from({ length: Math.ceil(maxDuration / 10) + 1 }).map((_, i) => {
                    const left = controlsWidth + i * 10 * zoom;
                    return (
                      <div key={i} className="absolute flex flex-col items-center" style={{ left: `${left}px`, transform: 'translateX(-50%)' }}>
                        <div className="text-[10px] text-zinc-600">{formatTime(i * 10)}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
                  style={{ left: `${controlsWidth + currentTime * zoom}px` }}
                />
                {/* Selection overlay */}
                {globalSelection && (
                  <div
                    className="absolute top-0 bottom-0 bg-indigo-500/20 border-l-2 border-r-2 border-indigo-500 pointer-events-none"
                    style={{
                      left: `${controlsWidth + globalSelection.start * zoom}px`,
                      width: `${(globalSelection.end - globalSelection.start) * zoom}px`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar" ref={tracksScrollRef}>
              <div className="relative" style={{ width: `${controlsWidth + maxDuration * zoom}px`, minWidth: '100%' }}>
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    isSelected={selectedTrackId === track.id}
                    isSolo={soloTrackId === track.id}
                    maxDuration={maxDuration}
                    globalSelection={globalSelection}
                    isSelectingMode={true}
                    controlsWidth={controlsWidth}
                    clipboard={clipboard}
                    onSelect={() => setSelectedTrackId(track.id)}
                    onDelete={() => handleDeleteTrack(track.id)}
                    onVolumeChange={(volume) => {
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, volume } : t));
                    }}
                    onMuteToggle={() => {
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t));
                    }}
                    onSoloToggle={() => {
                      setSoloTrackId(prev => (prev === track.id ? null : track.id));
                    }}
                    onOffsetChange={(startOffset) => {
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, startOffset } : t));
                    }}
                    onDurationChange={(duration) => {
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, duration } : t));
                    }}
                    onNameChange={(name) => {
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, name } : t));
                    }}
                    onSelectionChange={(start, end) => {
                      if (start !== null && end !== null) {
                        setGlobalSelection({ start, end, trackId: track.id });
                      } else {
                        setGlobalSelection(null);
                      }
                    }}
                    onPaste={handlePasteToBlankTrack}
                    drawWaveform={drawWaveform}
                    zoom={zoom}
                  />
                ))}
                {/* Playhead line through all tracks */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
                  style={{ left: `${controlsWidth + currentTime * zoom}px` }}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">
                Importar de {importSource === 'library' ? 'Biblioteca' : 'Preparo'}
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSongs([]);
                }}
                className="text-zinc-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por título ou artista..."
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-4 pb-4 flex-1 overflow-y-auto">
              {loadingImport ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm">Carregando músicas...</p>
                </div>
              ) : importSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Music className="w-12 h-12 text-zinc-700" />
                  <p className="text-zinc-500 text-sm">
                    {importSearchQuery ? 'Nenhuma música encontrada' : 'Nenhuma música disponível'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importSongs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleImportSong(song)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{song.title}</div>
                        <div className="text-xs text-zinc-500 truncate">{song.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Track Row Component
interface TrackRowProps {
  track: AudioTrack;
  isSelected: boolean;
  isSolo: boolean;
  maxDuration: number;
  globalSelection: { start: number; end: number; trackId: string } | null;
  isSelectingMode: boolean;
  controlsWidth: number;
  clipboard: { audioData: AudioBuffer; duration: number; trackId: string } | null;
  onSelect: () => void;
  onDelete: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onOffsetChange: (offset: number) => void;
  onDurationChange: (duration: number) => void;
  onNameChange: (name: string) => void;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onPaste: (trackId: string) => void;
  drawWaveform: (canvas: HTMLCanvasElement, buffer: AudioBuffer | null, width: number, originalDuration: number, totalDuration: number) => void;
  zoom: number;
}

const TrackRow: React.FC<TrackRowProps> = ({
  track,
  isSelected,
  isSolo,
  maxDuration,
  globalSelection,
  isSelectingMode,
  controlsWidth,
  clipboard,
  onSelect,
  onDelete,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onOffsetChange,
  onDurationChange,
  onNameChange,
  onSelectionChange,
  onPaste,
  drawWaveform,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(track.name);
  const dragStartClientX = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);
  const resizeStartClientX = useRef<number | null>(null);
  const resizeStartDuration = useRef<number>(0);
  const selectionStartX = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const trackWidth = Math.max(1, track.duration * zoom);
      // set canvas height appropriately (keep existing height attribute)
      drawWaveform(canvasRef.current, track.audioBuffer, trackWidth, track.originalDuration, track.duration);
    }
  }, [track.audioBuffer, track.duration, track.originalDuration, maxDuration, zoom]);

  const handleDragBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartClientX.current = e.clientX;
    dragStartOffset.current = track.startOffset || 0;
  };

  const handleDragBarMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartClientX.current === null) return;

    // Calculate delta in pixels and convert to seconds using zoom (px/s)
    const deltaPx = e.clientX - dragStartClientX.current;
    const deltaSeconds = deltaPx / zoom;
    let newOffset = dragStartOffset.current + deltaSeconds;

    // Prevent negative start
    newOffset = Math.max(0, newOffset);

    onOffsetChange(newOffset);
  };

  const handleDragBarMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartClientX.current = e.clientX;
    resizeStartDuration.current = track.duration;
  };

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    if (!track.audioBuffer) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    setIsSelecting(true);
    selectionStartX.current = x;
    onSelect(); // Select this track
  };

  const handleWaveformMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || selectionStartX.current === null) return;

    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const startX = selectionStartX.current;

    const startTime = track.startOffset + (Math.min(startX, currentX) / zoom);
    const endTime = track.startOffset + (Math.max(startX, currentX) / zoom);

    onSelectionChange(startTime, endTime);
  };

  const handleWaveformMouseUp = () => {
    setIsSelecting(false);
    selectionStartX.current = null;
  };

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditedName(track.name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = () => {
    if (editedName.trim() !== '') {
      onNameChange(editedName.trim());
    } else {
      setEditedName(track.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditedName(track.name);
      setIsEditingName(false);
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);



  // Add global mouse move and up listeners when dragging, resizing or selecting
  useEffect(() => {
    if (!isDragging && !isResizing && !isSelecting) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStartClientX.current !== null) {
        const deltaPx = e.clientX - dragStartClientX.current;
        const deltaSeconds = deltaPx / zoom;
        let newOffset = dragStartOffset.current + deltaSeconds;
        newOffset = Math.max(0, newOffset);
        onOffsetChange(newOffset);
      }

      if (isResizing && resizeStartClientX.current !== null) {
        const deltaPx = e.clientX - resizeStartClientX.current;
        const deltaSeconds = deltaPx / zoom;
        let newDuration = resizeStartDuration.current + deltaSeconds;

        // Cannot reduce below original duration - capture from the track in closure
        const minDuration = track.originalDuration;
        newDuration = Math.max(minDuration, newDuration);

        onDurationChange(newDuration);
      }

      if (isSelecting && selectionStartX.current !== null && waveformRef.current) {
        const rect = waveformRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const startX = selectionStartX.current;

        const startTime = track.startOffset + (Math.min(startX, currentX) / zoom);
        const endTime = track.startOffset + (Math.max(startX, currentX) / zoom);

        onSelectionChange(startTime, endTime);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsSelecting(false);
      selectionStartX.current = null;
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, isSelecting, zoom, onOffsetChange, onDurationChange, onSelectionChange, track.startOffset, track.originalDuration]);

  return (
    <div
      className={`h-32 border-b border-zinc-800 flex ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-zinc-900/50'} transition-colors`}
      onClick={onSelect}
    >
      {/* Controls */}
      <div className="w-48 flex-shrink-0 p-3 border-r border-zinc-800 flex flex-col gap-2 track-controls">
        <div className="flex items-center justify-between">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-zinc-300 bg-zinc-800 border border-indigo-500 rounded px-1 py-0.5 flex-1 mr-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <span
              className="text-xs font-medium text-zinc-300 truncate flex-1 cursor-text hover:text-white"
              onDoubleClick={handleNameDoubleClick}
              title={track.name}
            >
              {track.name}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 items-center gap-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
            className={`p-1.5 rounded ${track.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
          >
            {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSoloToggle(); }}
            className={`p-1.5 rounded ${isSolo ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="Escutar apenas essa faixa"
          >
            <Music className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => { e.stopPropagation(); onVolumeChange(parseFloat(e.target.value)); }}
            className="flex-1"
            disabled={track.muted}
          />
        </div>

        <div className="text-[10px] text-zinc-600">
          {formatTime(track.duration)}
        </div>
      </div>

      {/* Waveform */}
      <div className="flex-1 relative">
        {/* Drag handle bar */}
        <div
          className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-indigo-500/20 to-transparent border-b border-indigo-500/30 cursor-move z-10 flex items-center justify-center"
          style={{
            left: `${track.startOffset * zoom}px`,
            width: `${track.duration * zoom}px`,
          }}
          onMouseDown={handleDragBarMouseDown}
          onMouseMove={handleDragBarMouseMove}
          onMouseUp={handleDragBarMouseUp}
        >
          <div className="text-xs text-indigo-300 font-medium select-none opacity-75">
            ⋮⋮⋮ Arrastar
          </div>
        </div>

        {/* Waveform container */}
        <div
          ref={waveformRef}
          className={`absolute h-full ${track.audioBuffer
            ? 'cursor-crosshair'
            : 'cursor-default'
            }`}
          style={{
            left: `${track.startOffset * zoom}px`,
            width: `${track.duration * zoom}px`,
          }}
          onMouseDown={handleWaveformMouseDown}
          onMouseMove={handleWaveformMouseMove}
          onMouseUp={handleWaveformMouseUp}
          title={
            track.audioBuffer
              ? 'Clique e arraste para selecionar'
              : ''
          }
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="w-full h-full pointer-events-none"
          />

          {/* Selection overlay for this track */}
          {globalSelection && globalSelection.trackId === track.id && (
            <div
              className="absolute top-0 bottom-0 bg-indigo-500/30 border-l-2 border-r-2 border-indigo-500 pointer-events-none"
              style={{
                left: `${Math.max(0, (globalSelection.start - track.startOffset) * zoom)}px`,
                width: `${(globalSelection.end - globalSelection.start) * zoom}px`,
              }}
            >
              <div className="absolute top-1 left-1 text-xs text-indigo-200 bg-indigo-900/80 px-1 rounded">
                {formatTime(globalSelection.end - globalSelection.start)}
              </div>
            </div>
          )}


        </div>

        {/* Resize handle at the end - for all tracks */}
        <div
          className="absolute top-0 bottom-0 w-2 bg-indigo-500/30 hover:bg-indigo-500/50 cursor-ew-resize z-20 flex items-center justify-center transition-colors"
          style={{
            left: `${(track.startOffset + track.duration) * zoom - 2}px`,
          }}
          onMouseDown={handleResizeMouseDown}
          title="Arrastar para redimensionar faixa"
        >
          <div className="w-0.5 h-8 bg-indigo-400 rounded"></div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default AudioEditor;
