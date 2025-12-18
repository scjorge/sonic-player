import React, { useState } from 'react';
import { X, Save, Globe, Lock, ListPlus } from 'lucide-react';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (name: string, isPublic: boolean) => Promise<void>;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    await onCreate(name, isPublic);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-indigo-500" />
                Nova Playlist
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
            </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Minha Playlist Favorita"
                    autoFocus
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700"
                />
            </div>

            <div className="space-y-2">
                 <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visibilidade</label>
                 <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setIsPublic(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${!isPublic ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}`}
                    >
                        <Lock className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Privada</span>
                        <span className="text-[10px] opacity-60">Só você vê</span>
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isPublic ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900'}`}
                    >
                        <Globe className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Pública</span>
                        <span className="text-[10px] opacity-60">Visível a todos</span>
                    </button>
                 </div>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={!name.trim() || loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    Criar Playlist
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;