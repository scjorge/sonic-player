import React, { useState, useEffect, useRef } from 'react';
import { NaviSong } from '../../../../types';
import { BACKEND_BASE_URL } from '../../../core/config';
import showToast from '../utils/toast';
import { Play, Pause, Download, Save, Upload, Scissors, Copy, Trash2, FolderOpen, Volume2, VolumeX, ZoomIn, ZoomOut, SkipBack, SkipForward, Plus, Layers, Music, Edit3, Link } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';

interface AudioTrack {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  audioUrl: string;
  file: File | null;
  volume: number;
  muted: boolean;
  startOffset: number; // Position in timeline (seconds)
  duration: number;
  regions: AudioRegion[];
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

const AudioEditor: React.FC<AudioEditorProps> = ({ onNavigateToLibrary }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  // `zoom` is pixels per second (px/s). Higher => more zoomed in.
  const [zoom, setZoom] = useState(100);
  const [globalSelection, setGlobalSelection] = useState<{ start: number; end: number } | null>(null);
  
  // Import/Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSource, setImportSource] = useState<'library' | 'preparo'>('library');
  const [importSongs, setImportSongs] = useState<NaviSong[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('AudioEditor montado!');
    // Initialize Web Audio API
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      // Cleanup
      tracks.forEach(track => {
        if (track.audioUrl) {
          URL.revokeObjectURL(track.audioUrl);
        }
      });
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      sourceNodesRef.current.forEach(node => node.stop());
      sourceNodesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    // Recalculate max duration when tracks change
    const newMaxDuration = Math.max(
      ...tracks.map(t => t.startOffset + t.duration),
      10
    );
    // Adicionar margem extra para facilitar arrastar além do final
    setMaxDuration(newMaxDuration * 1.2);
  }, [tracks]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await addTrackFromFile(files[i]);
      }
    }
    e.target.value = ''; // Reset input
  };

  const addTrackFromFile = async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const arrayBuffer = await file.arrayBuffer();
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const newTrack: AudioTrack = {
        id: `track-${Date.now()}-${Math.random()}`,
        name: file.name,
        audioBuffer,
        audioUrl: url,
        file,
        volume: 1,
        muted: false,
        startOffset: 0,
        duration: audioBuffer.duration,
        regions: [],
      };
      
      setTracks(prev => [...prev, newTrack]);
      setSelectedTrackId(newTrack.id);
      showToast(`Faixa "${file.name}" adicionada`, 'success');
    } catch (error: any) {
      showToast(`Erro ao carregar arquivo: ${error?.message || String(error)}`, 'error');
    }
  };

  const handleImportFromSource = async () => {
    setLoadingImport(true);
    try {
      if (importSource === 'library') {
        const response = await navidromeService.getSongsByFilter('', '', '', 0, 50);
        setImportSongs(response.songs || []);
      } else {
        const res = await fetch(`${BACKEND_BASE_URL}/api/downloads/completed`);
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
        setImportSongs(songs);
      }
    } catch (error: any) {
      showToast(`Erro ao buscar músicas: ${error?.message || String(error)}`, 'error');
    } finally {
      setLoadingImport(false);
    }
  };

  const handleImportSong = async (song: NaviSong) => {
    try {
      let audioUrl: string;
      
      if (song.contentType === 'audio/preparation') {
        audioUrl = `${BACKEND_BASE_URL}/api/downloads/stream?id=${encodeURIComponent(song.id)}`;
      } else {
        audioUrl = navidromeService.getStreamUrl(song.id);
      }

      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo de áudio');
      }

      const blob = await response.blob();
      const file = new File([blob], `${song.title || 'audio'}.mp3`, { type: blob.type });
      
      await addTrackFromFile(file);
      showToast(`"${song.title}" importado com sucesso`, 'success');
    } catch (error: any) {
      showToast(`Erro ao importar: ${error?.message || String(error)}`, 'error');
    }
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
      
      // Schedule all tracks
      tracks.forEach(track => {
        if (track.audioBuffer && !track.muted) {
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
        }
      }, 50);
      
      setIsPlaying(true);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * maxDuration;
    
    setCurrentTime(Math.max(0, Math.min(maxDuration, time)));
    
    if (isPlaying) {
      togglePlayPause();
    }
  };

  // Center timeline scroll around current playhead when zoom changes
  const centerTimelineOnPlayhead = (newZoom: number) => {
    if (!timelineRef.current) return;
    const container = timelineRef.current;
    const center = container.clientWidth / 2;
    const target = currentTime * newZoom - center;
    container.scrollLeft = Math.max(0, target);
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

  const drawWaveform = (canvas: HTMLCanvasElement, audioBuffer: AudioBuffer | null, trackWidth: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !audioBuffer) return;

    // Ensure canvas width matches requested trackWidth (in pixels)
    const w = Math.max(1, Math.floor(trackWidth));
    const h = canvas.height;
    if (canvas.width !== w) canvas.width = w;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);

    // Draw waveform from audio buffer
    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    const amp = h / 2;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < w; i++) {
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
          startOffset: track.startOffset + relativeEnd,
        });
      }

      // Replace old track with new tracks
      setTracks(prev => {
        const filtered = prev.filter(t => t.id !== selectedTrackId);
        return [...filtered, ...newTracks];
      });

      setGlobalSelection(null);
      showToast('Faixa cortada com sucesso', 'success');
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
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }
    showToast('Faixa removida', 'success');
  };

  const handleExportMix = async () => {
    if (tracks.length === 0) {
      showToast('Nenhuma faixa para exportar', 'error');
      return;
    }

    setExportLoading(true);
    
    try {
      if (!audioContextRef.current) {
        throw new Error('Contexto de áudio não inicializado');
      }

      // Create offline context for rendering
      const sampleRate = 44100;
      const channels = 2;
      const lengthInSamples = Math.ceil(maxDuration * sampleRate);
      
      const offlineContext = new OfflineAudioContext(channels, lengthInSamples, sampleRate);

      // Mix all tracks
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
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      
      // Download
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

  const handleSaveToPreparation = async () => {
    if (tracks.length === 0) {
      showToast('Nenhuma faixa para salvar', 'error');
      return;
    }

    try {
      // Export mix as before
      await handleExportMix();
      showToast('Use o arquivo exportado e faça upload na aba Preparo', 'warning');
    } catch (error: any) {
      showToast(`Erro ao salvar: ${error?.message || String(error)}`, 'error');
    }
  };

  console.log('AudioEditor renderizando, tracks:', tracks.length);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
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
            Adicionar Faixas
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
            onClick={handleCutTrack}
            disabled={!selectedTrackId || !globalSelection}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scissors className="w-4 h-4" />
            Cortar Faixa
          </button>
          <button
            onClick={handleJoinTracks}
            disabled={tracks.length < 2}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="w-4 h-4" />
            Juntar Faixas
          </button>
          
          <div className="h-6 w-px bg-zinc-700 mx-2" />
          
          <button
            onClick={handleExportMix}
            disabled={tracks.length === 0 || exportLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-green-600 text-green-300 hover:bg-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Exportando...' : 'Exportar Mixagem'}
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
        </div>
      </div>

      {/* Multi-track view */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex-1 flex flex-col">
            {/* Timeline ruler */}
            <div className="h-8 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto custom-scrollbar" ref={timelineRef}>
              <div className="relative h-full flex items-center px-4" style={{ width: `${maxDuration * zoom}px`, minWidth: '100%' }} onClick={handleTimelineClick}>
              <div className="absolute inset-0 flex items-center px-4">
                {Array.from({ length: Math.ceil(maxDuration / 10) + 1 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center" style={{ marginLeft: i === 0 ? 0 : 'auto', marginRight: 0 }}>
                    <div className="text-[10px] text-zinc-600">{formatTime(i * 10)}</div>
                  </div>
                ))}
              </div>
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                style={{ left: `${currentTime * zoom}px` }}
              />
              {/* Selection overlay */}
              {globalSelection && (
                <div
                  className="absolute top-0 bottom-0 bg-indigo-500/20 border-l-2 border-r-2 border-indigo-500 pointer-events-none"
                  style={{
                    left: `${globalSelection.start * zoom}px`,
                    width: `${(globalSelection.end - globalSelection.start) * zoom}px`,
                  }}
                />
              )}
              </div>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
              <div style={{ width: `${maxDuration * zoom}px`, minWidth: '100%' }}>
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  maxDuration={maxDuration}
                  onSelect={() => setSelectedTrackId(track.id)}
                  onDelete={() => handleDeleteTrack(track.id)}
                  onVolumeChange={(volume) => {
                    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, volume } : t));
                  }}
                  onMuteToggle={() => {
                    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t));
                  }}
                  onOffsetChange={(startOffset) => {
                    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, startOffset } : t));
                  }}
                  drawWaveform={drawWaveform}
                  zoom={zoom}
                />
              ))}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="h-16 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-center gap-4 px-6">
              <button
                onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={togglePlayPause}
                disabled={tracks.length === 0}
                className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              
              <button
                onClick={() => setCurrentTime(Math.min(maxDuration, currentTime + 5))}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-zinc-500 font-mono w-24">
                  {formatTime(currentTime)} / {formatTime(maxDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  disabled={zoom <= 20}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-zinc-500 w-24 text-center">{zoom.toFixed(0)} px/s</span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  disabled={zoom >= 2000}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
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

            <div className="p-4 flex-1 overflow-y-auto">
              {importSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-zinc-500 text-sm">
                    Clique em "Carregar" para buscar músicas
                  </p>
                  <button
                    onClick={handleImportFromSource}
                    disabled={loadingImport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {loadingImport ? 'Carregando...' : 'Carregar'}
                  </button>
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
  maxDuration: number;
  onSelect: () => void;
  onDelete: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onOffsetChange: (offset: number) => void;
  drawWaveform: (canvas: HTMLCanvasElement, buffer: AudioBuffer | null, width: number) => void;
  zoom: number;
}

const TrackRow: React.FC<TrackRowProps> = ({
  track,
  isSelected,
  maxDuration,
  onSelect,
  onDelete,
  onVolumeChange,
  onMuteToggle,
  onOffsetChange,
  drawWaveform,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (canvasRef.current && track.audioBuffer) {
      const trackWidth = Math.max(1, track.duration * zoom);
      // set canvas height appropriately (keep existing height attribute)
      drawWaveform(canvasRef.current, track.audioBuffer, trackWidth);
    }
  }, [track.audioBuffer, maxDuration, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.track-controls')) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    
    // Permitir arrastar além do limite atual, a timeline expande automaticamente
    let newOffset = percent * maxDuration;
    
    // Expandir timeline se arrastar além de 80% do espaço
    if (percent > 0.8) {
      const extraSpace = (percent - 0.8) * maxDuration * 2;
      newOffset = maxDuration * 0.8 + extraSpace;
    }
    
    onOffsetChange(Math.max(0, newOffset));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`h-32 border-b border-zinc-800 flex ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-zinc-900/50'} transition-colors`}
      onClick={onSelect}
    >
      {/* Controls */}
      <div className="w-48 flex-shrink-0 p-3 border-r border-zinc-800 flex flex-col gap-2 track-controls">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300 truncate flex-1">{track.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
            className={`p-1.5 rounded ${track.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
          >
            {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
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
      <div
        className="flex-1 relative cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute h-full"
          style={{
            left: `${(track.startOffset / maxDuration) * 100}%`,
            width: `${(track.duration / maxDuration) * 100}%`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="w-full h-full"
          />
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
