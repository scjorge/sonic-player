import React from 'react';
import { NaviSong } from '../../../types';
import { X, Music, Disc, User, Calendar, FileAudio, Tag, Folder, Hash, Clock, Zap, Activity, Heart, BarChart3, Database, HardDrive, FileType, CalendarPlus, History, Gauge, Layers, Smile, Star, Fingerprint, Film, AlignLeft } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';

interface SongInfoModalProps {
  song: NaviSong;
  onClose: () => void;
}

const SongInfoModal: React.FC<SongInfoModalProps> = ({ song, onClose }) => {
  
  // Formatters
  const formatTime = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    } catch {
      return dateString;
    }
  };

  // Linhas agora mais altas (py-3) e com fontes levemente ajustadas
  const InfoRow = ({ icon: Icon, label, value, highlight = false }: { icon: any, label: string, value: string | number | undefined | React.ReactNode, highlight?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50 px-3 -mx-3 rounded transition-colors group">
      <div className="flex items-center gap-3 text-zinc-400">
        <div className="p-1.5 bg-zinc-800/50 rounded-md group-hover:bg-zinc-800 transition-colors">
          <Icon className={`w-4 h-4 ${highlight ? 'text-indigo-400' : 'text-zinc-500'}`} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`text-sm truncate max-w-[65%] text-right font-mono select-all ${highlight ? 'text-indigo-300 font-bold' : 'text-zinc-200'}`}>
        {value !== undefined && value !== null && value !== '' ? value : '-'}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
        
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            
        {/* Header with Cover Art background effect */}
        <div className="relative h-48 bg-zinc-900 overflow-hidden flex items-end shrink-0">
          {song.coverArt && (
            <div className="absolute inset-0 opacity-20 blur-3xl scale-110">
              <img src={navidromeService.getCoverArtUrl(song.coverArt)} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                
          <div className="relative p-8 w-full flex items-end justify-between z-20">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-xl shadow-2xl bg-zinc-900 border border-zinc-700/50 overflow-hidden flex-shrink-0 relative group">
                {song.coverArt ? (
                  <img src={navidromeService.getCoverArtUrl(song.coverArt)} className="w-full h-full object-cover shadow-inner" />
                ) : (
                  <Music className="w-12 h-12 text-zinc-700 m-auto mt-10" />
                )}
              </div>
              <div className="mb-2 space-y-1">
                <h2 className="text-white font-bold text-3xl line-clamp-1 drop-shadow-lg tracking-tight" title={song.title}>{song.title}</h2>
                <p className="text-zinc-300 text-lg font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  {song.artist}
                </p>
                <p className="text-zinc-500 text-sm flex items-center gap-2">
                  <Disc className="w-4 h-4" />
                  {song.album}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="mb-auto p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white border border-zinc-800">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content - Layout em Coluna Única */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950">
          <div className="space-y-8 max-w-2xl mx-auto">
                    
            {/* Bloco 1: Metadados Principais */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-zinc-900">
                <Database className="w-4 h-4" />
                Metadados Musicais
              </h3>
              <div className="bg-zinc-900/30 rounded-xl px-5 py-2 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                <InfoRow icon={Tag} label="Gênero" value={song.genre} />
                <InfoRow icon={Calendar} label="Ano de Lançamento" value={song.year} />
                <InfoRow icon={Hash} label="Número da Faixa" value={song.track} />
                <InfoRow icon={Hash} label="Número do Disco" value={song.discNumber} />
                <InfoRow icon={Gauge} label="BPM" value={song.bpm} />
                <InfoRow icon={Smile} label="Mood (Humor)" value={song.moods} />
                <InfoRow icon={Layers} label="Grupo" value={song.group} />
                <InfoRow icon={Film} label="Tipo de Mídia" value={song.isVideo ? 'Vídeo' : (song.type || 'Áudio')} />
              </div>
            </div>

            {/* Bloco 2: Comentários (Sempre visível) */}
            <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-zinc-900">
                <AlignLeft className="w-4 h-4" />
                Comentários & Tags
              </h3>
              <div className={`bg-zinc-900/30 rounded-xl p-6 border border-zinc-800/50 text-sm font-mono break-words whitespace-pre-wrap leading-relaxed shadow-inner ${!song.comment ? 'text-zinc-600 italic' : 'text-zinc-300'}`}>
                {song.comment || "Nenhum comentário disponível para esta faixa."}
              </div>
            </div>

            {/* Bloco 3: Estatísticas e Avaliação */}
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-zinc-900">
                <BarChart3 className="w-4 h-4" />
                Estatísticas & Avaliação
              </h3>
              <div className="bg-zinc-900/30 rounded-xl px-5 py-2 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                <InfoRow icon={CalendarPlus} label="Adicionado em" value={formatDate(song.created)} />
                <InfoRow icon={Activity} label="Contagem de Reproduções" value={song.playCount || 0} highlight />
                <InfoRow icon={History} label="Última reprodução" value={formatDate(song.lastPlayed)} />
                {song.starred && (
                  <InfoRow icon={Heart} label="Favoritado em" value={formatDate(song.starred)} highlight />
                )}
                <InfoRow 
                  icon={Star} 
                  label="Avaliação do Usuário" 
                  value={song.userRating ? `${song.userRating} / 5` : 'Sem avaliação'} 
                  highlight={!!song.userRating}
                />
                <InfoRow 
                  icon={Star} 
                  label="Média de Avaliação" 
                  value={song.averageRating ? `${song.averageRating} / 5` : 'N/A'} 
                />
              </div>
            </div>

            {/* Bloco 4: Arquivo Técnico */}
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-zinc-900">
                <HardDrive className="w-4 h-4" />
                Detalhes Técnicos do Arquivo
              </h3>
              <div className="bg-zinc-900/30 rounded-xl px-5 py-2 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                <InfoRow icon={Clock} label="Duração Total" value={formatTime(song.duration)} />
                <InfoRow icon={HardDrive} label="Tamanho do Arquivo" value={formatFileSize(song.size)} />
                <InfoRow icon={FileAudio} label="Formato / Extensão" value={song.suffix?.toUpperCase()} />
                <InfoRow icon={FileType} label="MIME Type" value={song.contentType} />
                <InfoRow icon={Zap} label="Bitrate" value={song.bitRate ? `${song.bitRate} kbps` : undefined} />
                <InfoRow icon={Activity} label="Sample Rate" value={song.samplingRate ? `${song.samplingRate} Hz` : undefined} />
                <InfoRow icon={Folder} label="Caminho Completo" value={song.path} />
              </div>
            </div>

            {/* Bloco 5: Identificadores do Sistema */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-zinc-900">
                <Fingerprint className="w-4 h-4" />
                Identificadores do Sistema (IDs)
              </h3>
              <div className="bg-zinc-900/30 rounded-xl px-5 py-2 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                <InfoRow icon={Hash} label="ID da Música" value={song.id} />
                <InfoRow icon={Disc} label="ID do Álbum" value={song.albumId} />
                <InfoRow icon={User} label="ID do Artista" value={song.artistId} />
              </div>
            </div>
                    
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongInfoModal;