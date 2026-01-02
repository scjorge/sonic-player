import React, { useEffect, useState } from 'react';
import { Key, Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getYoutubeConfig, saveYoutubeConfig, deleteYoutubeConfig, YoutubeConfig } from '../../repository/youtube';

const YoutubeSettings: React.FC = () => {
    const [config, setConfig] = useState<YoutubeConfig>({ apiKey: '' });
    const [error, setError] = useState<string | null>(null);
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const stored = await getYoutubeConfig();
            setConfig(stored);
        };
        load();
    }, []);

    const validate = (): boolean => {
        if (!config.apiKey.trim()) {
            setError('A chave da API é obrigatória.');
            return false;
        }
        setError(null);
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        await saveYoutubeConfig({ apiKey: config.apiKey.trim() });
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
    };

    const handleDelete = async () => {
        await deleteYoutubeConfig();
        setConfig({ apiKey: '' });
        setError(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in relative">
            <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-xs font-black">YT</span>
                    YouTube API
                </h2>
                <p className="text-zinc-400 text-base max-w-2xl">
                    Cadastre a chave da API do YouTube para habilitar a busca do YouTube Music.
                </p>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Key
                    </label>
                    <input
                        type="text"
                        value={config.apiKey}
                        onChange={(e) => setConfig({ apiKey: e.target.value })}
                        placeholder="Sua chave da API do YouTube"
                        className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder-zinc-800 font-mono ${error ? 'border-red-500' : 'border-zinc-700 focus:border-red-500'}`}
                    />
                    {error && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </p>
                    )}
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="bg-red-600 hover:bg-red-500 text-black px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/10 active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        Salvar
                    </button>

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
                            Chave salva!
                        </div>
                    )}
                    <div className="mt-3 text-xs text-zinc-500 space-y-1 max-w-2xl">
                        <p className="font-semibold text-zinc-400">Como obter a chave:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Acesse o console do Google Cloud: <span className="underline decoration-dotted">https://console.cloud.google.com/</span></li>
                            <li>Crie ou selecione um projeto.</li>
                            <li>No menu lateral, vá em "APIs e serviços" &gt; "Biblioteca".</li>
                            <li>Procure por <span className="font-semibold">YouTube Data API v3</span> e clique em "Ativar".</li>
                            <li>Depois, em "APIs e serviços" &gt; "Credenciais", clique em "Criar credenciais" &gt; "Chave de API".</li>
                            <li>Copie a chave gerada e cole no campo abaixo.</li>
                            <li>Opcional: em "Restrições de aplicativo/origem", permita o domínio onde o SonicTag está rodando.</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default YoutubeSettings;
