import React, { useEffect, useState } from 'react';
import { TagGroup } from '../../../types';
import { Plus, Trash2, X, FolderPlus } from 'lucide-react';
import ConfirmationModal from '../library/ConfirmationModal';
import { addStoredGroup, deleteStoredGroup, updateStoredGroup, getStoredGenres, addStoredGenre, deleteStoredGenre } from '../../services/data';

interface GroupSettingsProps {
    groups: TagGroup[];
    onGroupsChange: () => void | Promise<void>;
}

const GroupSettings: React.FC<GroupSettingsProps> = ({ groups, onGroupsChange }) => {
    const [activeTab, setActiveTab] = useState<'groups' | 'genres'>('groups');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPrefix, setNewGroupPrefix] = useState('');
  
  // State for adding item to a specific group
  const [itemInputs, setItemInputs] = useState<Record<string, string>>({});

  // State for deletion confirmation
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

    // Genres state
    const [genres, setGenres] = useState<string[]>([]);
    const [newGenre, setNewGenre] = useState('');

    useEffect(() => {
        (async () => {
            const list = await getStoredGenres();
            setGenres(list);
        })();
    }, []);

    const handleAddGroup = async () => {
    if (!newGroupName.trim() || !newGroupPrefix.trim()) return;
    
    const newGroup: TagGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      prefix: newGroupPrefix,
      items: []
    };

    await addStoredGroup(newGroup);
    onGroupsChange();
    
    setNewGroupName('');
    setNewGroupPrefix('');
  };

  const onRequestDeleteGroup = (id: string, name: string) => {
    setGroupToDelete({ id, name });
  };

    const confirmDeleteGroup = async () => {
    if (groupToDelete) {
                await deleteStoredGroup(groupToDelete.id);
                onGroupsChange();
        setGroupToDelete(null);
    }
  };

    const handleAddItem = async (groupId: string) => {
    const value = itemInputs[groupId];
    if (!value?.trim()) return;

    const group = groups.find(g => g.id === groupId);
    if (group) {
      const updatedGroup = { ...group, items: [...group.items, value.trim()] };
            await updateStoredGroup(updatedGroup);
            onGroupsChange();
    }

    setItemInputs(prev => ({ ...prev, [groupId]: '' }));
  };

    const handleDeleteItem = async (groupId: string, itemIndex: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        const newItems = [...group.items];
        newItems.splice(itemIndex, 1);
        const updatedGroup = { ...group, items: newItems };
        await updateStoredGroup(updatedGroup);
        onGroupsChange();
    }
  };

    const handleAddGenre = async () => {
        if (!newGenre.trim()) return;
        await addStoredGenre(newGenre);
        const list = await getStoredGenres();
        setGenres(list);
        setNewGenre('');
    };

    const handleDeleteGenre = async (genre: string) => {
        await deleteStoredGenre(genre);
        const list = await getStoredGenres();
        setGenres(list);
    };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 animate-fade-in relative">
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                    Tags/Metadados
                </h2>
                <div className="mt-4 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-sm">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                            activeTab === 'groups'
                                ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        Comentários
                    </button>
                    <button
                        onClick={() => setActiveTab('genres')}
                        className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                            activeTab === 'genres'
                                ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                    >
                        Gênero
                    </button>
                </div>
      </div>
            {activeTab === 'groups' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Create Group */}
                    <div className="lg:col-span-1">
                            <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 sticky top-8">
                                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <FolderPlus className="w-4 h-4 text-indigo-500" />
                                            Novo Grupo
                                    </h3>
                                    <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Nome</label>
                                                    <input 
                                                            type="text" 
                                                            value={newGroupName}
                                                            onChange={(e) => setNewGroupName(e.target.value)}
                                                            placeholder="Ex: Vibe"
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700"
                                                    />
                                            </div>
                                            <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Prefixo</label>
                                                    <input 
                                                            type="text" 
                                                            value={newGroupPrefix}
                                                            onChange={(e) => setNewGroupPrefix(e.target.value)}
                                                            placeholder="Ex: v"
                                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700"
                                                    />
                                                    <p className="text-[10px] text-zinc-600">Usado na tag: Nome(prefixo=valor)</p>
                                            </div>
                                            <button 
                                                    onClick={handleAddGroup}
                                                    disabled={!newGroupName || !newGroupPrefix}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 mt-2"
                                            >
                                                    <Plus className="w-5 h-5" /> Criar Grupo
                                            </button>
                                    </div>
                            </div>
                    </div>

                    {/* Right Column: List Groups */}
                    <div className="lg:col-span-2 space-y-6">
                            {groups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                                            <FolderPlus className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="font-medium">Nenhum grupo criado ainda.</p>
                                            <p className="text-sm mt-1">Use o formulário ao lado para começar.</p>
                                    </div>
                            ) : (
                                    groups.map(group => (
                                            <div key={group.id} className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                                                    <div className="bg-zinc-900/80 p-4 flex items-center justify-between border-b border-zinc-800">
                                                            <div className="flex items-center gap-3">
                                                                    <span className="font-bold text-lg text-white">{group.name}</span>
                                                                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-mono border border-zinc-700">{group.prefix}</span>
                                                            </div>
                                                            <button 
                                                                    onClick={() => onRequestDeleteGroup(group.id, group.name)}
                                                                    className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                                                                    title="Excluir Grupo"
                                                            >
                                                                    <Trash2 className="w-5 h-5" />
                                                            </button>
                                                    </div>
                          
                                                    <div className="p-5 space-y-5">
                                                            {/* Items List */}
                                                            <div className="flex flex-wrap gap-2">
                                                                    {group.items.length === 0 && <p className="text-sm text-zinc-600 italic py-2">Lista vazia. Adicione itens abaixo.</p>}
                                                                    {group.items.map((item, idx) => (
                                                                            <div key={idx} className="group flex items-center gap-2 bg-zinc-800 text-zinc-200 pl-3 pr-1 py-1.5 rounded-lg border border-zinc-700 text-sm">
                                                                                    <span>{item}</span>
                                                                                    <button 
                                                                                            onClick={() => handleDeleteItem(group.id, idx)}
                                                                                            className="p-1 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                                                                                    >
                                                                                            <X className="w-3 h-3" />
                                                                                    </button>
                                                                            </div>
                                                                    ))}
                                                            </div>

                                                            {/* Add Item Input */}
                                                            <div className="flex gap-2 relative">
                                                                    <input 
                                                                            type="text" 
                                                                            value={itemInputs[group.id] || ''}
                                                                            onChange={(e) => setItemInputs({ ...itemInputs, [group.id]: e.target.value })}
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(group.id)}
                                                                            placeholder="Adicionar item (ex: Feliz, Triste)..."
                                                                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                                    />
                                                                    <button 
                                                                            onClick={() => handleAddItem(group.id)}
                                                                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 rounded-xl transition-colors border border-zinc-800"
                                                                    >
                                                                            <Plus className="w-5 h-5" />
                                                                    </button>
                                                            </div>
                                                    </div>
                                            </div>
                                    ))
                            )}
                    </div>
                </div>
            )}

            {activeTab === 'genres' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left column: explanation and input */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 sticky top-8 space-y-4">
                            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">
                                Lista de Gêneros
                            </h3>
                            <p className="text-xs text-zinc-500">
                                Cadastre aqui os gêneros que você mais usa. Eles poderão ser utilizados depois como sugestões nos campos de gênero.
                            </p>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase">Novo gênero</label>
                                <input
                                    type="text"
                                    value={newGenre}
                                    onChange={(e) => setNewGenre(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddGenre()}
                                    placeholder="Ex: Rock, Jazz, Pop..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700"
                                />
                                <button
                                    onClick={handleAddGenre}
                                    disabled={!newGenre.trim()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 mt-1"
                                >
                                    <Plus className="w-5 h-5" /> Adicionar Gênero
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right column: list genres */}
                    <div className="lg:col-span-2">
                        {genres.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                                <FolderPlus className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">Nenhum gênero cadastrado ainda.</p>
                                <p className="text-sm mt-1">Use o formulário ao lado para adicionar seus gêneros favoritos.</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Gêneros Cadastrados</h3>
                                <div className="flex flex-wrap gap-2">
                                    {genres.map((genre) => (
                                        <div
                                            key={genre}
                                            className="group flex items-center gap-2 bg-zinc-800 text-zinc-200 pl-3 pr-1 py-1.5 rounded-lg border border-zinc-700 text-sm"
                                        >
                                            <span>{genre}</span>
                                            <button
                                                onClick={() => handleDeleteGenre(genre)}
                                                className="p-1 rounded-md hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                                                title="Remover gênero"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

      <ConfirmationModal 
        isOpen={!!groupToDelete}
        title="Excluir Grupo"
        message={`Tem certeza que deseja excluir o grupo "${groupToDelete?.name}"? Todas as tags associadas a este grupo deixarão de ser sugeridas.`}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
      />
    </div>
  );
};

export default GroupSettings;