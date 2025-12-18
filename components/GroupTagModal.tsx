import React, { useState, useEffect } from 'react';
import { TagGroup, NaviSong } from '../types';
import { X, Save, Eye, CheckSquare, Square, Tags } from 'lucide-react';

interface GroupTagModalProps {
  song: NaviSong;
  groups: TagGroup[];
  onClose: () => void;
  onUpdateComments: (newComments: string) => void;
}

const GroupTagModal: React.FC<GroupTagModalProps> = ({ song, groups, onClose, onUpdateComments }) => {
  // Local state for preview
  const [localComments, setLocalComments] = useState(song.comment || '');

  // Helper to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Check if an item is currently present in the string
  const isItemSelected = (group: TagGroup, item: string) => {
    const groupNameEscaped = escapeRegExp(group.name);
    const regex = new RegExp(`(${groupNameEscaped}\\()(.*?)(\\))`);
    const match = localComments.match(regex);
    
    if (match) {
        const content = match[2];
        const target = `${group.prefix}=${item}`;
        // Split by comma and clean up to check exact matches
        const items = content.split(',').map(i => i.trim());
        return items.includes(target);
    }
    return false;
  };

  const toggleItem = (group: TagGroup, item: string) => {
    const groupNameEscaped = escapeRegExp(group.name);
    const regex = new RegExp(`(${groupNameEscaped}\\()(.*?)(\\))`);
    const match = localComments.match(regex);
    const itemStr = `${group.prefix}=${item}`;

    let newCommentStr = localComments;

    if (match) {
      // Group exists
      const fullMatch = match[0]; // e.g., Group(p=1, p=2)
      const content = match[2];   // e.g., p=1, p=2
      
      let currentItems = content.split(',').map(i => i.trim()).filter(i => i.length > 0);
      
      if (currentItems.includes(itemStr)) {
        // Remove item
        currentItems = currentItems.filter(i => i !== itemStr);
      } else {
        // Add item
        currentItems.push(itemStr);
      }

      if (currentItems.length === 0) {
        // If group is empty, remove the entire group tag + potential preceding space
        // Try to match " Group(...)" or just "Group(...)"
        const removeRegex = new RegExp(`\\s*${escapeRegExp(fullMatch)}`);
        newCommentStr = localComments.replace(removeRegex, '');
        // Fallback cleanup if it was at start without space
        if (newCommentStr === localComments) {
             newCommentStr = localComments.replace(fullMatch, '').trim();
        }
      } else {
        // Update group content
        const newGroupStr = `${match[1]}${currentItems.join(', ')}${match[3]}`;
        newCommentStr = localComments.replace(fullMatch, newGroupStr);
      }

    } else {
      // Group doesn't exist, create it with the item
      const newTag = `${group.name}(${itemStr})`;
      const separator = localComments.trim().length > 0 ? ' ' : '';
      newCommentStr = localComments + separator + newTag;
    }

    setLocalComments(newCommentStr);
  };

  const handleSave = () => {
    onUpdateComments(localComments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Tags className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                    <h3 className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Editor de Grupos</h3>
                    <h2 className="text-white font-bold text-xl truncate max-w-md">
                        {song.title}
                    </h2>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-400" />
            </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Left: Groups & Checkboxes */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50 custom-scrollbar">
                {groups.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-zinc-500">Nenhum grupo configurado.</p>
                        <p className="text-xs text-zinc-600 mt-2">Vá em Configurações na tela principal para criar grupos.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groups.map(group => (
                            <div key={group.id} className="space-y-3">
                                <div className="flex items-baseline gap-2 border-b border-zinc-800 pb-2">
                                    <h4 className="text-indigo-400 font-bold text-sm uppercase tracking-wider">{group.name}</h4>
                                    <span className="text-[10px] text-zinc-600 font-mono">prefixo: {group.prefix}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {group.items.map((item, idx) => {
                                        const isChecked = isItemSelected(group, item);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => toggleItem(group, item)}
                                                className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                                                    isChecked 
                                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200' 
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/80'
                                                }`}
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-zinc-600 group-hover:text-zinc-500 flex-shrink-0" />
                                                )}
                                                <span className="truncate" title={item}>{item}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Preview & Manual Edit */}
            <div className="w-full md:w-80 border-l border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    Prévia do Comentário
                </div>
                
                <div className="flex-1 relative">
                    <textarea 
                        value={localComments}
                        onChange={(e) => setLocalComments(e.target.value)}
                        className="w-full h-full min-h-[200px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none shadow-inner custom-scrollbar"
                        placeholder="Selecione os itens ao lado ou digite aqui..."
                    />
                </div>
                
                <div className="text-[10px] text-zinc-600">
                    * Você pode editar manualmente ou usar os checkboxes. As alterações são sincronizadas localmente.
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg font-medium text-sm transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                Aplicar Tags
            </button>
        </div>
      </div>
    </div>
  );
};

export default GroupTagModal;