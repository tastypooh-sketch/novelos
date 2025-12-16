import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { IChapter, EditorSettings } from '../../types';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon, RefreshIcon, SpinnerIcon, XIcon } from '../common/Icons';

export interface SearchResult {
    id: string;
    chapterId: string;
    chapterTitle: string;
    index: number;
    length: number;
    context: string;
    matchText: string;
}

interface FindReplacePanelProps {
    settings: EditorSettings;
    chapters: IChapter[];
    activeChapterId: string;
    onNavigate: (result: SearchResult) => void;
    onReplace: (result: SearchResult, newText: string) => void;
    onReplaceAll: (searchText: string, replaceText: string, scope: 'chapter' | 'manuscript') => void;
    onClose: () => void;
}

const getContext = (text: string, index: number, length: number) => {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + length + 20);
    return (start > 0 ? '...' : '') + text.substring(start, end).replace(/\n/g, ' ') + (end < text.length ? '...' : '');
};

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({ 
    settings, chapters, activeChapterId, onNavigate, onReplace, onReplaceAll, onClose 
}) => {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [scope, setScope] = useState<'chapter' | 'manuscript'>('chapter');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const performSearch = useCallback(() => {
        if (!findText) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        // Small timeout to allow UI to show loading state
        setTimeout(() => {
            const newResults: SearchResult[] = [];
            const targetChapters = scope === 'chapter' 
                ? chapters.filter(c => c.id === activeChapterId)
                : chapters; // Preserve order

            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = caseSensitive ? 'g' : 'gi';
            const pattern = wholeWord ? `\\b${escapeRegExp(findText)}\\b` : escapeRegExp(findText);
            
            try {
                const regex = new RegExp(pattern, flags);

                targetChapters.forEach(chapter => {
                    // Create a temp div to extract pure text content for searching
                    // This matches the logic used in Manuscript.tsx for highlighting
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = chapter.content;
                    const textContent = tempDiv.innerText || '';

                    let match;
                    while ((match = regex.exec(textContent)) !== null) {
                        newResults.push({
                            id: `${chapter.id}-${match.index}`,
                            chapterId: chapter.id,
                            chapterTitle: `${chapter.chapterNumber}. ${chapter.title}`,
                            index: match.index,
                            length: match[0].length,
                            matchText: match[0],
                            context: getContext(textContent, match.index, match[0].length)
                        });
                    }
                });
                setResults(newResults);
            } catch (e) {
                console.error("Search error", e);
            } finally {
                setIsSearching(false);
            }
        }, 10);
    }, [findText, scope, caseSensitive, wholeWord, chapters, activeChapterId]);

    const debouncedSearch = useDebouncedCallback(performSearch, 500);

    useEffect(() => {
        debouncedSearch();
    }, [findText, scope, caseSensitive, wholeWord, activeChapterId]); // Re-run if active chapter changes and scope is 'chapter'

    const handleResultClick = (result: SearchResult, index: number) => {
        setSelectedIndex(index);
        onNavigate(result);
    };

    const handleReplaceCurrent = () => {
        if (selectedIndex !== null && results[selectedIndex]) {
            onReplace(results[selectedIndex], replaceText);
            // Optimistic update: remove from list
            const newResults = [...results];
            newResults.splice(selectedIndex, 1);
            setResults(newResults);
            if (newResults.length > 0) {
                const nextIndex = Math.min(selectedIndex, newResults.length - 1);
                setSelectedIndex(nextIndex);
                onNavigate(newResults[nextIndex]);
            } else {
                setSelectedIndex(null);
            }
        }
    };

    const handleReplaceAllClick = () => {
        if (!findText || !replaceText) return;
        if (window.confirm(`Replace all occurrences of "${findText}" with "${replaceText}" in ${scope === 'chapter' ? 'current chapter' : 'entire manuscript'}?`)) {
            onReplaceAll(findText, replaceText, scope);
            // Refresh search after short delay
            setTimeout(performSearch, 100);
        }
    };

    return (
        <div className="flex flex-col h-full bg-opacity-95" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText }}>
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: settings.toolbarInputBorderColor }}>
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <SearchIcon className="h-4 w-4" /> Find & Replace
                </h3>
                <button onClick={onClose} className="p-1 rounded hover:bg-white/10"><XIcon /></button>
            </div>

            <div className="p-4 space-y-4 flex-shrink-0 border-b" style={{ borderColor: settings.toolbarInputBorderColor }}>
                <input
                    type="text"
                    placeholder="Find"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="w-full p-2 rounded border text-sm"
                    style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                    autoFocus
                />
                <input
                    type="text"
                    placeholder="Replace"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="w-full p-2 rounded border text-sm"
                    style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                />
                
                <div className="flex gap-2 text-xs">
                    <button 
                        onClick={() => setScope('chapter')} 
                        className={`px-2 py-1 rounded border flex-1 ${scope === 'chapter' ? 'font-bold' : 'opacity-60'}`}
                        style={{ backgroundColor: scope === 'chapter' ? settings.accentColor : 'transparent', borderColor: settings.toolbarInputBorderColor, color: scope === 'chapter' ? '#FFF' : settings.textColor }}
                    >
                        Chapter
                    </button>
                    <button 
                        onClick={() => setScope('manuscript')} 
                        className={`px-2 py-1 rounded border flex-1 ${scope === 'manuscript' ? 'font-bold' : 'opacity-60'}`}
                        style={{ backgroundColor: scope === 'manuscript' ? settings.accentColor : 'transparent', borderColor: settings.toolbarInputBorderColor, color: scope === 'manuscript' ? '#FFF' : settings.textColor }}
                    >
                        Manuscript
                    </button>
                </div>

                <div className="flex justify-between items-center text-xs opacity-80">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} /> Aa
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} /> [Abc]
                    </label>
                </div>

                <div className="flex gap-2 pt-2">
                    <button 
                        onClick={handleReplaceCurrent}
                        disabled={selectedIndex === null} 
                        className="flex-1 py-1.5 rounded text-xs border disabled:opacity-50"
                        style={{ borderColor: settings.toolbarInputBorderColor }}
                    >
                        Replace
                    </button>
                    <button 
                        onClick={handleReplaceAllClick}
                        disabled={!results.length} 
                        className="flex-1 py-1.5 rounded text-xs border disabled:opacity-50"
                        style={{ borderColor: settings.accentColor, color: settings.accentColor }}
                    >
                        Replace All
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2">
                {isSearching ? (
                    <div className="flex items-center justify-center h-20 opacity-60">
                        <SpinnerIcon className="h-5 w-5 mr-2" /> Searching...
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="px-2 pb-2 text-xs opacity-50">{results.length} matches found</div>
                        {results.map((result, i) => (
                            <div 
                                key={result.id}
                                onClick={() => handleResultClick(result, i)}
                                className={`p-3 rounded cursor-pointer text-sm border transition-colors ${selectedIndex === i ? 'ring-1' : ''}`}
                                style={{ 
                                    backgroundColor: selectedIndex === i ? settings.toolbarButtonBg : 'transparent',
                                    borderColor: selectedIndex === i ? settings.accentColor : 'transparent'
                                }}
                            >
                                <div className="text-[10px] opacity-50 mb-1">{result.chapterTitle}</div>
                                <div className="line-clamp-2">
                                    {result.context.split(result.matchText).map((part, idx, arr) => (
                                        <React.Fragment key={idx}>
                                            {part}
                                            {idx < arr.length - 1 && (
                                                <span style={{ backgroundColor: `${settings.accentColor}40`, color: settings.textColor, fontWeight: 'bold' }}>
                                                    {result.matchText}
                                                </span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {results.length === 0 && findText && !isSearching && (
                            <div className="text-center p-4 opacity-50 text-xs">No matches found.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};