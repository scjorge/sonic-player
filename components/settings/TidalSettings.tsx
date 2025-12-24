import React, { useEffect, useState } from 'react';
import { TidalCredentials } from '../../types';
import { getTidalCredentials, saveTidalCredentials } from '../../services/data';
import { tidalService } from '../../services/tidalService';
import { Key, Save, CheckCircle2, AlertCircle, Trash2, Copy } from 'lucide-react';

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

const TidalSettings: React.FC = () => {
  const [creds, setCreds] = useState<TidalCredentials>({ clientId: '', clientSecret: '' });
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
    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveTidalCredentials({ clientId: creds.clientId, clientSecret: creds.clientSecret });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleDelete = () => {
    const empty: any = { clientId: '', clientSecret: '' };
    setCreds(empty);
    saveTidalCredentials(empty);
    setErrors({});
    tidalService.clearCredentials();
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
              Client Secret
            </label>
            <input type="password" value={creds.clientSecret || ''} onChange={(e) => setCreds({ ...creds, clientSecret: e.target.value })} placeholder="Seu Client Secret do TIDAL (opcional)" className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono border-zinc-700 focus:border-green-500`} />
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"><Save className="w-4 h-4" />Salvar</button>

            <button onClick={handleDelete} className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-zinc-500/10 active:scale-95"><Trash2 className="w-4 h-4" />Apagar</button>

            {showSaved && (<div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in"><CheckCircle2 className="w-4 h-4" />Credenciais salvas!</div>)}
        </div>
      </div>

      <div className="bg-zinc-900/30 rounded-xl p-6 border border-dashed border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-300 mb-2">Como obter estas credenciais?</h4>
          <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
              <li>Registre um app em <a href="https://developer.tidal.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">TIDAL for Developers</a>.</li>
              <li>Copie o Client ID em <strong>Overview</strong></li>
              <li>Em <strong>Settings</strong>, defina os escopos necessários (opcional) e adicione uma "Redirect URI"
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

export default TidalSettings;
