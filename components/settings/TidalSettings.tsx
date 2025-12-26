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
  const DEFAULT_CLIENT_ID = 'fX2JxdmntZWK0ixT';
  const DEFAULT_CLIENT_SECRET = '1Nn9AfDAjxrgJFJbKNWLeAyKGVGmINuXPPLHVXAvxAg=';

  // Read environment-provided values (Vite: import.meta.env)
  const ENV_CLIENT_ID = (import.meta as any).env?.VITE_TIDAL_CLIENT_ID || undefined;
  const ENV_CLIENT_SECRET = (import.meta as any).env?.VITE_TIDAL_CLIENT_SECRET || undefined;

  const [creds, setCreds] = useState<TidalCredentials>({ clientId: ENV_CLIENT_ID || DEFAULT_CLIENT_ID, clientSecret: ENV_CLIENT_SECRET || DEFAULT_CLIENT_SECRET });
  const [showSaved, setShowSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TidalCredentials, string>>>({});
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const stored: any = getTidalCredentials();
    setCreds({
      clientId: ENV_CLIENT_ID || stored.clientId || DEFAULT_CLIENT_ID,
      clientSecret: ENV_CLIENT_SECRET || stored.clientSecret || DEFAULT_CLIENT_SECRET,
    });
    setIsConnected(tidalService.isAuthenticated());
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TidalCredentials, string>> = {};
    let isValid = true;
    if (!creds.clientId) { newErrors.clientId = 'Client ID é obrigatório.'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  // No manual save UI — credentials are taken from env or stored automatically before auth
  const prepareCredentialsForAuth = () => {
    const clientId = ENV_CLIENT_ID || creds.clientId || DEFAULT_CLIENT_ID;
    const clientSecret = ENV_CLIENT_SECRET || creds.clientSecret || DEFAULT_CLIENT_SECRET;
    // persist chosen values so tidalService can read them
    saveTidalCredentials({ clientId, clientSecret });
    setCreds({ clientId, clientSecret });
  };

  const handleAuthenticate = async () => {
    try {
      setShowSaved(false);
      setAuthStatus('Iniciando autenticação...');
      const data: any = await tidalService.startDeviceAuth();
      // Open verification URL in new tab (prefer verification_uri_complete)
      const openUrl = data.verificationUriComplete;
      if (openUrl) window.open(`https://${openUrl}`, '_blank');

      setAuthStatus(`Código: ${data.userCode} — Aguardando autorização...`);

      // Poll for token
      const tokenData = await tidalService.pollDeviceToken(data.deviceCode, data.interval || 5, data.expiresIn || 600);
      if (tokenData && tokenData.access_token) {
        setAuthStatus('Autenticação bem-sucedida!');
        // Refresh displayed creds from storage
        const stored: any = getTidalCredentials();
        setCreds(stored);
        setIsConnected(true);
        setTimeout(() => setAuthStatus(''), 5000);
      }
    } catch (e: any) {
      console.error('Auth error', e);
      setAuthStatus('Falha na autenticação: ' + (e.message || String(e)));
      setTimeout(() => setAuthStatus(''), 5000);
    }
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
        <p className="text-zinc-400 text-base max-w-2xl">Conecte sua conta do TIDAL.</p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-zinc-400">Usando Client ID:</div>
          <div className="font-mono text-sm text-white select-all">{ENV_CLIENT_ID || creds.clientId}</div>
        </div>

          <div className="pt-4 flex flex-wrap items-center gap-4">
              {!isConnected ? (
                <button onClick={() => { prepareCredentialsForAuth(); handleAuthenticate(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Conectar</button>
              ) : (
                <button onClick={() => { tidalService.logout(); setIsConnected(false); setAuthStatus('Desconectado'); setTimeout(() => setAuthStatus(''), 3000); }} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-95">Desconectar</button>
              )}

              {authStatus && (<div className="flex items-center gap-2 text-sm font-medium animate-fade-in text-zinc-300">{authStatus}</div>)}
          </div>
      </div>
    </div>
  );
};

export default TidalSettings;
