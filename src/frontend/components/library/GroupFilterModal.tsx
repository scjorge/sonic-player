import React, { useState } from 'react';
import { TagGroup } from '../../../../types';
import { X, Save, Filter, CheckSquare, Square } from 'lucide-react';

interface GroupFilterModalProps {
  groups: TagGroup[];
  initialSelection?: string[];
  onClose: () => void;
  onApply: (selectedComments: string[]) => void;
}

const GroupFilterModal: React.FC<GroupFilterModalProps> = ({ groups, initialSelection = [], onClose, onApply }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));

  const toggleItem = (group: TagGroup, item: string) => {
    const key = `${group.prefix}=${item}`;
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const handleApply = () => {
    onApply(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Filter className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Filtro por Grupos</h3>
              <h2 className="text-white font-bold text-lg truncate max-w-md">
                Selecione os grupos para filtrar a biblioteca
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50 custom-scrollbar">
            {groups.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-zinc-500">Nenhum grupo configurado.</p>
                <p className="text-xs text-zinc-600 mt-2">Vá em Configurações &gt; Grupos na tela principal para criar grupos.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map(group => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-baseline gap-2 border-b border-zinc-800 pb-2">
                      <h4 className="text-indigo-400 font-bold text-sm uppercase tracking-wider">{group.name}</h4>
                      <span className="text-[13px] text-zinc-600 font-mono">prefixo: {group.prefix}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {group.items.map((item, idx) => {
                        const key = `${group.prefix}=${item}`;
                        const isChecked = selected.has(key);
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
            onClick={() => {
              setSelected(new Set());
              onApply([]);
              onClose();
            }}
            className="px-6 py-2.5 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-sm transition-colors"
          >
            Limpar filtro
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Aplicar Filtro
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupFilterModal;
