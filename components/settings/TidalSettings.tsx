import React, { useEffect, useState } from 'react';
import { TidalCredentials } from '../../types';
import { getTidalCredentials } from '../../services/data';
import { tidalService } from '../../services/tidalService';
import { TIDAL_CLIENT_ID, TIDAL_CLIENT_SECRET } from '../../core/config';


const TidalSettings: React.FC = () => {
  const [creds, setCreds] = useState<TidalCredentials>({ clientId: TIDAL_CLIENT_ID, clientSecret: TIDAL_CLIENT_SECRET });
  const [showSaved, setShowSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TidalCredentials, string>>>({});
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    setCreds({
      clientId: TIDAL_CLIENT_ID,
      clientSecret: TIDAL_CLIENT_SECRET,
    });
    setIsConnected(tidalService.isAuthenticated());
  }, []);

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
      const tokenData = await tidalService.pollDeviceToken(data.deviceCode, data.interval || 5, data.expiresIn / 2 || 60);
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
          <div className="font-mono text-sm text-white select-all">{creds.clientId}</div>
        </div>

          <div className="pt-4 flex flex-wrap items-center gap-4">
              {!isConnected ? (
                <button onClick={() => { handleAuthenticate(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Conectar</button>
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
