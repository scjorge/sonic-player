import React from 'react';
import { Image, Upload } from 'lucide-react';

interface CoverArtProps {
  currentCoverUrl: string | null;
  onCoverChange: (file: File) => void;
  compact?: boolean;
}

const CoverArt: React.FC<CoverArtProps> = ({ currentCoverUrl, onCoverChange, compact = false }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCoverChange(e.target.files[0]);
    }
  };

  if (compact) {
    return (
      <div className="relative group w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0 border border-zinc-700 hover:border-indigo-500 transition-colors">
        {currentCoverUrl ? (
          <img src={currentCoverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Image className="w-5 h-5" />
          </div>
        )}
        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
          <Upload className="w-4 h-4 text-white" />
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative group w-full aspect-square bg-zinc-800 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-indigo-500 transition-colors flex items-center justify-center">
        {currentCoverUrl ? (
          <img 
            src={currentCoverUrl} 
            alt="Album Art" 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="text-zinc-500 flex flex-col items-center">
            <Image className="w-12 h-12 mb-2" />
            <span className="text-sm">Sem Capa</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <label className="cursor-pointer p-3 bg-zinc-200 text-zinc-900 rounded-full hover:bg-white transition-transform hover:scale-105" title="Carregar imagem">
            <Upload className="w-5 h-5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default CoverArt;