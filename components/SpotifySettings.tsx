
import React, { useState, useEffect } from 'react';
import { SpotifyCredentials } from '../types';
import { saveSpotifyCredentials, getSpotifyCredentials } from '../services/data';
import { Key, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';

const SpotifySettings: React.FC = () => {
  const [creds, setCreds] = useState<SpotifyCredentials>({ clientId: '', clientSecret: '' });
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const stored = getSpotifyCredentials();
    setCreds(stored);
  }, []);

  const handleSave = () => {
    saveSpotifyCredentials(creds);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png" className="w-8 h-8 object-contain" alt="Spotify" />
            Spotify API
        </h2>
        <p className="text-zinc-400 text-base max-w-2xl">
            Configure suas credenciais da API do Spotify para habilitar recursos como busca automática de capas em alta resolução e sincronização de metadados.
        </p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Client ID
                </label>
                <input 
                    type="text" 
                    value={creds.clientId}
                    onChange={(e) => setCreds({ ...creds, clientId: e.target.value })}
                    placeholder="Seu Client ID do Spotify"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors placeholder-zinc-800 font-mono"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Client Secret
                </label>
                <input 
                    type="password" 
                    value={creds.clientSecret}
                    onChange={(e) => setCreds({ ...creds, clientSecret: e.target.value })}
                    placeholder="Seu Client Secret do Spotify"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors placeholder-zinc-800 font-mono"
                />
            </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
            <button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-500 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"
            >
                <Save className="w-4 h-4" />
                Salvar Credenciais
            </button>

            {showSaved && (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Configurações salvas com sucesso!
                </div>
            )}
        </div>
      </div>

      <div className="bg-zinc-900/30 rounded-xl p-6 border border-dashed border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-300 mb-2">Como obter estas credenciais?</h4>
          <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
              <li>Acesse o <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-green-500 hover:underline">Spotify for Developers Dashboard</a>.</li>
              <li>Faça login com sua conta Spotify.</li>
              <li>Clique em "Create app", dê um nome e descrição.</li>
              <li>Vá em "Settings" no seu novo app para visualizar o Client ID e Client Secret.</li>
          </ol>
      </div>
    </div>
  );
};

export default SpotifySettings;
