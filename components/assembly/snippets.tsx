
import React, { useState, useCallback, useMemo, useContext, useRef } from 'react';
import type { EditorSettings, ISnippet, ICharacter, IChapter } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import type { SnippetSuggestion } from './AssemblyAIContext';
import { TrashIconOutline, SparklesIconOutline, SpinnerIcon, UserCircleIcon, XIcon, PlusIcon, PaperAirplaneIcon } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { useDebouncedCallback } from 'use-debounce';
import { AIError } from '../common/AIError';

interface SnippetsPanelProps {
    settings: EditorSettings;
}

const CharacterChip: React.FC<{ character: ICharacter, onRemove?: () => void }> = ({ character, onRemove }) => {
    return (
        <div className="flex items-center gap-1.5 bg-black/20 rounded-full pl-1 pr-1.5 py-0.5 text-xs">
            <div className="h-4 w-4 rounded-full bg-cover bg-center" style={{ backgroundImage: character.photo ? `url(${character.photo})` : undefined, backgroundColor: character.imageColor }}>
                {!character.photo && <UserCircleIcon className="h-full w-full opacity-50" />}
            </div>
            <span className="opacity-90">{character.name}</span>
            {onRemove && (
                 <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100"><XIcon className="h-3 w-3" /></button>
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
        <div className="p-4 rounded-lg flex flex-col gap-3 relative group" style={{ backgroundColor: settings.toolbarButtonBg }}>
            <button
                onClick={handleDelete}
                className="absolute top-2 right-2 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                style={{backgroundColor: settings.dangerColor}}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}
                title="Delete Snippet"
            >
                <TrashIconOutline />
            </button>
            
            <AutosizeTextarea
                value={content}
                onChange={handleContentChange}
                className="w-full bg-transparent border-none resize-none outline-none text-sm"
                style={{ color: settings.textColor }}
            />
            
            <div className="flex flex-wrap justify-between items-center gap-2 text-xs mt-2">
                <select 
                    value={snippet.type} 
                    onChange={handleTypeChange} 
                    className="bg-transparent border-0 rounded p-1 text-xs focus:ring-1 focus:ring-offset-0"
                    style={{
                        color: `${settings.textColor}B3`,
                        backgroundColor: settings.toolbarBg,
                        borderColor: settings.toolbarInputBorderColor,
                        '--tw-ring-color': settings.accentColor,
                        '--tw-ring-offset-color': settings.toolbarButtonBg
                    } as React.CSSProperties}
                >
                    {snippetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                
                <div className="flex flex-wrap gap-1 items-center">
                    {linkedCharacters.map(char => <CharacterChip key={char.id} character={char} onRemove={() => handleRemoveCharacter(char.id)} />)}
                    {unlinkedCharacters.length > 0 && (
                        <div className="relative" ref={dropdownRef}>
                             <button onClick={() => setIsCharacterDropdownOpen(p => !p)} className="h-5 w-5 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"><PlusIcon className="h-3 w-3" /></button>
                             {isCharacterDropdownOpen && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 max-h-48 overflow-y-auto p-1 rounded-md shadow-lg z-20" style={{backgroundColor: settings.dropdownBg}}>
                                    {unlinkedCharacters.map(char => (
                                        <button key={char.id} onClick={() => handleAddCharacter(char.id)} className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs">
                                             <div className="h-4 w-4 rounded-full bg-cover bg-center flex-shrink-0" style={{ backgroundImage: char.photo ? `url(${char.photo})` : undefined, backgroundColor: char.imageColor }} />
                                             <span className="truncate">{char.name}</span>
                                        </button>
                                    ))}
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t pt-3 mt-1" style={{borderColor: `${settings.toolbarInputBorderColor}80`}}>
                {isSuggesting ? (
                    <div className="flex items-center justify-center gap-2 text-sm opacity-80"><SpinnerIcon /> Finding best placement...</div>
                ) : suggestions ? (
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70">Placement Suggestions</h4>
                        {suggestions.map(s => {
                            const chapter = allChapters.find(c => c.id === s.chapterId);
                            if (!chapter) return null;
                            return (
                                <div key={s.chapterId} className="p-2 rounded" style={{backgroundColor: settings.toolbarBg}}>
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <p className="font-semibold text-sm">Ch {chapter.chapterNumber}: {chapter.title}</p>
                                            <p className="text-xs italic mt-1 opacity-80">"{s.justification}"</p>
                                        </div>
                                        <button 
                                            onClick={() => handleSendToChapter(s.chapterId)}
                                            className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                                            style={{backgroundColor: settings.accentColor, color: 'white'}}
                                        >
                                            <PaperAirplaneIcon className="h-3 w-3"/>
                                            Send
                                        </button>
                                    </div>
                                    <p className={`text-xs font-bold mt-1 ${confidenceColors[s.confidence]}`}>{s.confidence} Confidence</p>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <button 
                        onClick={handleSuggestPlacement}
                        className="w-full text-center py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2"
                        style={{backgroundColor: settings.toolbarBg}}
                    >
                        <SparklesIconOutline className="h-4 w-4" /> Suggest Placement
                    </button>
                )}
                {suggestionError && <AIError message={suggestionError} />}
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
        <div className="w-full h-full flex flex-col p-4 gap-4" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            <div className="flex-shrink-0 flex flex-col gap-2">
                <h2 className="text-xl font-bold">Snippet Dropbox</h2>
                <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setIsDraggingOver(false)}
                    className="p-4 border-2 border-dashed rounded-lg transition-colors"
                    style={{ 
                        borderColor: isDraggingOver ? settings.accentColor : settings.toolbarInputBorderColor,
                        backgroundColor: isDraggingOver ? `${settings.accentColor}20` : settings.toolbarBg
                    }}
                >
                    <textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder="Drop or paste text here. Snippets separated by a blank line will be processed individually."
                        className="w-full p-2 rounded border-0 resize-none bg-transparent"
                        style={{
                            color: settings.textColor,
                            '--tw-ring-color': settings.accentColor
                        } as React.CSSProperties}
                        rows={5}
                    />
                </div>
                 <button
                    onClick={handleProcess}
                    disabled={!rawText.trim() || isGeneratingSnippets}
                    className="self-end px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: settings.accentColor, color: '#FFFFFF' }}
                >
                    {isGeneratingSnippets ? <SpinnerIcon /> : <SparklesIconOutline className="h-4 w-4" />}
                    {isGeneratingSnippets ? 'Processing...' : 'Process Snippets with AI'}
                </button>
                {errorId === 'snippets' && <AIError message={errorMessage} onDismiss={() => onSetError(null)} className="text-center" />}
            </div>
            
            <div className="flex-shrink-0 flex justify-end items-center">
                 <label className="flex items-center cursor-pointer text-sm">
                    <input 
                        type="checkbox" 
                        checked={hideUsed} 
                        onChange={() => setHideUsed(p => !p)} 
                        className="mr-2 h-4 w-4 rounded"
                        style={{color: settings.accentColor}}
                    />
                    Hide Used Snippets
                </label>
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
                <div className="space-y-6">
                    {snippetTypes.map(type => {
                        const group = groupedSnippets[type];
                        if (!group || group.length === 0) return null;
                        return (
                            <div key={type}>
                                <h3 className="text-lg font-semibold mb-3 uppercase tracking-wider opacity-80">{type.replace('-', ' ')}</h3>
                                <div className="snippet-grid">
                                    {group.map(snippet => (
                                        <SnippetTile key={snippet.id} snippet={snippet} settings={settings} allCharacters={characters} allChapters={chapters} />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                     {filteredSnippets.length === 0 && (
                        <div className="text-center text-sm opacity-60 pt-10">
                            No snippets to display. Add some using the dropbox above!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
