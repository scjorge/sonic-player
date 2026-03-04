import React, { useEffect, useState } from 'react';
import type { GeneralSettings } from '../../repository/generalSettings';
import { getGeneralSettings, saveGeneralSettings } from '../../repository/generalSettings';
import { AlertCircle, CheckCircle2, Save, Info, Settings2, Lock, User, Mail, Edit2 } from 'lucide-react';
import { NAVIDROME_SAVE_FORMAT_DEFAULT } from '../../../core/config';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import showToast from '../utils/toast';

const placeholderMeta = {
  genre: 'Rock',
  artist: 'Queen',
  album: 'A Night at the Opera',
  year: 1975,
  track: 1,
  title: 'Bohemian Rhapsody',
  ext: 'flac',
};

function buildPreview(format: string): string {
  let result = format || '';
  result = result.replace(/{genre}/g, placeholderMeta.genre);
  result = result.replace(/{artist}/g, placeholderMeta.artist);
  result = result.replace(/{album}/g, `${placeholderMeta.album}`);
  result = result.replace(/{year}/g, String(placeholderMeta.year));
  result = result.replace(/{track}/g, String(placeholderMeta.track).padStart(2, '0'));
  result = result.replace(/{title}/g, placeholderMeta.title);
  result = result.replace(/{ext}/g, placeholderMeta.ext);
  return result;
}

const GeneralSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<GeneralSettings>({ navidromeSaveFormat: NAVIDROME_SAVE_FORMAT_DEFAULT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'account'>('templates');
  
  // Account form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    (async () => {
      try {
        const settings = await getGeneralSettings();
        setForm(settings);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Falha ao carregar configurações');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const handleChangeFormat = (value: string) => {
    setForm(prev => ({ ...prev, navidromeSaveFormat: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      showToast('Apenas administradores podem editar configurações gerais', 'error');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const savedSettings = await saveGeneralSettings(form);
      setForm(savedSettings);
      setSaved(true);
      showToast('Configurações salvas com sucesso', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Falha ao salvar configurações');
      showToast(e?.message || 'Falha ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos de senha', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      showToast('Senha atualizada com sucesso!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao atualizar senha',
        'error'
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim()) {
      showToast('Nome de usuário e email são obrigatórios', 'error');
      return;
    }

    // Verifica se houve mudança
    if (username === user?.username && email === user?.email) {
      showToast('Nenhuma alteração detectada', 'info');
      return;
    }

    setSavingAccount(true);
    try {
      const result = await authService.updateProfile(
        username !== user?.username ? username : undefined,
        email !== user?.email ? email : undefined
      );
      
      // Atualiza o contexto com os novos dados do usuário
      await refreshUser();
      
      showToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao atualizar perfil',
        'error'
      );
      // Reverte as mudanças em caso de erro
      if (user) {
        setUsername(user.username);
        setEmail(user.email);
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const previewPath = buildPreview(form.navidromeSaveFormat || '');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-zinc-400">Carregando configurações...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings2 className="w-7 h-7 text-indigo-400" />
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Geral
            </h2>
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-sm w-fit">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Template Navidrome
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${activeTab === 'account'
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Conta
          </button>
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
          {!isAdmin && (
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-400 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Apenas administradores podem editar as configurações gerais. As configurações são compartilhadas entre todos os usuários.</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              Template de caminho
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                <Info className="w-3 h-3" />
                Use chaves como {`{genre}`}, {`{artist}`}, {`{album}`}, {`{year}`}, {`{track}`}, {`{title}`}, {`{ext}`}
              </span>
            </label>
            <textarea
              value={form.navidromeSaveFormat}
              onChange={(e) => handleChangeFormat(e.target.value)}
              rows={1}
              disabled={!isAdmin}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              Preview de exemplo
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 font-mono text-xs overflow-x-auto">
              {previewPath}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Baseado em uma faixa hipotética: <span className="font-semibold">{placeholderMeta.artist}</span> - <span className="font-semibold">{placeholderMeta.title}</span> ({placeholderMeta.album}, {placeholderMeta.year}).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium animate-fade-in mt-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !isAdmin}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>

            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Configurações salvas!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-8">
          {/* User Info Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
            <div className="bg-indigo-600 p-4 rounded-full">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{user?.username}</h3>
              <p className="text-sm text-zinc-400">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-full">
                {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
              </span>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Informações do Perfil
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Seu nome de usuário"
                  disabled={savingAccount}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="seu@email.com"
                  disabled={savingAccount}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingAccount || (username === user?.username && email === user?.email)}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"
              >
                <Save className="w-4 h-4" />
                {savingAccount ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          {/* Password Change */}
          <div className="space-y-4 pt-6 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Alterar Senha
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Digite sua senha atual"
                  disabled={savingAccount}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Digite a nova senha"
                  disabled={savingAccount}
                />
                <p className="text-xs text-zinc-500 mt-1">Mínimo de 6 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Confirme a nova senha"
                  disabled={savingAccount}
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={savingAccount}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"
              >
                <Lock className="w-4 h-4" />
                {savingAccount ? 'Alterando Senha...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralSettings;
