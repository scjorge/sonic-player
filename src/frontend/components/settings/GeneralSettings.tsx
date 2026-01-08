import React, { useEffect, useState } from 'react';
import type { GeneralSettings } from '../../repository/generalSettings';
import { getGeneralSettings, saveGeneralSettings } from '../../repository/generalSettings';
import { AlertCircle, CheckCircle2, Save, FolderTree, Info } from 'lucide-react';
import { NAVIDROME_SAVE_FORMAT_DEFAULT } from '../../../core/config';

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
  const [form, setForm] = useState<GeneralSettings>({ navidromeSaveFormat: NAVIDROME_SAVE_FORMAT_DEFAULT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates'>('templates');

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

  const handleChangeFormat = (value: string) => {
    setForm(prev => ({ ...prev, navidromeSaveFormat: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const savedSettings = await saveGeneralSettings(form);
      setForm(savedSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Falha ao salvar configurações');
    } finally {
      setSaving(false);
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
          <FolderTree className="w-7 h-7 text-indigo-400" />
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
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
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
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm resize-y"
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
              disabled={saving}
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
    </div>
  );
};

export default GeneralSettings;
