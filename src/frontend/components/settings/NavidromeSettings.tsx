import React, { useState, useEffect } from 'react';
import { NavidromeCredentials } from '../../../types';
import { getNavidromeCredentials, saveNavidromeCredentials, shouldUseSonicCredentials, setUseSonicCredentials } from '../../repository/navidrome';
import { Save, Link, Key, User, CheckCircle2, AlertCircle, Server, Trash2, Lock } from 'lucide-react';
import { navidromeService } from '../../services/navidromeService';
import { NAVIDROME_BASE_URL } from  '../../../core/config';
import { authService } from '../../services/authService';

interface NavidromeSettingsProps {
  onCredsChange?: () => void;
}

const NavidromeSettings: React.FC<NavidromeSettingsProps> = ({ onCredsChange }) => {
  const [creds, setCreds] = useState<NavidromeCredentials>({ baseUrl: '', user: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof NavidromeCredentials, string>>>({});
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [useSonicCreds, setUseSonicCreds] = useState(shouldUseSonicCredentials());
  const currentUser = authService.getCurrentUserSync();
  const hasSonicPassword = authService.hasSessionPassword();

  useEffect(() => {
    const stored = getNavidromeCredentials();
    // Se não há baseUrl salva, usa o padrão
    setCreds({
      baseUrl: stored.baseUrl || NAVIDROME_BASE_URL,
      user: stored.user,
      password: stored.password
    });
  }, [useSonicCreds]);

  const handleToggleSonicCreds = (enabled: boolean) => {
    setUseSonicCreds(enabled);
    setUseSonicCredentials(enabled);
    
    if (enabled && currentUser && hasSonicPassword) {
      // Atualiza os campos com as credenciais do Sonic Player
      const stored = getNavidromeCredentials();
      setCreds(stored);
    }
    
    setTestResult(null);
    if (onCredsChange) onCredsChange();
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof NavidromeCredentials, string>> = {};
    let ok = true;
    if (!creds.baseUrl) {
      newErrors.baseUrl = 'URL é obrigatória.';
      ok = false;
    } else {
      try { new URL(creds.baseUrl); } catch { newErrors.baseUrl = 'URL inválida.'; ok = false; }
    }
    if (!creds.user) { newErrors.user = 'Usuário é obrigatório.'; ok = false; }
    if (!creds.password) { newErrors.password = 'Senha é obrigatória.'; ok = false; }
    setErrors(newErrors);
    return ok;
  };

  const handleSave = () => {
    // Se baseUrl estiver vazio, usa o padrão
    const finalCreds = {
      ...creds,
      baseUrl: creds.baseUrl || NAVIDROME_BASE_URL
    };
    
    if (!validate()) return;
    saveNavidromeCredentials(finalCreds);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setTestResult(null);
    if (onCredsChange) onCredsChange();
  };

  const handleDelete = () => {
    const empty = { baseUrl: '', user: '', password: '' };
    saveNavidromeCredentials(empty);
    setCreds(empty);
    setErrors({});
    setSaved(false);
    setTestResult('Credenciais apagadas');
    setTimeout(() => setTestResult(null), 3000);
    if (onCredsChange) onCredsChange();
  };

  const handleTest = async () => {
    // Se baseUrl estiver vazio, usa o padrão
    const finalCreds = {
      ...creds,
      baseUrl: creds.baseUrl || NAVIDROME_BASE_URL
    };
    
    if (!validate()) return;
    // Save temporarily so service can pick up
    saveNavidromeCredentials(finalCreds);
    try {
      const res = await navidromeService.ping();
      if (res.ok) {
        setTestResult('Conexão bem-sucedida');
      } else {
        setTestResult(`Falha na conexão: ${res.message || 'sem detalhes'}`);
      }
    } catch (e) {
      setTestResult(`Falha na conexão: ${e?.message || String(e)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Link className="w-8 h-8 text-indigo-400" />
          Navidrome / Subsonic
        </h2>
        <p className="text-zinc-400 text-base max-w-2xl">
          Configure a URL do seu servidor Navidrome (Subsonic API), usuário e senha para habilitar acesso à sua biblioteca local.
        </p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
        {/* Opção de usar credenciais do Sonic Player */}
        {hasSonicPassword && currentUser && (
          <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-base">Usar credenciais do Sonic Player</h3>
                    <p className="text-zinc-400 text-sm mt-1">
                      Conectar ao Navidrome usando o mesmo usuário e senha do Sonic Player ({currentUser.username})
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSonicCreds(!useSonicCreds)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useSonicCreds ? 'bg-indigo-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useSonicCreds ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {useSonicCreds && (
                  <div className="text-xs text-indigo-300 bg-indigo-950/50 rounded-lg p-3">
                    ℹ️ Os campos de usuário e senha são preenchidos automaticamente. Apenas configure a URL do servidor Navidrome.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4" /> Base URL
            </label>
            <input 
              type="text" 
              value={creds.baseUrl || NAVIDROME_BASE_URL} 
              disabled={true}
              onChange={(e) => setCreds({ ...creds, baseUrl: e.target.value })} 
              placeholder="https://nav.example.com" 
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${errors.baseUrl ? 'border-red-500' : 'border-zinc-700 focus:border-indigo-500'}`} 
            />
            {errors.baseUrl && <p className="text-red-500 text-xs"><AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />{errors.baseUrl}</p>}
            {creds.baseUrl === NAVIDROME_BASE_URL && (
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Usando URL padrão do sistema
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" /> Usuário
            </label>
            <input 
              type="text" 
              value={creds.user || (useSonicCreds && currentUser ? currentUser.username : '')} 
              onChange={(e) => setCreds({ ...creds, user: e.target.value })} 
              placeholder="username" 
              disabled={useSonicCreds}
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${useSonicCreds ? 'opacity-50 cursor-not-allowed' : ''} ${errors.user ? 'border-red-500' : 'border-zinc-700 focus:border-indigo-500'}`} 
            />
            {errors.user && <p className="text-red-500 text-xs"><AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />{errors.user}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4" /> Senha
            </label>
            <input 
              type="password" 
              value={creds.password} 
              onChange={(e) => setCreds({ ...creds, password: e.target.value })} 
              placeholder={useSonicCreds ? "••••••••" : "password"} 
              disabled={useSonicCreds}
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${useSonicCreds ? 'opacity-50 cursor-not-allowed' : ''} ${errors.password ? 'border-red-500' : 'border-zinc-700 focus:border-indigo-500'}`} 
            />
            {errors.password && <p className="text-red-500 text-xs"><AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />{errors.password}</p>}
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"><Save className="w-4 h-4" /> Salvar</button>
          <button onClick={handleTest} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"><Server className="w-4 h-4" /> Testar Conexão</button>
          <button onClick={handleDelete} className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"><Trash2 className="w-4 h-4" /> Apagar</button>

          {saved && (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in"><CheckCircle2 className="w-4 h-4" /> Credenciais salvas!</div>
          )}

          {testResult && (
            <div className={`flex items-center gap-2 text-sm font-medium animate-fade-in ${testResult.includes('bem-sucedida') ? 'text-green-400' : 'text-red-400'}`}>
              {testResult.includes('bem-sucedida') ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavidromeSettings;
