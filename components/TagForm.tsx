import React, { useState } from 'react';
import { MusicMetadata, AISuggestion, TagGroup } from '../types';
import { GENRES } from '../constants';
import { Sparkles, Save, Loader2, Music2, User, Disc, Calendar, Hash, Tag, MessageSquare, ChevronDown } from 'lucide-react';
import { suggestMetadata } from '../services/geminiService';

interface TagFormProps {
  metadata: MusicMetadata;
  fileName: string;
  onChange: (field: keyof MusicMetadata, value: string) => void;
  onSave: () => void;
  groups: TagGroup[]; // New prop
}

const TagForm: React.FC<TagFormProps> = ({ metadata, fileName, onChange, onSave, groups }) => {
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleAutoFill = async () => {
    setIsSuggesting(true);
    try {
      const suggestion = await suggestMetadata(fileName, metadata.artist);
      if (suggestion) {
        if (suggestion.title) onChange('title', suggestion.title);
        if (suggestion.artist) onChange('artist', suggestion.artist);
        if (suggestion.album) onChange('album', suggestion.album);
        if (suggestion.year) onChange('year', suggestion.year);
        if (suggestion.genre) onChange('genre', suggestion.genre);
      } else {
          alert("Não foi possível identificar metadados automaticamente.");
      }
    } catch (e) {
        console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGroupSelection = (group: TagGroup, item: string) => {
    const currentComments = metadata.comments || '';
    
    // Helper to escape regex special characters
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const groupNameEscaped = escapeRegExp(group.name);

    // Regex to find: GroupName( ... )
    // Group 1: Start "GroupName("
    // Group 2: Content inside
    // Group 3: End ")"
    const regex = new RegExp(`(${groupNameEscaped}\\()(.*?)(\\))`);
    
    const match = currentComments.match(regex);
    const newItemString = `${group.prefix}=${item}`;

    if (match) {
      // Group tag exists
      const existingContent = match[2];
      
      // Split by comma to check existing items
      // We are looking for full "prefix=item" strings now
      const existingItems = existingContent.split(',').map(i => i.trim());
      
      if (!existingItems.includes(newItemString)) {
        // Append
        const newContent = existingContent.trim().length === 0 
            ? newItemString 
            : `${existingContent}, ${newItemString}`;
            
        const newTag = `${match[1]}${newContent}${match[3]}`;
        onChange('comments', currentComments.replace(regex, newTag));
      }
    } else {
      // Group tag doesn't exist, create new
      const newTag = `${group.name}(${newItemString})`;
      const separator = currentComments.trim().length > 0 ? ' ' : '';
      onChange('comments', currentComments + separator + newTag);
    }
  };

  const InputField = ({ 
    icon: Icon, 
    label, 
    value, 
    field, 
    type = "text",
    list
  }: { 
    icon: any, 
    label: string, 
    value: string, 
    field: keyof MusicMetadata, 
    type?: string,
    list?: string
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          list={list}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600"
          placeholder={`Digite ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Editar Detalhes</h2>
        <button
          onClick={handleAutoFill}
          disabled={isSuggesting}
          className="text-xs flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
        >
          {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Auto-Preencher
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <InputField icon={Music2} label="Título" value={metadata.title} field="title" />
        <InputField icon={User} label="Artista" value={metadata.artist} field="artist" />
        <InputField icon={Disc} label="Álbum" value={metadata.album} field="album" />
        
        <div className="grid grid-cols-2 gap-4">
            <InputField icon={Calendar} label="Ano" value={metadata.year} field="year" type="number" />
            <InputField icon={Hash} label="Nº Faixa" value={metadata.trackNumber} field="trackNumber" type="number" />
        </div>

        <div className="space-y-1.5">
           <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Gênero
          </label>
          <select 
            value={metadata.genre}
            onChange={(e) => onChange('genre', e.target.value)}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Selecione um gênero...</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Comments Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Comentários
          </label>
          <textarea
            value={metadata.comments || ''}
            onChange={(e) => onChange('comments', e.target.value)}
            rows={3}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-zinc-600 resize-none font-mono text-sm"
            placeholder="Comentários ou tags personalizadas..."
          />
        </div>

        {/* Group Quick Selectors */}
        {groups.length > 0 && (
            <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3" />
                    Gerador Rápido de Tags
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groups.map(group => (
                        <div key={group.id} className="space-y-1">
                            <label className="text-[10px] text-zinc-500 font-semibold uppercase">{group.name}</label>
                            <div className="relative">
                                <select
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            handleGroupSelection(group, e.target.value);
                                            e.target.value = ""; // Reset select
                                        }
                                    }}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer hover:bg-zinc-700/50 transition-colors"
                                >
                                    <option value="">Adicionar {group.name}...</option>
                                    {group.items.map((item, idx) => (
                                        <option key={idx} value={item}>{item}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 py-3 rounded-lg font-bold hover:bg-white transition-colors transform active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          Salvar e Baixar MP3
        </button>
      </div>
    </div>
  );
};

export default TagForm;