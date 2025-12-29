import React from 'react';
import { MusicFile } from '../../../types';
import { FileAudio, Music, PlusCircle, Settings, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx'; 

interface FileSidebarProps {
  files: MusicFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  currentView: 'editor' | 'settings';
}

const FileSidebar: React.FC<FileSidebarProps> = ({ files, activeId, onSelect, onAddFiles, onOpenSettings, currentView }) => {
  return (
    <div className="w-full md:w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-indigo-500" />
          Arquivos
        </h2>
        <label className="cursor-pointer text-zinc-400 hover:text-indigo-400 transition-colors p-1" title="Adicionar Arquivos">
          <PlusCircle className="w-6 h-6" />
          <input 
            type="file" 
            multiple 
            accept="audio/mpeg, audio/mp3" 
            className="hidden" 
            onChange={onAddFiles}
          />
        </label>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm p-4 text-center">
            <Music className="w-8 h-8 mb-2 opacity-20" />
            <p>Nenhum arquivo carregado.</p>
            <p className="text-xs opacity-60">Adicione MP3s para começar.</p>
          </div>
        ) : (
          files.map((file) => (
            <button
              key={file.id}
              onClick={() => {
                onSelect(file.id);
              }}
              className={clsx(
                "w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all",
                activeId === file.id && currentView === 'editor'
                  ? "bg-zinc-800 border border-zinc-700 shadow-sm" 
                  : "hover:bg-zinc-800/50 border border-transparent"
              )}
            >
              <div className={clsx(
                "w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden",
                activeId === file.id && currentView === 'editor' ? "bg-indigo-500/20" : "bg-zinc-800"
              )}>
                {file.coverUrl ? (
                  <img src={file.coverUrl} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <Music className={clsx("w-5 h-5", activeId === file.id && currentView === 'editor' ? "text-indigo-400" : "text-zinc-600")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx("font-medium text-sm truncate", activeId === file.id && currentView === 'editor' ? "text-white" : "text-zinc-300")}>
                  {file.metadata.title || file.fileName}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {file.metadata.artist || "Artista Desconhecido"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <button 
          onClick={onOpenSettings}
          className={clsx(
            "w-full flex items-center gap-3 p-3 rounded-lg transition-colors font-medium text-sm",
            currentView === 'settings' 
              ? "bg-indigo-600 text-white" 
              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
          )}
        >
          {currentView === 'settings' ? <Settings className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          {currentView === 'settings' ? "Configurando Grupos" : "Configurar Grupos"}
        </button>
      </div>
    </div>
  );
};

export default FileSidebar;