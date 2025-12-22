
import React, { useState, useEffect } from 'react';
import { SpotifyCredentials } from '../../types';
import { saveSpotifyCredentials, getSpotifyCredentials } from '../../services/data';
import { spotifyService } from '../../services/spotifyService'; // Importar spotifyService
import { Key, ShieldCheck, Save, CheckCircle2, Info, Share, Trash2, AlertCircle, LogIn, LogOut, Copy } from 'lucide-react';

const CopyButton: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const redirect = `${window.location.origin}/callback`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redirect);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };
  return (
    <button onClick={handleCopy} className="bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-1 rounded text-xs flex items-center gap-2">
      {copied ? <span className="text-green-400">Copiado!</span> : <><Copy className="w-4 h-4" /> Copiar</>}
    </button>
  );
};

interface SpotifySettingsProps {
    isAuthenticated: boolean;
    authMessage: string;
    setIsAuthenticated: (auth: boolean) => void;
    setAuthMessage: (msg: string) => void;
}

const SpotifySettings: React.FC<SpotifySettingsProps> = ({ 
    isAuthenticated, 
    authMessage, 
    setIsAuthenticated, 
    setAuthMessage 
}) => {
  const [creds, setCreds] = useState<SpotifyCredentials>({ clientId: '', clientSecret: '', redirectUri: '' });
  const [showSaved, setShowSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SpotifyCredentials, string>>>({});

  useEffect(() => {
    const stored = getSpotifyCredentials();
    setCreds(stored); // Carrega todas as credenciais, incluindo tokens se existirem
    // A autenticação agora é gerenciada pelo App.tsx e passada via prop
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SpotifyCredentials, string>> = {};
    let isValid = true;

    if (!creds.clientId) {
      newErrors.clientId = "Client ID é obrigatório.";
      isValid = false;
    }
    if (!creds.clientSecret) {
      newErrors.clientSecret = "Client Secret é obrigatório.";
      isValid = false;
    }
    if (!creds.redirectUri) {
      newErrors.redirectUri = "Redirect URI é obrigatória.";
      isValid = false;
    } else {
      try {
        new URL(creds.redirectUri);
      } catch (_) {
        newErrors.redirectUri = "A Redirect URI deve ser uma URL válida.";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (validate()) {
      // Ao salvar credenciais básicas, limpamos os tokens de usuário antigos
      // para garantir que uma nova autenticação seja necessária se as credenciais mudarem.
      const credsToSave = {
        ...creds,
        accessToken: undefined,
        refreshToken: undefined,
        expiresAt: undefined,
      };
      saveSpotifyCredentials(credsToSave);
      setCreds(credsToSave); // Atualiza o estado local para refletir a limpeza dos tokens
      setIsAuthenticated(false); // Garante que o estado de autenticação seja redefinido
      spotifyService.logout(); // Limpa os tokens também no serviço
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  };

  const handleDelete = () => {
    // Limpa todas as credenciais, incluindo tokens
    const emptyCreds = { clientId: '', clientSecret: '', redirectUri: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined };
    setCreds(emptyCreds);
    saveSpotifyCredentials(emptyCreds);
    setErrors({}); // Limpa quaisquer erros de validação
    setIsAuthenticated(false); // Reseta o estado de autenticação
    spotifyService.logout(); // Garante que o serviço também limpe os tokens
  };

  const handleAuthenticate = () => {
    if (!creds.clientId || !creds.redirectUri) {
      setAuthMessage("Preencha o Client ID e a Redirect URI antes de autenticar.");
      setTimeout(() => setAuthMessage(''), 5000);
      return;
    }
    const authUrl = spotifyService.getAuthorizationUrl();
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      setAuthMessage("Não foi possível gerar a URL de autenticação. Verifique as credenciais.");
      setTimeout(() => setAuthMessage(''), 5000);
    }
  };

  const handleLogout = () => {
    spotifyService.logout();
    setIsAuthenticated(false);
    setAuthMessage("Desconectado do Spotify.");
    setTimeout(() => setAuthMessage(''), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png" className="w-8 h-8 object-contain" alt="Spotify" />
            Spotify API
        </h2>
        <p className="text-zinc-400 text-base max-w-2xl">
            Configure suas credenciais da API do Spotify para habilitar recursos como busca automática de capas em alta resolução e sincronização de metadados. Para funcionalidades que exigem acesso à sua conta (e.g., criação de playlists), uma autenticação adicional é necessária.
        </p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
            {/* Client ID */}
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
                    className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.clientId ? 'border-red-500' : 'border-zinc-700 focus:border-green-500'}`}
                />
                {errors.clientId && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.clientId}</p>}
            </div>

            {/* Client Secret */}
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
                    className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.clientSecret ? 'border-red-500' : 'border-zinc-700 focus:border-green-500'}`}
                />
                {errors.clientSecret && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.clientSecret}</p>}
            </div>
            
            {/* Redirect URI */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Share className="w-4 h-4" />
                    Redirect URI
                    <div className="relative group">
                        <Info className="w-4 h-4 text-zinc-600 cursor-pointer" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-zinc-700">
                            A Redirect URI é necessária para funcionalidades de autenticação, como a criação de playlists. Insira a URL exata que você configurou no seu app do Spotify.
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-zinc-800 rotate-45"></div>
                        </div>
                    </div>
                </label>
                <input 
                    type="text" 
                    value={creds.redirectUri || ''}
                    onChange={(e) => setCreds({ ...creds, redirectUri: e.target.value })}
                    placeholder="Ex: http://localhost:3000/callback"
                    className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.redirectUri ? 'border-red-500' : 'border-zinc-700 focus:border-green-500'}`}
                />
                {errors.redirectUri && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.redirectUri}</p>}
            </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
            <button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-500 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"
            >
                <Save className="w-4 h-4" />
                Salvar
            </button>

            {!isAuthenticated ? (
              <button 
                  onClick={handleAuthenticate}
                  className="bg-spotify-green-500 hover:bg-spotify-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-spotify-green-500/20 active:scale-95"
              >
                  <LogIn className="w-4 h-4" />
                  Autenticar
              </button>
            ) : (
              <button 
                  onClick={handleLogout}
                  className="bg-red-600/80 hover:bg-red-500/80 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/10 active:scale-95"
              >
                  <LogOut className="w-4 h-4" />
                  Desconectar
              </button>
            )}

            <button 
                onClick={handleDelete}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-zinc-500/10 active:scale-95"
            >
                <Trash2 className="w-4 h-4" />
                Apagar
            </button>


            {showSaved && (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Credenciais salvas!
                </div>
            )}
            {authMessage && (
                <div className={`flex items-center gap-2 text-sm font-medium animate-fade-in ${authMessage.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
                    {authMessage.includes('sucesso') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {authMessage}
                </div>
            )}
            {isAuthenticated && (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Autenticado com Spotify
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
              <li className="flex items-center gap-3">Na mesma página de "Settings", adicione uma "Redirect URI":
                <div className="ml-2 flex items-center gap-2">
                  <code className="bg-zinc-700/50 text-xs rounded p-1">{window.location.origin}/callback</code>
                  <CopyButton />
                </div>
              </li>
          </ol>
      </div>
    </div>
  );
};

export default SpotifySettings;
