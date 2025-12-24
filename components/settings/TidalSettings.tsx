import React, { useEffect, useState } from 'react';
import { TidalCredentials } from '../../types';
import { getTidalCredentials, saveTidalCredentials } from '../../services/data';
import { tidalService } from '../../services/tidalService';
import { Key, Save, CheckCircle2, AlertCircle, LogIn, LogOut, Trash2, Info, Copy } from 'lucide-react';

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

interface Props {
  isAuthenticated: boolean;
  authMessage: string;
  setIsAuthenticated: (v: boolean) => void;
  setAuthMessage: (msg: string) => void;
}

const TidalSettings: React.FC<Props> = ({ isAuthenticated, authMessage, setIsAuthenticated, setAuthMessage }) => {
  const [creds, setCreds] = useState<TidalCredentials>({ clientId: '', redirectUri: '' });
  const [showSaved, setShowSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TidalCredentials, string>>>({});

  useEffect(() => {
    const stored: any = getTidalCredentials();
    setCreds(stored);
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TidalCredentials, string>> = {};
    let isValid = true;
    if (!creds.clientId) { newErrors.clientId = 'Client ID é obrigatório.'; isValid = false; }
    if (!creds.redirectUri) { newErrors.redirectUri = 'Redirect URI é obrigatória.'; isValid = false; }
    else { try { new URL(creds.redirectUri); } catch (_) { newErrors.redirectUri = 'A Redirect URI deve ser uma URL válida.'; isValid = false; } }
    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!validate()) return;
    const toSave = { ...creds, accessToken: undefined, refreshToken: undefined, expiresAt: undefined } as any;
    saveTidalCredentials(toSave);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleDelete = () => {
    const empty = { clientId: '', redirectUri: '', scopes: '', accessToken: undefined, refreshToken: undefined, expiresAt: undefined } as any;
    setCreds(empty);
    saveTidalCredentials(empty);
    setErrors({});
    setIsAuthenticated(false);
    tidalService.logout();
  };

  const handleAuthenticate = async () => {
    if (!creds.clientId || !creds.redirectUri) {
      setAuthMessage('Preencha Client ID e Redirect URI antes de autenticar.');
      setTimeout(() => setAuthMessage(''), 5000);
      return;
    }
    const url = await tidalService.getAuthorizationUrl(creds.scopes || '');
    if (url) window.location.href = url;
    else {
      setAuthMessage('Não foi possível gerar URL de autenticação do Tidal.');
      setTimeout(() => setAuthMessage(''), 5000);
    }
  };

  const handleLogout = () => {
    tidalService.logout();
    setIsAuthenticated(false);
    setAuthMessage('Desconectado do Tidal.');
    setTimeout(() => setAuthMessage(''), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <img src="https://tidal.com/favicon.ico" className="w-8 h-8 object-contain" alt="Tidal" />
            TIDAL API
        </h2>
        <p className="text-zinc-400 text-base max-w-2xl">Configure o Client ID e Redirect URI para permitir autenticação via Authorization Code (PKCE) com o TIDAL.</p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Client ID
                </label>
                <input type="text" value={creds.clientId} onChange={(e) => setCreds({ ...creds, clientId: e.target.value })} placeholder="Seu Client ID do TIDAL" className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.clientId ? 'border-red-500' : 'border-zinc-700 focus:border-green-500'}`} />
                {errors.clientId && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.clientId}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Redirect URI
                    <div className="relative group">
                        <Info className="w-4 h-4 text-zinc-600 cursor-pointer" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg border border-zinc-700">
                            Insira a mesma Redirect URI configurada no painel de desenvolvedor do TIDAL.
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-zinc-800 rotate-45"></div>
                        </div>
                    </div>
                </label>
                <input type="text" value={creds.redirectUri || ''} onChange={(e) => setCreds({ ...creds, redirectUri: e.target.value })} placeholder="Ex: http://localhost:3000/callback" className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.redirectUri ? 'border-red-500' : 'border-zinc-700 focus:border-green-500'}`} />
                {errors.redirectUri && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.redirectUri}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">Escopos (opcional)</label>
                <input type="text" value={creds.scopes || ''} onChange={(e) => setCreds({ ...creds, scopes: e.target.value })} placeholder="Ex: r_usr w_usr" className="w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono border-zinc-700 focus:border-green-500" />
            </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"><Save className="w-4 h-4" />Salvar</button>
            {!isAuthenticated ? (
              <button onClick={handleAuthenticate} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"><LogIn className="w-4 h-4" />Autenticar</button>
            ) : (
              <button onClick={handleLogout} className="bg-red-600/80 hover:bg-red-500/80 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/10 active:scale-95"><LogOut className="w-4 h-4" />Desconectar</button>
            )}

            <button onClick={handleDelete} className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-zinc-500/10 active:scale-95"><Trash2 className="w-4 h-4" />Apagar</button>

            {showSaved && (<div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in"><CheckCircle2 className="w-4 h-4" />Credenciais salvas!</div>)}
            {authMessage && (<div className={`flex items-center gap-2 text-sm font-medium animate-fade-in ${authMessage.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{authMessage.includes('sucesso') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{authMessage}</div>)}
            {isAuthenticated && (<div className="flex items-center gap-2 text-green-400 text-sm font-medium"><CheckCircle2 className="w-4 h-4" />Autenticado com TIDAL</div>)}
        </div>
      </div>

      <div className="bg-zinc-900/30 rounded-xl p-6 border border-dashed border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-300 mb-2">Como obter estas credenciais?</h4>
          <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
              <li>Registre um app em <a href="https://developer.tidal.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">TIDAL for Developers</a>.</li>
              <li>Adicione a Redirect URI nas configurações do app.</li>
              <li>Salve o Client ID e defina os escopos necessários (opcional).</li>
              <li>Use o botão <strong>Autenticar</strong> para iniciar o fluxo PKCE e autorizar sua conta.</li>
              <li>Ao final você será redirecionado para <code className="bg-zinc-700/50 text-xs rounded p-1">{window.location.origin}/callback</code>. <CopyButton /></li>
          </ol>
      </div>
    </div>
  );
};

export default TidalSettings;
