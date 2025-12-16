
import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo, useContext } from 'react';
import { produce } from 'immer';
import { useDebouncedCallback } from 'use-debounce';
import type { EditorSettings, ICharacter, IChapter, ISnippet, TileBackgroundStyle, ChapterPacingInfo } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { ChevronDownIcon, BookOpenIcon, CameraIcon, LockClosedIconOutline, LockOpenIconOutline, RevertIcon, SparklesIconOutline, TrashIconOutline, StarIcon, XIcon, LinkIcon, ViewListIcon, ViewGridIcon, UserCircleIcon, ChevronUpIcon, BrushIcon, SpinnerIcon, DocumentTextIcon, PaperAirplaneIcon } from '../common/Icons';
import { isColorLight, shadeColor, getImageColor } from '../../utils/colorUtils';
import { generateBriefingHtml } from '../../utils/manuscriptUtils';
import { AIError } from '../common/AIError';

// --- UTILS & HOOKS ---
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

    if (!isEnabled) {
      if (textArea && textArea.style.height !== '') {
        textArea.style.height = '';
      }
      previousIsEnabledRef.current = false;
      return;
    }
    
    if (!textArea || !scrollContainer) {
        previousIsEnabledRef.current = isEnabled;
        return;
    }
    
    const performResize = () => {
        if (textArea.offsetParent === null) return;
        
        const scrollContainerRect = scrollContainer.getBoundingClientRect();
        const textAreaRect = textArea.getBoundingClientRect();
        const isTextAreaTopOutOfView = textAreaRect.top < scrollContainerRect.top;
        
        let scrollPositionBeforeResize: number | null = null;
        let oldTextAreaHeight: number | null = null;
        
        if (isTextAreaTopOutOfView) {
            scrollPositionBeforeResize = scrollContainer.scrollTop;
            oldTextAreaHeight = textArea.scrollHeight;
        }

        textArea.style.height = 'auto';
        const originalOverflow = textArea.style.overflow;
        textArea.style.overflow = 'hidden';
        textArea.style.height = `${textArea.scrollHeight}px`;
        textArea.style.overflow = originalOverflow;
        
        if (isTextAreaTopOutOfView && scrollPositionBeforeResize !== null && oldTextAreaHeight !== null) {
            const newTextAreaHeight = textArea.scrollHeight;
            const heightDifference = newTextAreaHeight - oldTextAreaHeight;
            scrollContainer.scrollTop = scrollPositionBeforeResize + heightDifference;
        }
    };
    
    const isJustExpanded = isEnabled && !previousIsEnabledRef.current;

    if (isJustExpanded && isAnimated) {
      const timeoutId = setTimeout(performResize, 700);
      return () => clearTimeout(timeoutId);
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
    ghost.style.padding = '8px 12px';
    ghost.style.borderRadius = '8px';
    ghost.style.backgroundColor = settings.accentColor || '#2563eb';
    ghost.style.color = '#FFFFFF';
    ghost.style.fontFamily = 'Inter, sans-serif';
    ghost.style.fontSize = '14px';
    ghost.style.fontWeight = '600';
    ghost.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    ghost.style.zIndex = '9999';
    ghost.textContent = count > 1 ? `${count} items` : '1 item';
    return ghost;
};

// --- COMPONENTS ---

