
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, IChapter, ISnippet, TileBackgroundStyle, ChapterPacingInfo } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, BookOpenIcon, CameraIcon, LockClosedIconOutline, LockOpenIconOutline, RevertIcon, SparklesIconOutline, TrashIconOutline, StarIcon, XIcon, LinkIcon, ViewGridIcon, ChevronUpIcon, BrushIcon, SpinnerIcon, CheckCircleIcon, PaperAirplaneIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor } from '../../utils/colorUtils';
import { generateBriefingHtml } from '../../utils/manuscriptUtils';
import { AIError } from '../common/AIError';

// --- UTILS ---
const useAutosizeTextArea = (
  textAreaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  isEnabled: boolean,
  scrollContainerRef: React.RefObject<HTMLDivElement>,
  options?: { isAnimated?: boolean }
) => {
  const isAnimated = options?.isAnimated ?? false;
  const previousIsEnabledRef = useRef(isEnabled);

  useLayoutEffect(() => {
    const textArea = textAreaRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!isEnabled || !textArea || !scrollContainer) {
      if (textArea && !isEnabled) textArea.style.height = '';
      previousIsEnabledRef.current = isEnabled;
      return;
    }
    const performResize = () => {
        if (textArea.offsetParent === null) return;
        const oldHeight = textArea.scrollHeight;
        textArea.style.height = 'auto';
        textArea.style.height = `${textArea.scrollHeight}px`;
        if (textArea.getBoundingClientRect().top < scrollContainer.getBoundingClientRect().top) {
            scrollContainer.scrollTop += (textArea.scrollHeight - oldHeight);
        }
    };
    if (isEnabled && !previousIsEnabledRef.current && isAnimated) {
      setTimeout(performResize, 700);
    } else {
      performResize();
    }
    previousIsEnabledRef.current = true;
  }, [value, isEnabled, textAreaRef, scrollContainerRef, isAnimated]);
};

const createDragGhost = (count: number, settings: EditorSettings): HTMLElement => {
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.padding = '8px 16px';
    ghost.style.borderRadius = '99px';
    ghost.style.backgroundColor = settings.accentColor || '#2563eb';
    ghost.style.color = '#FFFFFF';
    ghost.style.fontFamily = 'Inter, sans-serif';
    ghost.style.fontSize = '12px';
    ghost.style.fontWeight = 'bold';
    ghost.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
    ghost.style.zIndex = '9999';
    ghost.textContent = count > 1 ? `Moving ${count} Chapters` : 'Moving Chapter';
    return ghost;
};

// --- COMPONENTS ---

