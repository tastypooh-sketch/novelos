import React, { useState, useCallback, useMemo, useContext, useRef } from 'react';
import type { EditorSettings, ISnippet, ICharacter, IChapter } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import type { SnippetSuggestion } from './AssemblyAIContext';
import { TrashIconOutline, SparklesIconOutline, SpinnerIcon, UserCircleIcon, XIcon, PlusIcon, PaperAirplaneIcon, ClipboardIcon, ScissorsIconOutline } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { useDebouncedCallback } from 'use-debounce';
import { AIError } from '../common/AIError';
import { shadeColor } from '../../utils/colorUtils';

interface SnippetsPanelProps {
    settings: EditorSettings;
}

const CharacterChip: React.FC<{ character: ICharacter, settings: EditorSettings, onRemove?: () => void }> = ({ character, settings, onRemove }) => {
    return (
        <div className="flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-0.5 text-xs transition-colors" style={{ backgroundColor: `${settings.textColor}15` }}>
            <div className="h-4 w-4 rounded-full bg-cover bg-center border border-white/10" style={{ backgroundImage: character.photo ? `url(${character.photo})` : undefined, backgroundColor: character.imageColor }}>
                {!character.photo && <UserCircleIcon className="h-full w-full opacity-50" style={{ color: settings.textColor }} />}
            </div>
            <span className="font-medium" style={{ color: settings.textColor }}>{character.name}</span>
            {onRemove && (
                 <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100" style={{ color: settings.textColor }}><XIcon className="h-3 w-3" /></button>
            )}
        </div>
    );
};