const PacingHeatmap: React.FC<{ 
    analysis: ChapterPacingInfo[];
    settings: EditorSettings;
}> = ({ analysis, settings }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

    const scoreToColor = (score: number) => { // score is -1 to 1
        // Blue (HSL: 220, 83%, 60%) -> White (HSL: any, 0%, 100%) -> Red (HSL: 0, 84%, 60%)
        if (score < 0) {
            // Interpolate from white to blue
            const lightness = 100 - (Math.abs(score) * 40); // 100 -> 60
            const saturation = Math.abs(score) * 83; // 0 -> 83
            return `hsl(220, ${saturation}%, ${lightness}%)`;
        } else {
            // Interpolate from white to red
            const lightness = 100 - (score * 40); // 100 -> 60
            const saturation = score * 84; // 0 -> 84
            return `hsl(0, ${saturation}%, ${lightness}%)`;
        }
    };

    const handleMouseMove = (e: React.MouseEvent, info: ChapterPacingInfo) => {
        const content = `
            <strong>Ch ${info.chapterNumber}: ${info.title}</strong><br/>
            Pacing Score: ${info.pacingScore.toFixed(2)}<br/>
            <em>${info.justification}</em>
        `;
        setTooltip({ content, x: e.clientX, y: e.clientY });
    };

    return (
        <div className="relative mb-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-2 select-none" style={{ color: `${settings.textColor}99` }}>
                Pacing Heatmap
            </h4>
            <div className="flex w-full h-8 rounded-md overflow-hidden" onMouseLeave={() => setTooltip(null)}>
                {analysis.map(info => (
                    <div
                        key={info.chapterId}
                        className="flex-grow h-full transition-transform duration-200 hover:scale-y-125"
                        style={{ backgroundColor: scoreToColor(info.pacingScore) }}
                        onMouseMove={(e) => handleMouseMove(e, info)}
                    />
                ))}
            </div>
            {tooltip && (
                <div
                    className="fixed z-50 p-2 rounded-md shadow-lg text-xs"
                    style={{
                        top: tooltip.y + 15,
                        left: tooltip.x + 15,
                        backgroundColor: settings.toolbarBg,
                        color: settings.toolbarText,
                        maxWidth: '250px',
                        pointerEvents: 'none',
                    }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};


const ExpandedChapterView: React.FC<{
    chapter: IChapter;
    characters: ICharacter[];
    snippets: ISnippet[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<IChapter>) => void;
    onDeleteRequest: (chapter: IChapter) => void;
    settings: EditorSettings;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    onCharacterDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onCharacterDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    isSelected: boolean;
    tileBackgroundStyle: TileBackgroundStyle;
    directoryHandle: FileSystemDirectoryHandle | null;
}> = React.memo(({
    chapter, characters, snippets, onClose, onUpdate, onDeleteRequest, settings, scrollContainerRef, onCharacterDragOver, onCharacterDrop, isSelected, tileBackgroundStyle, directoryHandle
}) => {
    const dispatch = useNovelDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isGeneratingChapter, errorId, errorMessage, onGenerateChapterDetails, onUpdateChapterFromManuscript } = useAssemblyAI();
    const isGenerating = isGeneratingChapter === chapter.id;

    const [localTitle, setLocalTitle] = useState(chapter.title);
    const [summary, setSummary] = useState(chapter.summary);
    const [rawNotes, setRawNotes] = useState(chapter.rawNotes);
    const [outline, setOutline] = useState(chapter.outline);
    const [analysis, setAnalysis] = useState(chapter.analysis || '');

    const [isEditingOutline, setIsEditingOutline] = useState(() => !String(chapter.outline || '').trim());
    const [isEditingAnalysis, setIsEditingAnalysis] = useState(() => !String(chapter.analysis || '').trim());
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
    const titleInputRef = useRef<HTMLTextAreaElement>(null);

    const summaryRef = useRef<HTMLTextAreaElement>(null);
    const rawNotesRef = useRef<HTMLTextAreaElement>(null);
    const outlineRef = useRef<HTMLTextAreaElement>(null);
    const analysisRef = useRef<HTMLTextAreaElement>(null);

    useAutosizeTextArea(summaryRef, summary, true, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(rawNotesRef, rawNotes, true, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(outlineRef, outline, true, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(analysisRef, analysis, true, scrollContainerRef, { isAnimated: true });
    useAutosizeTextArea(titleInputRef, localTitle, isEditingTitle, scrollContainerRef, { isAnimated: false });

    const debouncedUpdate = useDebouncedCallback((updates: Partial<IChapter>) => {
        onUpdate(chapter.id, updates);
    }, 500);

    useEffect(() => {
        setLocalTitle(chapter.title);
        setSummary(chapter.summary);
        setRawNotes(chapter.rawNotes);
        setOutline(chapter.outline);
        setAnalysis(chapter.analysis || '');

        if (!String(chapter.outline || '').trim()) {
            setIsEditingOutline(true);
        }
        if (!String(chapter.analysis || '').trim()) {
            setIsEditingAnalysis(true);
        }
    }, [chapter]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleTitleUpdate = () => {
        setIsEditingTitle(false);
        const trimmedTitle = localTitle.trim();
        if (trimmedTitle && trimmedTitle !== chapter.title) {
            onUpdate(chapter.id, { title: trimmedTitle });
        } else if (!trimmedTitle) {
            setLocalTitle('New Chapter');
            if (chapter.title !== 'New Chapter') {
                onUpdate(chapter.id, { title: 'New Chapter' });
            }
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setLocalTitle(chapter.title);
            setIsEditingTitle(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (loadEvent) => {
                const photoUrl = loadEvent.target?.result as string;
                try {
                    const imageColor = await getImageColor(photoUrl);
                    onUpdate(chapter.id, { photo: photoUrl, imageColor: imageColor, isPhotoLocked: true });
                } catch (err) {
                    onUpdate(chapter.id, { photo: photoUrl, isPhotoLocked: true });
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerateDetails = () => {
        if (!rawNotes.trim()) {
            return;
        }
        onGenerateChapterDetails(chapter, rawNotes);
        setIsEditingOutline(false);
        setIsEditingAnalysis(false);
    }
    
    const handleUpdateFromManuscript = () => {
        onUpdateChapterFromManuscript(chapter);
        setShowUpdateConfirm(false);
    };

    const handleSendBriefToManuscript = () => {
        const briefingHtml = generateBriefingHtml(chapter, characters, snippets);
        // Prepend briefing to existing content
        const existingContent = chapter.content || '<div><br></div>';
        // Basic check to avoid double injection if user clicks multiple times without edit
        if (existingContent.includes('[ CHAPTER BRIEFING ]')) {
             if (!confirm("This chapter already contains a briefing. Add another one?")) {
                 return;
             }
        }
        
        onUpdate(chapter.id, { content: briefingHtml + existingContent });
    };

    const handleRevertDetails = () => {
        if (chapter.previousDetails) {
            onUpdate(chapter.id, { ...chapter.previousDetails, previousDetails: undefined });
        }
    };

    const handleToggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(chapter.id, { isPhotoLocked: !chapter.isPhotoLocked });
    };

    const handleSendSnippetBack = (snippetId: string) => {
        const newLinkedSnippetIds = (chapter.linkedSnippetIds || []).filter(id => id !== snippetId);
        onUpdate(chapter.id, { linkedSnippetIds: newLinkedSnippetIds });

        dispatch({ type: 'UPDATE_SNIPPET', payload: { id: snippetId, updates: { isUsed: false } } });
    };

    const handleCycleAccentStyle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const styles: ('left-top-ingress' | 'outline' | 'corner-diagonal')[] = ['left-top-ingress', 'outline', 'corner-diagonal'];
        const currentStyle = chapter.accentStyle || 'left-top-ingress';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onUpdate(chapter.id, { accentStyle: nextStyle });
    };

    const tileBorderColor = chapter.imageColor || settings.toolbarInputBorderColor;
    
    const isDarkMode = !isColorLight(settings.textColor);
    const secondaryButtonBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 10 : -10);
    const secondaryButtonHoverBg = shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 20 : -10);
    
    const linkedCharacters = useMemo(() => {
        return (chapter.characterIds || [])
            .map(id => characters.find(c => c.id === id))
            .filter((c): c is ICharacter => !!c);
    }, [chapter.characterIds, characters]);

    const linkedSnippets = useMemo(() => {
        return (chapter.linkedSnippetIds || [])
            .map(id => snippets.find(s => s.id === id))
            .filter((s): s is ISnippet => !!s);
    }, [chapter.linkedSnippetIds, snippets]);
    
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

    return (
        <div className="relative w-full">
             <div data-chapter-id={chapter.id}>
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                <div
                    className="relative rounded-lg shadow-md transition-shadow duration-300 ease-in-out z-10 flex flex-grow flex-col border-4 overflow-hidden"
                    style={{
                        ...backgroundStyle,
                        color: settings.textColor,
                        borderColor: isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent'),
                    }}
                    onDragOver={onCharacterDragOver}
                    onDrop={onCharacterDrop}
                >
                     {(chapter.accentStyle === 'left-top-ingress' || !chapter.accentStyle) && (
                        <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
                    )}
                    {chapter.accentStyle === 'corner-diagonal' && (
                        <div className="absolute bottom-0 right-0" style={{
                            width: 0,
                            height: 0,
                            borderBottom: `48px solid ${accentColor}`,
                            borderLeft: '48px solid transparent',
                        }}></div>
                    )}
                    <div className="flex-grow flex flex-col min-h-0 overflow-y-auto">
                        <div className="w-full flex flex-col">
                            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: `${tileBorderColor}80`}}>
                                 <div className="text-xl font-bold flex items-baseline gap-2 min-w-0" title={`${chapter.title} ${chapter.chapterNumber}`}>
                                    <span className="flex-shrink-0">{chapter.chapterNumber}.</span>
                                    <div className="truncate flex-grow">{chapter.title}</div>
                                </div>
                            </div>
                             {linkedCharacters.length > 0 && (
                                <div 
                                    className="flex-shrink-0 flex items-center flex-wrap gap-x-2 gap-y-3 px-4 py-3 border-b"
                                    style={{borderColor: `${tileBorderColor}80`}}
                                    onDragOver={onCharacterDragOver}
                                    onDrop={onCharacterDrop}
                                >
                                    {linkedCharacters.map(char => {
                                        const handleRemoveCharacter = (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            const newCharacterIds = chapter.characterIds?.filter(id => id !== char.id);
                                            onUpdate(chapter.id, { characterIds: newCharacterIds });
                                        };

                                        return (
                                            <div key={char.id} className="relative h-10 w-10 rounded-md group" title={char.name}>
                                                <div 
                                                    className="h-full w-full rounded-md bg-cover bg-center border-2 overflow-hidden"
                                                    style={{ backgroundColor: char.imageColor, borderColor: char.imageColor }}
                                                >
                                                    {char.photo && <img src={char.photo} alt={char.name} className="w-full h-full object-cover" />}
                                                </div>
                                                {char.isPrimary && <StarIcon className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'}}/>}
                                                <button 
                                                    onClick={handleRemoveCharacter}
                                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 hover:bg-red-700"
                                                    aria-label={`Remove ${char.name} from chapter`}
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="p-4 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80">Title</label>
                                    <input
                                        type="text"
                                        value={localTitle}
                                        onChange={e => setLocalTitle(e.target.value)}
                                        onBlur={handleTitleUpdate}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                            if (e.key === 'Escape') {
                                                setLocalTitle(chapter.title);
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="w-full p-2 rounded border"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80">Scene Image</label>
                                    <div className="relative group">
                                        <div 
                                            className="w-full h-40 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors select-none relative"
                                            style={{ borderColor: tileBorderColor, backgroundColor: settings.backgroundColor }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {chapter.photo && (
                                                <img src={chapter.photo} alt={chapter.title} className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none" />
                                            )}
                                            {!chapter.photo && (
                                                <div className="text-center">
                                                    <CameraIcon className="h-8 w-8 mx-auto opacity-50"/>
                                                    <p className="text-xs mt-1 opacity-70">Click to upload an image</p>
                                                </div>
                                            )}
                                        </div>
                                        <div 
                                            className="absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 cursor-pointer"
                                            style={{
                                                backgroundColor: chapter.isPhotoLocked ? settings.accentColor : secondaryButtonBg,
                                                color: chapter.isPhotoLocked ? 'white' : settings.toolbarText
                                            }}
                                            onClick={handleToggleLock}
                                            title={chapter.isPhotoLocked ? "Unlock photo (allows AI to replace it)" : "Lock photo (prevents AI replacement)"}
                                        >
                                            {chapter.isPhotoLocked ? <LockClosedIconOutline className="h-4 w-4" /> : <LockOpenIconOutline className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80">Summary</label>
                                    <textarea
                                        ref={summaryRef} value={summary}
                                        onChange={e => { setSummary(e.target.value); debouncedUpdate({ summary: e.target.value }); }}
                                        className="w-full p-2 rounded border resize-none overflow-hidden"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold opacity-80">Outline</label>
                                        <button
                                            onClick={() => setIsEditingOutline(p => !p)}
                                            className="text-xs px-2 py-0.5 rounded"
                                            style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText, }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                                        >
                                            {isEditingOutline ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingOutline ? (
                                        <textarea
                                            ref={outlineRef} value={outline}
                                            onChange={e => { setOutline(e.target.value); debouncedUpdate({ outline: e.target.value }); }}
                                            className="w-full p-2 rounded border resize-none overflow-hidden"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                            rows={6}
                                        />
                                    ) : (
                                        <div 
                                            className="w-full p-2 rounded border"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        >
                                        <MarkdownRenderer source={outline} settings={settings} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold opacity-80">Story Analysis</label>
                                        <button
                                            onClick={() => setIsEditingAnalysis(p => !p)}
                                            className="text-xs px-2 py-0.5 rounded"
                                            style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText, }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                                        >
                                            {isEditingAnalysis ? 'Preview' : 'Edit'}
                                        </button>
                                    </div>
                                    {isEditingAnalysis ? (
                                        <textarea
                                            ref={analysisRef} value={analysis}
                                            onChange={e => { setAnalysis(e.target.value); debouncedUpdate({ analysis: e.target.value }); }}
                                            className="w-full p-2 rounded border resize-none overflow-hidden"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                            rows={6}
                                            placeholder="AI-generated analysis of conflict, stakes, etc."
                                        />
                                    ) : (
                                        <div 
                                            className="w-full p-2 rounded border"
                                            style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        >
                                        <MarkdownRenderer source={analysis} settings={settings} />
                                        </div>
                                    )}
                                </div>
                                {linkedSnippets.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 opacity-80">Linked Snippets</label>
                                        <div className="space-y-2">
                                            {linkedSnippets.map(snippet => (
                                                <div key={snippet.id} className="p-3 rounded-md flex justify-between items-start gap-3" style={{ backgroundColor: settings.backgroundColor }}>
                                                    <p className="text-sm opacity-90 whitespace-pre-wrap flex-grow">{snippet.cleanedText}</p>
                                                    <button
                                                        onClick={() => handleSendSnippetBack(snippet.id)}
                                                        className="p-1.5 rounded flex-shrink-0"
                                                        style={{ backgroundColor: secondaryButtonBg }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg}
                                                        title="Send snippet back to the repository"
                                                    >
                                                        <RevertIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold mb-2 opacity-80">Rough Notes</label>
                                    <textarea
                                        ref={rawNotesRef} value={rawNotes}
                                        onChange={e => { setRawNotes(e.target.value); debouncedUpdate({ rawNotes: e.target.value }); }}
                                        className="w-full p-2 rounded border resize-none overflow-hidden"
                                        style={{ borderColor: tileBorderColor, color: settings.textColor, backgroundColor: settings.backgroundColor }}
                                        rows={4}
                                        placeholder="Jot down plot points, scene ideas, dialogue snippets, etc."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <footer className="flex-shrink-0 p-4 border-t flex justify-between items-center relative" style={{borderColor: `${tileBorderColor}80`}}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGenerateDetails}
                                disabled={isGenerating}
                                className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center text-white disabled:opacity-60"
                                style={{ backgroundColor: settings.accentColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                            >
                                <SparklesIconOutline className="h-5 w-5 mr-2"/>
                                {isGenerating ? 'Generating...' : 'Generate from Notes'}
                            </button>
                            {chapter.previousDetails ? (
                                <button
                                    onClick={handleRevertDetails}
                                    className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                                    style={{ backgroundColor: secondaryButtonBg }}
                                >
                                    <RevertIcon className="h-4 w-4 mr-2" />
                                    Revert
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 relative">
                                    <button
                                        onMouseEnter={() => setShowUpdateConfirm(true)}
                                        onMouseLeave={() => setShowUpdateConfirm(false)}
                                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                                        style={{ backgroundColor: secondaryButtonBg }}
                                    >
                                        <BrushIcon className="h-4 w-4 mr-2" />
                                        Update from Manuscript
                                    </button>
                                    <button
                                        onClick={handleSendBriefToManuscript}
                                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                                        style={{ backgroundColor: secondaryButtonBg }}
                                        title="Sends the chapter summary, characters, and snippets to the manuscript editor as a prompt."
                                    >
                                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                                        Send Brief to Manuscript
                                    </button>
                                    {showUpdateConfirm && (
                                        <div onMouseEnter={() => setShowUpdateConfirm(true)} onMouseLeave={() => setShowUpdateConfirm(false)} className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-md shadow-lg text-xs z-50" style={{backgroundColor: settings.dropdownBg}}>
                                            <p>This will analyze the written chapter text to update this chapter's outline and analysis. This will overwrite existing data.</p>
                                            <button onClick={handleUpdateFromManuscript} className="w-full mt-2 py-1.5 rounded-md text-white font-semibold" style={{backgroundColor: settings.accentColor}}>Confirm Update</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={handleCycleAccentStyle}
                                className="p-2 rounded-md"
                                style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg}
                                title="Cycle accent style"
                            >
                                <BrushIcon className="h-5 w-5" />
                            </button>
                             <button
                                onClick={onClose}
                                className="p-2 rounded-md"
                                style={{ backgroundColor: secondaryButtonBg, color: settings.toolbarText }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = secondaryButtonHoverBg}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = secondaryButtonBg}
                                aria-label="Collapse chapter details"
                                title="Collapse"
                            >
                                <ChevronUpIcon />
                            </button>
                            <button
                                onClick={() => onDeleteRequest(chapter)}
                                className="p-2 rounded-md text-white"
                                style={{ backgroundColor: settings.dangerColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}
                                title="Delete chapter"
                            >
                                <TrashIconOutline />
                            </button>
                        </div>
                    </footer>
                    {errorId === chapter.id && <AIError message={errorMessage} className="mx-4 mb-2" />}
                </div>
            </div>
        </div>
    );
});

const ChapterThumbnail: React.FC<{
    chapter: IChapter;
    settings: EditorSettings;
    isSelected: boolean;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onToggleExpand: (id: string) => void;
    draggableProps: any;
    isDragging: boolean;
    tileBackgroundStyle: TileBackgroundStyle;
}> = ({ chapter, settings, isSelected, onSelect, onToggleExpand, draggableProps, isDragging, tileBackgroundStyle }) => {
    const isDarkMode = !isColorLight(settings.textColor);

    const backgroundStyle = useMemo(() => {
        const baseColor = settings.toolbarButtonBg || '#374151';
        const secondaryColor = shadeColor(baseColor, isDarkMode ? 7 : -7);
        
        switch (tileBackgroundStyle) {
            case 'diagonal': return { background: `linear-gradient(to top left, ${baseColor} 49.9%, ${secondaryColor} 50.1%)` };
            case 'horizontal': return { background: `linear-gradient(to bottom, ${isDarkMode ? secondaryColor : baseColor} 33.3%, ${isDarkMode ? baseColor : secondaryColor} 33.3%)` };
            default: return { backgroundColor: baseColor };
        }
    }, [tileBackgroundStyle, settings.toolbarButtonBg, isDarkMode]);
    
    const accentColor = chapter.imageColor || settings.accentColor;

    return (
        <div
            onClick={(e) => onSelect(chapter.id, e)}
            {...draggableProps}
            className={`relative aspect-square flex flex-col rounded-lg shadow-md transition-all duration-300 border-4 overflow-hidden ${isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}
            style={{
                borderColor: isSelected ? settings.accentColor : (chapter.accentStyle === 'outline' ? accentColor : 'transparent'),
                ...backgroundStyle,
            }}
        >
             {(chapter.accentStyle === 'left-top-ingress' || !chapter.accentStyle) && (
                <div className="absolute top-0 left-0 w-[6px] h-1/3" style={{backgroundColor: accentColor}}></div>
            )}
            {chapter.accentStyle === 'corner-diagonal' && (
                <div className="absolute bottom-0 right-0" style={{
                    width: 0,
                    height: 0,
                    borderBottom: `32px solid ${accentColor}`,
                    borderLeft: '32px solid transparent',
                }}></div>
            )}
            {/* Image Area */}
            <div className="mx-2 mt-2 h-3/5 flex-shrink-0 relative overflow-hidden rounded-md">
                {chapter.photo ? (
                    <img src={chapter.photo} alt={chapter.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? -5 : 5)}}>
                        <BookOpenIcon className="h-10 w-10 opacity-30"/>
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="px-3 pb-3 pt-2 flex-grow flex flex-col justify-between min-h-0">
                <div>
                    <h3 className="font-bold text-sm truncate" title={`${chapter.chapterNumber}. ${chapter.title}`}>
                        {chapter.chapterNumber}. {chapter.title}
                    </h3>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(chapter.keywords || []).slice(0, 3).map(kw => (
                        <span key={kw} className="px-1.5 py-0.5 rounded text-[10px]" style={{backgroundColor: shadeColor(settings.toolbarButtonBg || '#374151', isDarkMode ? 10 : -10), color: `${settings.textColor}B3`}}>{kw}</span>
                    ))}
                </div>
            </div>
            
            {/* Expand Button */}
            <button
                className="absolute bottom-2 right-2 cursor-pointer p-1 rounded-full transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); onToggleExpand(chapter.id); }}
                style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                aria-label={"Expand chapter details"}
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
    const [orderedChapters, setOrderedChapters] = useState(chapters);
    const [dragState, setDragState] = useState<{draggedIds: string[] | null, overId: string | null}>({draggedIds: null, overId: null});
    const [draggedCharacterId, setDraggedCharacterId] = useState<string | null>(null);
    const [actTitles, setActTitles] = useState<{ [key: number]: string }>({ 1: '', 2: '', 3: '' });
    const [overAct, setOverAct] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const linkPanelScrollRef = useRef<HTMLDivElement>(null);
    const dispatch = useNovelDispatch();
    const { onGeneratePacingAnalysis, errorMessage, onSetError } = useAssemblyAI();

    const sortedChapters = useMemo(() => [...chapters].sort((a,b) => a.chapterNumber - b.chapterNumber), [chapters]);
    
    useEffect(() => {
        if (!dragState.draggedIds) {
            setOrderedChapters(sortedChapters);
        }
    }, [sortedChapters, dragState.draggedIds]);
    
    const handleActTitleChange = (actNum: number, title: string) => {
        setActTitles(prev => ({ ...prev, [actNum]: title }));
    };

    const reorderChaptersAndUpdateFiles = useCallback(async (reorderedChapters: IChapter[], originalChapters: IChapter[]) => {
        const renumberedChapters = reorderedChapters.map((chapter, index) => ({
            ...chapter,
            chapterNumber: index + 1,
        }));

        dispatch({ type: 'SET_CHAPTERS', payload: renumberedChapters });

        if (!directoryHandle) return;

        try {
            const renames: { from: string; to: string }[] = [];
            renumberedChapters.forEach(newChapter => {
                const oldChapter = originalChapters.find(c => c.id === newChapter.id);
                if (oldChapter && oldChapter.chapterNumber !== newChapter.chapterNumber) {
                    renames.push({
                        from: `${oldChapter.title}-${oldChapter.chapterNumber}.rtf`,
                        to: `${newChapter.title}-${newChapter.chapterNumber}.rtf`
                    });
                }
            });

            if (renames.length === 0) return;

            const tempRenames = [];
            for (const rename of renames) {
                const tempName = `${rename.from}.tmp.${Date.now()}`;
                try {
                    const fileHandle = await directoryHandle.getFileHandle(rename.from);
                    // @ts-ignore
                    await fileHandle.move(tempName);
                    tempRenames.push({ from: tempName, to: rename.to });
                } catch (e) {
                     if (e instanceof DOMException && e.name === 'NotFoundError') {
                         console.warn(`Could not find file ${rename.from} to rename. It might be a new chapter.`);
                     } else {
                         throw e;
                     }
                }
            }

            for (const rename of tempRenames) {
                 try {
                    const fileHandle = await directoryHandle.getFileHandle(rename.from);
                     // @ts-ignore
                    await fileHandle.move(rename.to);
                 } catch (e) {
                      console.error(`Error in second pass renaming ${rename.from} to ${rename.to}`, e);
                 }
            }
        } catch (error) {
            console.error("Failed to rename chapter files:", error);
        }
    }, [directoryHandle, dispatch]);


    const handleToggleExpand = useCallback((id: string) => {
        const newExpandedId = expandedChapterId === id ? null : id;
        setExpandedCharacterId(newExpandedId);
    }, [expandedChapterId, setExpandedCharacterId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.chapterId;
        if (!id) return;

        const idsToDrag = selectedIds.has(id) ? Array.from(selectedIds) : [id];

        setDragState({ draggedIds: idsToDrag, overId: id });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ itemIds: idsToDrag, type: 'chapter' }));
        
        const ghost = createDragGhost(idsToDrag.length, settings);
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 20, 20);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };
    
    const findLastIndex = <T,>(array: readonly T[], predicate: (value: T) => boolean) => {
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i])) return i;
        }
        return -1;
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const { draggedIds } = dragState;
        if (!draggedIds) return;

        const chapterElement = (e.target as HTMLElement).closest('[data-chapter-id]');
        const overId = chapterElement ? (chapterElement as HTMLElement).dataset.chapterId : null;
        
        const actElement = (e.target as HTMLElement).closest('[data-act]');
        const targetActString = actElement ? (actElement as HTMLElement).dataset.act : null;
        const targetAct = targetActString ? parseInt(targetActString, 10) : null;
        if (overAct !== targetAct) {
            setOverAct(targetAct);
        }
        
        const isActHover = (e.target as HTMLElement).closest('[data-act]');
        if (!overId && !isActHover) return;
        if (overId && (overId === dragState.overId || draggedIds.includes(overId))) return;

        setDragState(s => ({...s, overId}));

        setOrderedChapters(currentOrder => {
            const itemsToMove = currentOrder.filter(item => draggedIds.includes(item.id));
            const remainingItems = currentOrder.filter(item => !draggedIds.includes(item.id));
        
            if (overId) {
                const targetChapter = remainingItems.find(c => c.id === overId);
                if (!targetChapter) return currentOrder;
        
                const targetAct = targetChapter.act;
                const updatedItemsToMove = itemsToMove.map(item => ({ ...item, act: targetAct }));
        
                let targetIndex = remainingItems.findIndex(c => c.id === overId);
                const overElementRect = chapterElement!.getBoundingClientRect();
                const isAfter = e.clientX > overElementRect.left + overElementRect.width / 2;
                if (isAfter) targetIndex++;
                
                remainingItems.splice(targetIndex, 0, ...updatedItemsToMove);
                return remainingItems;
            } else if (targetActString) {
                const targetAct = parseInt(targetActString, 10);
                const updatedItemsToMove = itemsToMove.map(item => ({ ...item, act: targetAct === 0 ? undefined : targetAct }));
                
                const lastInPreviousActs = findLastIndex(remainingItems, (c: IChapter) => (c.act ?? 0) < targetAct);
                remainingItems.splice(lastInPreviousActs + 1, 0, ...updatedItemsToMove);
                return remainingItems;
            }
            return currentOrder;
        });
    };
    
    const handleDragEnd = () => {
        setDragState({draggedIds: null, overId: null});
        setOverAct(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragState.draggedIds && JSON.stringify(orderedChapters) !== JSON.stringify(sortedChapters)) {
            reorderChaptersAndUpdateFiles(orderedChapters, chapters);
        }
        handleDragEnd();
    };

    const acts = useMemo(() => {
        const actMap: { [key: number]: IChapter[] } = { 1: [], 2: [], 3: [] };
        const unassigned: IChapter[] = [];

        orderedChapters.forEach(c => {
            if (c.act && actMap[c.act]) {
                actMap[c.act].push(c);
            } else {
                unassigned.push(c);
            }
        });
        return { '0': unassigned, ...actMap };
    }, [orderedChapters]);


    const handleCharacterDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.characterId;
        if (id) {
            setDraggedCharacterId(id);
            e.dataTransfer.effectAllowed = 'link';
            e.dataTransfer.setData('text/plain', id);
        }
    };
    
    const handleCharacterDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const chapterElement = e.currentTarget.closest('[data-chapter-id]');
        const chapterId = (chapterElement as HTMLElement)?.dataset.chapterId;
        
        if (!chapterId || !draggedCharacterId) return;

        const chapter = chapters.find(c => c.id === chapterId);
        if (chapter) {
            const currentIds = chapter.characterIds || [];
            if (!currentIds.includes(draggedCharacterId)) {
                onUpdateChapter(chapterId, { characterIds: [...currentIds, draggedCharacterId] });
            }
        }
        setDraggedCharacterId(null);
    };
    
    const handleCharacterDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
    }


    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-3 border-b flex justify-between items-center" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                 <div className="flex items-center gap-2">
                    <button onClick={onToggleLinkPanel} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md focus:outline-none select-none" style={{ backgroundColor: isLinkPanelOpen ? settings.accentColor : settings.toolbarButtonBg, color: isLinkPanelOpen ? '#FFFFFF' : settings.toolbarText }} title="Link characters to chapters">
                        <LinkIcon />
                        Link Characters
                    </button>
                    <button 
                        onClick={() => {
                            if (errorMessage) onSetError(null);
                            onGeneratePacingAnalysis();
                        }} 
                        disabled={isGeneratingPacingAnalysis}
                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md focus:outline-none select-none disabled:opacity-60" 
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }} 
                        title="Analyze chapter pacing"
                    >
                        {isGeneratingPacingAnalysis ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                        Analyze Pacing
                    </button>
                 </div>
            </div>
            <div className="w-full h-full flex min-h-0">
                <div ref={scrollRef} className="flex-grow h-full overflow-y-auto p-4">
                     {pacingAnalysis && <PacingHeatmap analysis={pacingAnalysis} settings={settings} />}
                     {errorMessage && !expandedChapterId && <AIError message={errorMessage} className="mb-4" />}
                     {expandedChapterId ? (() => {
                        const chapter = chapters.find(c => c.id === expandedChapterId);
                        if (!chapter) {
                            setExpandedCharacterId(null);
                            return null;
                        }
                        return (
                            <ExpandedChapterView
                                chapter={chapter}
                                characters={characters}
                                snippets={snippets}
                                settings={settings}
                                onUpdate={onUpdateChapter}
                                onDeleteRequest={onDeleteRequest}
                                onClose={() => setExpandedCharacterId(null)}
                                scrollContainerRef={scrollRef}
                                onCharacterDragOver={handleCharacterDragOver}
                                onCharacterDrop={handleCharacterDrop}
                                isSelected={selectedIds.has(chapter.id)}
                                tileBackgroundStyle={tileBackgroundStyle}
                                directoryHandle={directoryHandle}
                            />
                        );
                    })() : (
                        <div className="flex flex-col gap-8">
                            {(() => {
                                const isPoolHovered = overAct === 0;
                                const isPoolEmpty = acts[0].length === 0;
                                return (
                                    <div>
                                        <h3 className="text-lg font-bold uppercase tracking-wider mb-4 select-none" style={{ color: `${settings.textColor}99` }}>Chapter Pool</h3>
                                        <div
                                            data-act={0}
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                            onDragLeave={() => setOverAct(null)}
                                            className={`rounded-lg grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4 border-2 border-dashed transition-all duration-300 ${
                                                isPoolEmpty && !isPoolHovered
                                                    ? 'py-3 px-4'
                                                    : 'p-4 min-h-[180px]'
                                            }`}
                                            style={{
                                                borderColor: `${settings.toolbarInputBorderColor}80`,
                                                backgroundColor: isPoolHovered ? `${settings.toolbarButtonBg}60` : `${settings.toolbarButtonBg}40`
                                            }}
                                        >
                                            {acts[0].map(ch => (
                                                <ChapterThumbnail
                                                    key={ch.id}
                                                    chapter={ch}
                                                    settings={settings}
                                                    isSelected={selectedIds.has(ch.id)}
                                                    onSelect={onSelect}
                                                    onToggleExpand={handleToggleExpand}
                                                    isDragging={dragState.draggedIds?.includes(ch.id) ?? false}
                                                    draggableProps={{
                                                        draggable: true,
                                                        onDragStart: handleDragStart,
                                                        onDragEnd: handleDragEnd,
                                                        'data-chapter-id': ch.id,
                                                    }}
                                                    tileBackgroundStyle={tileBackgroundStyle}
                                                />
                                            ))}
                                            {isPoolEmpty && (
                                                <div className="text-sm opacity-50 select-none pointer-events-none col-span-full text-center">Drag chapters here to unassign them from an Act</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                            {[1, 2, 3].map(actNum => {
                                const isActHovered = overAct === actNum;
                                const isActEmpty = acts[actNum].length === 0;
                                return (
                                    <div key={actNum}>
                                        <div className="flex justify-between items-baseline mb-4">
                                            <h3 className="text-lg font-bold uppercase tracking-wider select-none" style={{ color: `${settings.textColor}99` }}>Act {actNum}</h3>
                                            <input
                                                type="text"
                                                placeholder={`Title for Act ${actNum}`}
                                                value={actTitles[actNum]}
                                                onChange={e => handleActTitleChange(actNum, e.target.value)}
                                                className="bg-transparent border-0 border-b-2 text-sm text-right focus:outline-none"
                                                style={{ color: `${settings.textColor}B3`, borderColor: `${settings.toolbarInputBorderColor}80`, 'caretColor': settings.accentColor } as React.CSSProperties}
                                            />
                                        </div>
                                        <div
                                            data-act={actNum}
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                            onDragLeave={() => setOverAct(null)}
                                            className={`rounded-lg grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4 border-2 border-dashed transition-all duration-300 ${
                                                isActEmpty && !isActHovered
                                                    ? 'py-3 px-4'
                                                    : 'p-4 min-h-[180px]'
                                            }`}
                                            style={{
                                                borderColor: `${settings.toolbarInputBorderColor}80`,
                                                backgroundColor: isActHovered ? `${settings.toolbarButtonBg}60` : `${settings.toolbarButtonBg}40`
                                            }}
                                        >
                                            {acts[actNum].map(ch => (
                                                <ChapterThumbnail
                                                    key={ch.id}
                                                    chapter={ch}
                                                    settings={settings}
                                                    isSelected={selectedIds.has(ch.id)}
                                                    onSelect={onSelect}
                                                    onToggleExpand={handleToggleExpand}
                                                    isDragging={dragState.draggedIds?.includes(ch.id) ?? false}
                                                    draggableProps={{
                                                        draggable: true,
                                                        onDragStart: handleDragStart,
                                                        onDragEnd: handleDragEnd,
                                                        'data-chapter-id': ch.id,
                                                    }}
                                                    tileBackgroundStyle={tileBackgroundStyle}
                                                />
                                            ))}
                                            {isActEmpty && (
                                                <div className="text-sm opacity-50 select-none pointer-events-none col-span-full text-center">Drag chapters into Act {actNum}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div 
                    className={`flex-shrink-0 h-full overflow-y-auto transition-all duration-500 ${isLinkPanelOpen ? 'w-80 p-4 border-l' : 'w-0'}`}
                    style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}
                >
                    {isLinkPanelOpen && (
                        <div ref={linkPanelScrollRef} className="flex flex-col gap-3">
                             <h3 className="text-base font-bold text-center">Drag a character to a chapter</h3>
                            {characters.map(char => (
                                <div key={char.id} draggable onDragStart={handleCharacterDragStart} onDragEnd={() => setDraggedCharacterId(null)} data-character-id={char.id} className="cursor-grab active:cursor-grabbing">
                                    <div className="relative w-full">
                                        <div
                                            className="relative rounded-lg p-3"
                                            style={{ backgroundColor: settings.toolbarButtonBg }}
                                        >
                                            <div className="absolute top-3 right-3 h-14 w-14 z-10">
                                                <div 
                                                    className="border-2 h-full w-full rounded-lg overflow-hidden"
                                                    style={{
                                                        backgroundColor: settings.toolbarButtonBg,
                                                        borderColor: char.imageColor || settings.toolbarInputBorderColor || 'transparent'
                                                    }}
                                                >
                                                    {char.photo ? (
                                                        <img src={char.photo} alt={char.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserCircleIcon className="h-full w-full text-gray-400 opacity-60" />
                                                    )}
                                                </div>
                                                {char.isPrimary && <StarIcon className="absolute -top-2 -right-2 h-5 w-5 text-yellow-400" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'}}/>}
                                            </div>
                                            <div className="pr-20">
                                                <h4 className="font-bold text-sm truncate">{char.name}</h4>
                                                <p className="text-xs opacity-70 mt-1 summary-clamped-2line">{char.summary || char.tagline}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