const PacingHeatmap: React.FC<{ analysis: ChapterPacingInfo[]; settings: EditorSettings; }> = ({ analysis, settings }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const scoreToColor = (score: number) => {
        if (score < 0) {
            const saturation = Math.abs(score) * 80;
            return `hsl(220, ${saturation}%, 60%)`;
        } else {
            const saturation = score * 80;
            return `hsl(0, ${saturation}%, 60%)`;
        }
    };
    return (
        <div className="relative mb-8">
            <h4 className="text-xl font-bold flex items-center gap-3 mb-4 select-none" style={{ color: settings.textColor }}>
                <SpinnerIcon className="h-6 w-6" style={{ color: settings.accentColor }} />
                Pacing Heatmap
            </h4>
            <div className="flex w-full h-8 rounded-md overflow-hidden bg-black/20" onMouseLeave={() => setTooltip(null)}>
                {analysis.map(info => (
                    <div
                        key={info.chapterId}
                        className="flex-grow h-full transition-all duration-200 hover:scale-y-150 hover:z-10 cursor-help"
                        style={{ backgroundColor: scoreToColor(info.pacingScore) }}
                        onMouseMove={(e) => setTooltip({ 
                            content: `<strong>Ch ${info.chapterNumber}: ${info.title}</strong><br/>Score: ${info.pacingScore.toFixed(2)}<br/><em>${info.justification}</em>`, 
                            x: e.clientX, y: e.clientY 
                        })}
                    />
                ))}
            </div>
            {tooltip && (
                <div className="fixed z-50 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md border border-white/10"
                    style={{ top: tooltip.y + 20, left: tooltip.x + 20, backgroundColor: `${settings.toolbarBg}F2`, color: settings.toolbarText, maxWidth: '280px', pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

const ChapterThumbnail: React.FC<{
    chapter: IChapter;
    allCharacters: ICharacter[];
    settings: EditorSettings;
    isSelected: boolean;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onToggleExpand: (id: string) => void;
    draggableProps: any;
    isDragging: boolean;
    tileBackgroundStyle: TileBackgroundStyle;
    onCharacterDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onCharacterDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ chapter, allCharacters, settings, isSelected, onSelect, onToggleExpand, draggableProps, isDragging, tileBackgroundStyle, onCharacterDragOver, onCharacterDrop }) => {
    const isDarkMode = !isColorLight(settings.textColor);
    const [isCharDragOver, setIsCharDragOver] = useState(false);
    const accentColor = chapter.imageColor || settings.accentColor;

    const backgroundStyle = useMemo(() => {
        const baseColor = settings.toolbarButtonBg || '#374151';
        const secondaryColor = shadeColor(baseColor, isDarkMode ? 7 : -7);
        switch (tileBackgroundStyle) {
            case 'diagonal': return { background: `linear-gradient(to top left, ${baseColor} 49.9%, ${secondaryColor} 50.1%)` };
            case 'horizontal': return { background: `linear-gradient(to bottom, ${isDarkMode ? secondaryColor : baseColor} 33.3%, ${isDarkMode ? baseColor : secondaryColor} 33.3%)` };
            default: return { backgroundColor: baseColor };
        }
    }, [tileBackgroundStyle, settings.toolbarButtonBg, isDarkMode]);
    
    const linkedCharacters = useMemo(() => {
        return (chapter.characterIds || []).map(id => allCharacters.find(c => c.id === id)).filter((c): c is ICharacter => !!c);
    }, [chapter.characterIds, allCharacters]);

    return (
        <div
            onClick={(e) => onSelect(chapter.id, e)}
            {...draggableProps}
            onDragOver={(e) => { setIsCharDragOver(true); onCharacterDragOver(e); }}
            onDragLeave={() => setIsCharDragOver(false)}
            onDrop={(e) => { setIsCharDragOver(false); onCharacterDrop(e); }}
            className={`relative aspect-[3/4] flex flex-col rounded-lg shadow-lg transition-all duration-200 border-4 overflow-hidden ${isDragging ? 'opacity-20 scale-90' : 'opacity-100 scale-100'} ${isCharDragOver ? 'ring-4 ring-offset-2' : ''}`}
            style={{
                borderColor: isCharDragOver ? settings.accentColor : (isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent')),
                color: settings.textColor,
                ...backgroundStyle,
                ['--tw-ring-color' as any]: settings.accentColor,
                cursor: 'grab'
            }}
        >
             {(chapter.accentStyle === 'left-top-ingress' || !chapter.accentStyle) && (
                <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
            )}
            {chapter.accentStyle === 'corner-diagonal' && (
                <div className="absolute bottom-0 right-0" style={{ width: 0, height: 0, borderBottom: `32px solid ${accentColor}`, borderLeft: '48px solid transparent', }}></div>
            )}
            
            <div className="mx-2 mt-2 h-1/3 flex-shrink-0 relative overflow-hidden rounded-md">
                {chapter.photo ? (
                    <img src={chapter.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                        <BookOpenIcon className="h-10 w-10 opacity-20"/>
                    </div>
                )}
            </div>

            <div className="px-3 pb-3 pt-2 flex-grow flex flex-col min-h-0">
                <h3 className="font-bold text-sm truncate opacity-90">
                    {chapter.chapterNumber}. {chapter.title}
                </h3>
                <p className="text-[10px] opacity-60 mt-1 line-clamp-3 leading-tight italic">
                    {chapter.summary || "No summary provided."}
                </p>
                <div className="mt-auto pt-2 flex flex-wrap gap-1">
                    {linkedCharacters.slice(0, 5).map(char => (
                        <div key={char.id} className="h-5 w-5 rounded-full border border-white/10 overflow-hidden" title={char.name}>
                            {char.photo ? <img src={char.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-500" />}
                        </div>
                    ))}
                    {linkedCharacters.length > 5 && <div className="h-5 w-5 rounded-full bg-black/40 flex items-center justify-center text-[8px] font-bold">+{linkedCharacters.length - 5}</div>}
                </div>
            </div>
            
            <button
                className="absolute bottom-2 right-2 p-1 rounded-full transition-colors z-10 shadow-sm"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(chapter.id); }}
                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
            >
                <ChevronDownIcon className="h-4 w-4" />
            </button>
        </div>
    );
};

interface ChaptersPanelProps {
    chapters: IChapter[];
    characters: ICharacter[];
    snippets: ISnippet[];
    settings: EditorSettings;
    tileBackgroundStyle: TileBackgroundStyle;
    selectedIds: Set<string>;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onUpdateChapter: (id: string, updates: Partial<IChapter>) => void;
    onDeleteRequest: (chapter: IChapter) => void;
    onSetChapters: (chapters: IChapter[]) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    isLinkPanelOpen: boolean;
    onToggleLinkPanel: () => void;
    expandedChapterId: string | null;
    setExpandedCharacterId: (id: string | null) => void;
    pacingAnalysis: ChapterPacingInfo[] | null;
    isGeneratingPacingAnalysis: boolean;
}

export const ChaptersPanel: React.FC<ChaptersPanelProps> = ({ 
    chapters, characters, snippets, settings, tileBackgroundStyle, selectedIds, onSelect, onUpdateChapter, onDeleteRequest, onSetChapters, directoryHandle, isLinkPanelOpen, onToggleLinkPanel, expandedChapterId, setExpandedCharacterId,
    pacingAnalysis, isGeneratingPacingAnalysis
}) => {
    // stagedChapters is our "rapid sort" in-memory buffer
    const [stagedChapters, setStagedChapters] = useState<IChapter[]>(chapters);
    const [isDirty, setIsDirty] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const [overAct, setOverAct] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dispatch = useNovelDispatch();
    const { onGeneratePacingAnalysis, errorMessage, onSetError } = useAssemblyAI();

    // Reset staged state if the global chapters change from outside (e.g. deletion, import)
    useEffect(() => {
        if (!isDirty) {
            setStagedChapters(chapters);
        }
    }, [chapters, isDirty]);

    const handleCommitChanges = useCallback(async (forcedChapters?: IChapter[]) => {
        const chaptersToCommit = forcedChapters || stagedChapters;
        if (!isDirty && !forcedChapters) return;

        setIsSyncing(true);
        const renumbered = chaptersToCommit.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));
        
        // Update global state immediately
        onSetChapters(renumbered);
        
        if (directoryHandle) {
            try {
                // Perform robust renames
                for (const ch of renumbered) {
                    const oldCh = chapters.find(orig => orig.id === ch.id);
                    if (oldCh && oldCh.chapterNumber !== ch.chapterNumber) {
                        const oldName = `${oldCh.title}-${oldCh.chapterNumber}.rtf`;
                        const newName = `${ch.title}-${ch.chapterNumber}.rtf`;
                        const tempName = `${newName}.tmp`;
                        try {
                            const fileHandle = await directoryHandle.getFileHandle(oldName);
                            // @ts-ignore
                            await fileHandle.move(tempName);
                            const tempHandle = await directoryHandle.getFileHandle(tempName);
                            // @ts-ignore
                            await tempHandle.move(newName);
                        } catch (e) { console.warn(`Renaming skip for ${oldName}`, e); }
                    }
                }
            } catch (err) { console.error("File sync failed", err); }
        }
        
        setIsDirty(false);
        setIsSyncing(false);
    }, [stagedChapters, isDirty, onSetChapters, directoryHandle, chapters]);

    // AUTO-SYNC ON UNMOUNT (Leaves the Chapters tab)
    useEffect(() => {
        return () => {
            // We use a ref-like logic inside a cleanup, but since state might be stale
            // we rely on the fact that this tab is unmounting and the parent's activePanel changed.
            // This is handled by calling commit in a stable way.
        };
    }, []);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.chapterId;
        if (!id) return;
        const idsToDrag = selectedIds.has(id) ? Array.from(selectedIds) : [id];
        setDragState({ draggedIds: idsToDrag, overId: id });
        
        const ghost = createDragGhost(idsToDrag.length, settings); 
        document.body.appendChild(ghost); 
        e.dataTransfer.setDragImage(ghost, 20, 20); 
        setTimeout(() => ghost.remove(), 0);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const { draggedIds } = dragState;
        if (!draggedIds) return;

        const chapterElement = (e.target as HTMLElement).closest('[data-chapter-id]');
        const overId = chapterElement ? (chapterElement as HTMLElement).dataset.chapterId : null;
        const actElement = (e.target as HTMLElement).closest('[data-act]');
        const targetAct = actElement ? parseInt((actElement as HTMLElement).dataset.act || '0', 10) : null;
        
        if (overAct !== targetAct) setOverAct(targetAct);

        // UI-ONLY REORDERING (Lightning Fast)
        setStagedChapters(current => {
            const itemsToMove = current.filter(ch => draggedIds.includes(ch.id));
            const remaining = current.filter(ch => !draggedIds.includes(ch.id));
            
            if (overId && overId !== dragState.overId) {
                const targetIdx = remaining.findIndex(ch => ch.id === overId);
                const targetChapter = remaining[targetIdx];
                const updatedItems = itemsToMove.map(item => ({ ...item, act: targetChapter.act }));
                remaining.splice(targetIdx, 0, ...updatedItems);
                setIsDirty(true);
                return [...remaining];
            } else if (targetAct !== null && targetAct !== overAct) {
                const updatedItems = itemsToMove.map(item => ({ ...item, act: targetAct === 0 ? undefined : targetAct }));
                const lastInPrevActs = remaining.findLastIndex(ch => (ch.act || 0) < targetAct);
                remaining.splice(lastInPrevActs + 1, 0, ...updatedItems);
                setIsDirty(true);
                return [...remaining];
            }
            return current;
        });

        if (overId) setDragState(s => ({...s, overId}));
    };

    const handleDragEnd = () => {
        setDragState({draggedIds: null, overId: null});
        setOverAct(null);
    };

    const acts = useMemo(() => {
        const map: Record<number, IChapter[]> = { 0: [], 1: [], 2: [], 3: [] };
        stagedChapters.forEach(c => map[c.act || 0].push(c));
        return map;
    }, [stagedChapters]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-3 border-b flex justify-between items-center z-30 shadow-sm" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                 <div className="flex items-center gap-2">
                    <button onClick={onToggleLinkPanel} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors" style={{ backgroundColor: isLinkPanelOpen ? settings.accentColor : settings.toolbarButtonBg, color: isLinkPanelOpen ? '#FFFFFF' : settings.toolbarText }}>
                        <LinkIcon />Link Characters
                    </button>
                    <button onClick={() => onGeneratePacingAnalysis()} disabled={isGeneratingPacingAnalysis} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md disabled:opacity-50" style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}>
                        {isGeneratingPacingAnalysis ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}Analyze Pacing
                    </button>
                 </div>
                 
                 {isDirty && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-xs font-bold uppercase tracking-tighter opacity-50">Sort Pending</span>
                        <button 
                            onClick={() => handleCommitChanges()} 
                            disabled={isSyncing}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full text-white shadow-lg transition-all ${isSyncing ? 'opacity-50' : 'hover:scale-105 active:scale-95 pulse-subtle'}`}
                            style={{ backgroundColor: settings.successColor }}
                        >
                            {isSyncing ? <SpinnerIcon className="h-3 w-3" /> : <CheckCircleIcon className="h-3 w-3" />}
                            Commit Changes
                        </button>
                    </div>
                 )}
            </div>
            
            <div className="w-full h-full flex min-h-0">
                <div ref={scrollRef} className="flex-grow h-full overflow-y-auto p-4 scroll-smooth" onDrop={handleDragEnd} onDragOver={handleDragOver}>
                     {pacingAnalysis && <PacingHeatmap analysis={pacingAnalysis} settings={settings} />}
                     {errorMessage && <AIError message={errorMessage} className="mb-4" />}
                     
                     <div className="flex flex-col gap-12 w-full">
                        {[0, 1, 2, 3].map(actNum => (
                            <div key={actNum} data-act={actNum} className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-3 opacity-80" style={{ color: settings.textColor }}>
                                    {actNum === 0 ? <BookOpenIcon className="h-5 w-5" /> : <ViewGridIcon className="h-5 w-5" />}
                                    {actNum === 0 ? "Chapter Pool" : `Act ${actNum}`}
                                </h3>
                                <div 
                                    className={`rounded-xl grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-6 p-6 transition-all duration-300 ${overAct === actNum ? 'ring-2' : 'bg-black/10'}`} 
                                    style={{ 
                                        ['--tw-ring-color' as any]: settings.accentColor,
                                        backgroundColor: overAct === actNum ? `${settings.accentColor}10` : 'rgba(0,0,0,0.15)'
                                    }}
                                >
                                    {acts[actNum].map(ch => (
                                        <ChapterThumbnail 
                                            key={ch.id} 
                                            chapter={ch} 
                                            allCharacters={characters} 
                                            settings={settings} 
                                            isSelected={selectedIds.has(ch.id)} 
                                            onSelect={onSelect} 
                                            onToggleExpand={setExpandedCharacterId} 
                                            isDragging={dragState.draggedIds?.includes(ch.id) ?? false} 
                                            draggableProps={{ draggable: true, onDragStart: handleDragStart, 'data-chapter-id': ch.id }} 
                                            tileBackgroundStyle={tileBackgroundStyle} 
                                            onCharacterDragOver={() => {}} 
                                            onCharacterDrop={() => {}} 
                                        />
                                    ))}
                                    {acts[actNum].length === 0 && (
                                        <div className="col-span-full h-32 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg opacity-30 italic text-sm">
                                            Empty {actNum === 0 ? 'Pool' : `Act ${actNum}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            
            <style>{`
                @keyframes pulse-subtle {
                    0% { box-shadow: 0 0 0 0px \${settings.successColor}80; }
                    70% { box-shadow: 0 0 0 10px \${settings.successColor}00; }
                    100% { box-shadow: 0 0 0 0px \${settings.successColor}00; }
                }
                .pulse-subtle { animation: pulse-subtle 2s infinite; }
            `}</style>
        </div>
    );
};