const SnippetTile: React.FC<{
    snippet: ISnippet;
    settings: EditorSettings;
    allCharacters: ICharacter[];
    allChapters: IChapter[];
}> = ({ snippet, settings, allCharacters, allChapters }) => {
    const dispatch = useNovelDispatch();
    const { onSuggestPlacement } = useAssemblyAI();
    
    const [content, setContent] = useState(snippet.cleanedText);
    const [suggestions, setSuggestions] = useState<SnippetSuggestion[] | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [isCharacterDropdownOpen, setIsCharacterDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const debouncedUpdate = useDebouncedCallback((updates: Partial<ISnippet>) => {
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates } });
    }, 500);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        debouncedUpdate({ cleanedText: e.target.value });
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates: { type: e.target.value as ISnippet['type'] } } });
    };
    
    const handleDelete = () => {
        dispatch({ type: 'DELETE_SNIPPET', payload: snippet.id });
    };

    const handleSuggestPlacement = async () => {
        setIsSuggesting(true);
        setSuggestionError(null);
        const result = await onSuggestPlacement(snippet, allChapters);
        if (typeof result === 'string') {
            setSuggestionError(result);
        } else {
            setSuggestions(result);
        }
        setIsSuggesting(false);
    };

    const handleSendToChapter = (chapterId: string) => {
        const targetChapter = allChapters.find(c => c.id === chapterId);
        if (!targetChapter) return;

        const updatedLinkedIds = [...(targetChapter.linkedSnippetIds || []), snippet.id];
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapterId, updates: { linkedSnippetIds: updatedLinkedIds } } });
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates: { isUsed: true } } });
    };
    
    const handleRemoveCharacter = (charId: string) => {
        const newCharIds = snippet.characterIds.filter(id => id !== charId);
        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates: { characterIds: newCharIds } } });
    };

    const handleAddCharacter = (charId: string) => {
        if (!snippet.characterIds.includes(charId)) {
            const newCharIds = [...snippet.characterIds, charId];
            dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippet.id, updates: { characterIds: newCharIds } } });
        }
        setIsCharacterDropdownOpen(false);
    };

    const linkedCharacters = useMemo(() => 
        snippet.characterIds.map(id => allCharacters.find(c => c.id === id)).filter((c): c is ICharacter => !!c),
        [snippet.characterIds, allCharacters]
    );

    const unlinkedCharacters = useMemo(() => 
        allCharacters.filter(c => !snippet.characterIds.includes(c.id)),
        [snippet.characterIds, allCharacters]
    );

    const snippetTypes: ISnippet['type'][] = ['Dialogue', 'Narrative Description', 'Internal Monologue', 'Theme Statement', 'General Action', 'World-Building Note', 'Uncategorized'];
    const confidenceColors = { High: 'text-green-400', Medium: 'text-yellow-400', Low: 'text-orange-400' };

    return (
        <div className="p-5 rounded-xl flex flex-col gap-3 relative group border transition-all duration-200" style={{ backgroundColor: settings.toolbarButtonBg, borderColor: settings.toolbarInputBorderColor }}>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button
                    onClick={() => navigator.clipboard.writeText(content)}
                    className="p-1.5 rounded-lg text-white hover:opacity-90"
                    style={{backgroundColor: settings.accentColor}}
                    title="Copy Text"
                >
                    <ClipboardIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg text-white hover:opacity-90"
                    style={{backgroundColor: settings.dangerColor}}
                    title="Delete Snippet"
                >
                    <TrashIconOutline className="h-4 w-4" />
                </button>
            </div>
            
            <AutosizeTextarea
                value={content}
                onChange={handleContentChange}
                className="w-full bg-transparent border-none resize-none outline-none text-sm font-medium leading-relaxed"
                style={{ color: settings.textColor }}
                placeholder="Empty snippet..."
            />
            
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs mt-auto pt-2">
                <select 
                    value={snippet.type} 
                    onChange={handleTypeChange} 
                    className="bg-transparent border-0 rounded-md p-1 text-xs font-bold uppercase tracking-wider focus:ring-1 focus:ring-offset-0"
                    style={{
                        color: `${settings.textColor}99`,
                        backgroundColor: `${settings.backgroundColor}40`,
                        borderColor: settings.toolbarInputBorderColor,
                        '--tw-ring-color': settings.accentColor,
                        '--tw-ring-offset-color': settings.toolbarButtonBg
                    } as React.CSSProperties}
                >
                    {snippetTypes.map(t => <option key={t} value={t} className="bg-gray-800 text-white">{t}</option>)}
                </select>
                
                <div className="flex flex-wrap gap-1 items-center">
                    {linkedCharacters.map(char => <CharacterChip key={char.id} character={char} settings={settings} onRemove={() => handleRemoveCharacter(char.id)} />)}
                    {unlinkedCharacters.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                             <button onClick={() => setIsCharacterDropdownOpen(p => !p)} className="h-5 w-5 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors" style={{ color: settings.textColor }}><PlusIcon className="h-3 w-3" /></button>
                             {isCharacterDropdownOpen && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 max-h-48 overflow-y-auto p-1 rounded-md shadow-lg z-20" style={{backgroundColor: settings.dropdownBg, color: settings.toolbarText }}>
                                    {unlinkedCharacters.map(char => (
                                        <button key={char.id} onClick={() => handleAddCharacter(char.id)} className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs">
                                             <div className="h-4 w-4 rounded-full bg-cover bg-center flex-shrink-0" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: char.imageColor }} />
                                             <span className="truncate" style={{ color: settings.toolbarText }}>{char.name}</span>
                                        </button>
                                    ))}
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t pt-4 mt-2" style={{borderColor: `${settings.textColor}15`}}>
                {isSuggesting ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium" style={{ color: `${settings.textColor}99` }}><SpinnerIcon className="h-3 w-3" /> Analyzing...</div>
                ) : suggestions && Array.isArray(suggestions) ? (
                    <div className="space-y-2">
                        {suggestions.map(s => {
                            const chapter = allChapters.find(c => c.id === s.chapterId);
                            if (!chapter) return null;
                            return (
                                <div key={s.chapterId} className="p-2 rounded-lg group/sug" style={{backgroundColor: `${settings.backgroundColor}40`}}>
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <p className="font-bold text-[10px] uppercase tracking-tighter opacity-50" style={{ color: settings.textColor }}>Suggesting: Ch {chapter.chapterNumber}</p>
                                            <p className="text-[11px] italic leading-tight" style={{ color: `${settings.textColor}B3` }}>"{s.justification}"</p>
                                        </div>
                                        <button 
                                            onClick={() => handleSendToChapter(s.chapterId)}
                                            className="px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 flex-shrink-0 text-white shadow-sm transition-transform active:scale-95"
                                            style={{backgroundColor: settings.accentColor}}
                                        >
                                            <PaperAirplaneIcon className="h-2.5 w-2.5"/>
                                            SEND
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <button 
                        onClick={handleSuggestPlacement}
                        className="w-full text-center py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                        style={{backgroundColor: `${settings.backgroundColor}40`, color: `${settings.textColor}80` }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = `${settings.backgroundColor}80`}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = `${settings.backgroundColor}40`}
                    >
                        <SparklesIconOutline className="h-3 w-3" /> Auto-Place
                    </button>
                )}
                {suggestionError && <div className="mt-2"><AIError message={suggestionError} /></div>}
            </div>
        </div>
    );
};


export const SnippetsPanel: React.FC<SnippetsPanelProps> = ({ settings }) => {
    const { snippets, characters, chapters } = useNovelState();
    const { onAnalyzeSnippets, isGeneratingSnippets, errorMessage, errorId, onSetError } = useAssemblyAI();
    const [rawText, setRawText] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [hideUsed, setHideUsed] = useState(false);

    const handleProcess = useCallback(async () => {
        if (!rawText.trim() || isGeneratingSnippets) return;
        const success = await onAnalyzeSnippets(rawText, characters);
        if (success) {
            setRawText('');
        }
    }, [rawText, isGeneratingSnippets, characters, onAnalyzeSnippets]);
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            setRawText(prev => prev ? `${prev}\n\n${text}` : text);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
        e.dataTransfer.dropEffect = 'copy';
    };
    
    const filteredSnippets = useMemo(() => {
        return hideUsed ? snippets.filter(s => !s.isUsed) : snippets;
    }, [snippets, hideUsed]);

    const groupedSnippets = useMemo(() => {
        const groups: { [key in ISnippet['type']]?: ISnippet[] } = {};
        for (const snippet of filteredSnippets) {
            if (!groups[snippet.type]) {
                groups[snippet.type] = [];
            }
            groups[snippet.type]!.push(snippet);
        }
        return groups;
    }, [filteredSnippets]);

    const snippetTypes: ISnippet['type'][] = ['Dialogue', 'Narrative Description', 'Internal Monologue', 'Theme Statement', 'General Action', 'World-Building Note', 'Uncategorized'];

    return (
        <div className="w-full h-full flex flex-col p-6 gap-6 overflow-hidden" style={{ color: settings.textColor }}>
            <div className="flex-shrink-0 flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: settings.textColor }}>
                            <ScissorsIconOutline className="h-8 w-8 text-yellow-400" /> Snippet Repository
                        </h2>
                        <p className="text-sm opacity-60 mt-1" style={{ color: settings.textColor }}>Collect loose ideas, dialogue, or world notes to place later using AI suggestions.</p>
                    </div>
                    <label className="flex items-center cursor-pointer text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity" style={{ color: settings.textColor }}>
                        <input 
                            type="checkbox" 
                            checked={hideUsed} 
                            onChange={() => setHideUsed(p => !p)} 
                            className="mr-2 h-4 w-4 rounded border-gray-600 bg-transparent focus:ring-0"
                            style={{ color: settings.accentColor }}
                        />
                        Hide Used
                    </label>
                </div>
                
                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setIsDraggingOver(false)}
                    className="relative group border rounded-2xl transition-all duration-300"
                    style={{ 
                        borderColor: isDraggingOver ? settings.accentColor : 'rgba(255,255,255,0.05)',
                        backgroundColor: isDraggingOver ? `${settings.accentColor}10` : `${settings.toolbarButtonBg}40`
                    }}
                >
                    <textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder="Drop or paste text here. The AI will split it into distinct snippets."
                        className="w-full p-5 rounded-xl border-0 resize-none bg-transparent leading-relaxed text-lg placeholder-opacity-30 focus:ring-0"
                        style={{ color: settings.textColor }}
                        rows={5}
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                        <button
                            onClick={handleProcess}
                            disabled={!rawText.trim() || isGeneratingSnippets}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                            style={{ backgroundColor: settings.accentColor }}
                        >
                            {isGeneratingSnippets ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                            {isGeneratingSnippets ? 'Sorting...' : 'Process Snippets'}
                        </button>
                    </div>
                </div>
                {errorId === 'snippets' && <div className="max-w-md mx-auto"><AIError message={errorMessage} onDismiss={() => onSetError(null)} /></div>}
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto scroll-smooth pr-2 -mr-2">
                <div className="space-y-10 pb-10">
                    {snippetTypes.map(type => {
                        const group = groupedSnippets[type];
                        if (!group || group.length === 0) return null;
                        return (
                            <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <h3 className="text-xs font-bold mb-4 uppercase tracking-[0.2em] opacity-40 flex items-center gap-4" style={{ color: settings.textColor }}>
                                    <span>{type.replace('-', ' ')}</span>
                                    <div className="flex-grow h-px bg-current opacity-10"></div>
                                    <span className="opacity-50">{group.length}</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {group.map(snippet => (
                                        <SnippetTile key={snippet.id} snippet={snippet} settings={settings} allCharacters={characters} allChapters={chapters} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                     {filteredSnippets.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center opacity-30 py-20" style={{ color: settings.textColor }}>
                            <PlusIcon className="h-12 w-12 mb-4" />
                            <p className="text-xl italic">Your repository is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};