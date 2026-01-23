import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import type { IChapter, EditorSettings, Shortcut, WritingGoals, GalleryItem, INovelState, SearchResult, AppUpdate } from '../../types';
import { useDebouncedCallback } from 'use-debounce';
import { useNovelDispatch, useNovelState, initialNovelState } from '../../NovelContext';
import { getAI, hasAPIKey, API_KEY_ERROR } from '../../utils/ai';

import { generateRtfForChapters, downloadFile, calculateWordCountFromHtml, decode } from '../../utils/manuscriptUtils';
import { generateId, extractJson } from '../../utils/common';

import { Toolbar } from './Toolbar';
import { NotesPanel } from './NotesPanel';
import { FindReplaceModal } from './modals/FindReplaceModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { StatsDashboardModal } from './modals/StatsDashboardModal';
import { CustomizeToolbarModal } from './modals/CustomizeToolbarModal';
import { VersionHistoryModal } from './modals/VersionHistoryModal';
import { ContextMenu } from '../common/ContextMenu';
import { VoiceSettingsModal } from './modals/VoiceSettingsModal';
import { ReadAloudModal } from './modals/ReadAloudModal';
import { DesignGalleryModal } from './modals/DesignGalleryModal';
import { SpellCheckModal } from './modals/SpellCheckModal';
import { UserGuideModal } from './modals/UserGuideModal';
import { UnfocusIcon, PauseIcon, PlayIcon, StopIcon } from '../common/Icons';

interface ManuscriptProps {
    settings: EditorSettings;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => Promise<void>;
    isFocusMode: boolean;
    onToggleFocusMode: () => void;
    chapters: IChapter[];
    activeChapterId: string;
    onActiveChapterIdChange: (id: string) => void;
    shortcuts: Shortcut[];
    onShortcutsChange: (shortcuts: Shortcut[]) => void;
    writingGoals: WritingGoals;
    onWritingGoalsChange: (goals: WritingGoals) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    onDirectoryHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
    onGenerateWhatIf: (text: string, context: string) => void;
    galleryItems: GalleryItem[];
    onGalleryItemsChange: (items: GalleryItem[]) => void;
    isVisible: boolean;
    isSaving: boolean;
    onSaveToFolder: () => Promise<boolean>;
}

type ModalType = 'findReplace' | 'shortcuts' | 'stats' | 'customizeToolbar' | 'history' | 'voiceSettings' | 'designGallery' | 'readAloud' | 'spellCheck' | 'userGuide';
type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const createWavUrl = (pcmData: Uint8Array, sampleRate: number): string => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    const blob = new Blob([header, pcmData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

const useTypewriterSound = (enabled: boolean, volume: number = 0.75) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const enterThudBufferRef = useRef<AudioBuffer | null>(null);
    const keyClickBufferRef = useRef<AudioBuffer | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        return () => {
            if (ctx.state !== 'closed') ctx.close().catch(console.warn);
            audioContextRef.current = null;
        };
    }, [enabled]);

    const play = useCallback((type: 'key' | 'enter' = 'key') => {
        const ctx = audioContextRef.current;
        if (!enabled || !ctx) return;
        const vol = volume;
        if (ctx.state === 'suspended') ctx.resume().catch(console.warn);
        const t = ctx.currentTime;
        if (type === 'enter') {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine'; osc1.frequency.setValueAtTime(1800, t);
            gain1.gain.setValueAtTime(0, t);
            gain1.gain.linearRampToValueAtTime(0.04 * vol, t + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.start(t); osc1.stop(t + 1.2);

            if (!enterThudBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.05;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
                enterThudBufferRef.current = buffer;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = enterThudBufferRef.current;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 500;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.03 * vol, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
            noise.start(t);
        } else {
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            if (!keyClickBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.04;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                keyClickBufferRef.current = buffer;
            }
            const src = ctx.createBufferSource();
            src.buffer = keyClickBufferRef.current;
            filter.type = 'bandpass'; filter.frequency.value = 2400; filter.Q.value = 1.8;
            gain.gain.setValueAtTime(0.12 * vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
            src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            src.start(t);
        }
    }, [enabled, volume]);
    return play;
};

export const Manuscript: React.FC<ManuscriptProps> = ({ 
    settings, onSettingsChange, isFocusMode, onToggleFocusMode,
    chapters, activeChapterId, onActiveChapterIdChange,
    shortcuts, onShortcutsChange,
    writingGoals, onWritingGoalsChange, directoryHandle, onDirectoryHandleChange,
    onGenerateWhatIf,
    galleryItems, onGalleryItemsChange,
    isVisible,
    isSaving: isSavingProp,
    onSaveToFolder
}) => {
    const fullState = useNovelState();
    const { characters } = fullState;
    const dispatch = useNovelDispatch();
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);
    const [notesPanelWidth, setNotesPanelWidth] = useState(320);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [previousModal, setPreviousModal] = useState<ModalType | null>(null); 
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false); 
    
    const [isSaving, setIsSaving] = useState(isSavingProp);
    const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [sessionWordCount, setSessionWordCount] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
    
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actions: { label: string; onSelect: () => void }[] } | null>(null);
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
    const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
    const ttsAudioElementRef = useRef<HTMLAudioElement | null>(null);
    
    const isSoundEnabled = settings.isSoundEnabled || false;
    const playTypewriterSound = useTypewriterSound(isSoundEnabled, settings.soundVolume);

    const editorRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const isLocalUpdate = useRef(false);
    const localUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTyping = useRef(false);
    const stableScrollLeft = useRef(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const GAP_PX = 60; 
    const SIDE_MARGIN_PX = 40;
    const [layout, setLayout] = useState({ colWidth: 0, stride: 0, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns: 2 });

    const handleChapterDetailsChange = useCallback((id: string, updates: Partial<IChapter>) => {
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
    }, [dispatch]);

    const handleContentChange = useCallback((newContent: string) => {
        handleChapterDetailsChange(activeChapterId, { content: newContent });
    }, [activeChapterId, handleChapterDetailsChange]);

    useEffect(() => { setIsSaving(isSavingProp); }, [isSavingProp]);

    const activeChapter = useMemo(() => (chapters.find(ch => ch.id === activeChapterId) || chapters[0]) as IChapter, [chapters, activeChapterId]);
    
    // Selection preservation mechanism for contentEditable
    useLayoutEffect(() => {
        if (!editorRef.current) return;
        
        // Prevent React re-renders from wiping DOM content if it was a local change
        if (isLocalUpdate.current && editorRef.current.innerHTML === activeChapter.content) {
            return;
        }

        // Only overwrite if it's truly a remote or cross-chapter change
        if (editorRef.current.innerHTML !== activeChapter.content) {
            editorRef.current.innerHTML = activeChapter.content;
        }
    }, [activeChapter.id, activeChapter.content]);

    const activeChapterWordCount = useMemo(() => {
        if (activeChapter.wordCount !== undefined) return activeChapter.wordCount;
        return calculateWordCountFromHtml(activeChapter.content);
    }, [activeChapter.content, activeChapter.wordCount]);
    
    const totalWordCount = useMemo(() => {
        return chapters.reduce((acc, chapter) => acc + (chapter.wordCount ?? calculateWordCountFromHtml(chapter.content)), 0);
    }, [chapters]);

    const hasContent = useMemo(() => chapters.length > 1 || (chapters[0]?.content.length > 30), [chapters]);

    const handleManualSave = useCallback(async () => {
        if (isSaving) return;
        const success = await onSaveToFolder();
        if (success) {
            const now = new Date();
            setNotification(`Project Saved [${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}]`);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [isSaving, onSaveToFolder]);

    const calculateLayout = useCallback(() => {
        if (!editorContainerRef.current) return;
        const containerWidth = editorContainerRef.current.clientWidth;
        const minTwoPageColWidth = 460;
        const availableWidthTwo = Math.max(0, containerWidth - GAP_PX - (2 * SIDE_MARGIN_PX));
        const safeColWidthTwo = Math.floor(availableWidthTwo / 2);
        let columns = 2; let colWidth = safeColWidthTwo;
        if (safeColWidthTwo < minTwoPageColWidth) {
            columns = 1; colWidth = Math.floor(Math.max(0, containerWidth - (2 * SIDE_MARGIN_PX)));
        }
        const stride = colWidth + GAP_PX;
        setLayout({ colWidth, stride, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns });
        const scrollLeft = editorContainerRef.current.scrollLeft;
        const currentColumnIndex = stride > 0 ? Math.round(scrollLeft / stride) : 0;
        const contentWidth = editorContainerRef.current.scrollWidth - (2 * layout.sideMargin);
        const totalColumns = stride > 0 ? Math.ceil((contentWidth + GAP_PX) / stride) : 1;
        setPageInfo({ current: currentColumnIndex + 1, total: Math.max(2, totalColumns - 1) });
    }, [layout.sideMargin, layout.gap]);

    useLayoutEffect(() => {
        const timer = setTimeout(() => {
            calculateLayout();
            if (editorContainerRef.current && layout.stride > 0) {
                const currentSpread = Math.round(editorContainerRef.current.scrollLeft / layout.stride);
                editorContainerRef.current.scrollLeft = currentSpread * layout.stride;
            }
        }, 16);
        window.addEventListener('resize', calculateLayout);
        return () => { window.removeEventListener('resize', calculateLayout); clearTimeout(timer); };
    }, [calculateLayout, isNotesPanelOpen, notesPanelWidth, isFocusMode, settings.fontSize, settings.fontFamily, isVisible, layout.stride]);

    const snapToSpread = useCallback((targetSpreadIndex: number, useTransition: boolean = true) => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        const totalColumns = Math.ceil((editorContainerRef.current.scrollWidth - (2 * layout.sideMargin) + layout.gap) / layout.stride);
        const targetScrollLeft = Math.max(0, Math.min(targetSpreadIndex, totalColumns - 1)) * layout.stride;
        if (Math.abs(editorContainerRef.current.scrollLeft - targetScrollLeft) < 2) return;
        if (settings.transitionStyle === 'fade' && useTransition) {
            setIsTransitioning(true);
            setTimeout(() => {
                if (editorContainerRef.current) editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: 'instant' });
                requestAnimationFrame(() => setIsTransitioning(false));
            }, 140); 
        } else {
            editorContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: useTransition ? 'smooth' : 'instant' });
        }
    }, [layout, settings.transitionStyle]);

    const handleTTSPlay = useCallback(async () => {
        if (ttsStatus === 'loading') return;
        if (ttsStatus === 'paused' && ttsAudioElementRef.current) { ttsAudioElementRef.current.play(); setTtsStatus('playing'); return; }
        setTtsStatus('loading');
        const selection = window.getSelection(); let textToRead = '';
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) textToRead = selection.toString();
        else { const div = document.createElement('div'); div.innerHTML = activeChapter.content; textToRead = div.innerText; }
        if (!textToRead.trim()) { setTtsStatus('idle'); return; }
        try {
            const ai = getAI();
            const accent = settings.ttsAccent === 'en-GB' ? 'British' : 'American';
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read this with a ${accent} accent: ${textToRead.substring(0, 15000)}` }] }],
                config: { 
                    responseModalities: ['AUDIO'], 
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.narratorVoice || 'Kore' } } } 
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio bytes.");
            if (ttsAudioElementRef.current) { ttsAudioElementRef.current.pause(); ttsAudioElementRef.current = null; }
            const bytes = decode(base64Audio); const audio = new Audio(createWavUrl(bytes, 24000));
            audio.playbackRate = settings.ttsSpeed || 1.0; audio.volume = settings.ttsVolume ?? 1.0;
            audio.onended = () => setTtsStatus('idle'); audio.onerror = () => setTtsStatus('error');
            await audio.play(); ttsAudioElementRef.current = audio; setTtsStatus('playing');
        } catch (e) { console.error("TTS Failed:", e); setTtsStatus('error'); }
    }, [activeChapter.content, ttsStatus, settings]);

    const handleTTSStop = useCallback(() => { if (ttsAudioElementRef.current) { ttsAudioElementRef.current.pause(); ttsAudioElementRef.current = null; } setTtsStatus('idle'); }, []);

    // --- AUTO-CORRECTION LOGIC ---
    const shortcutsRef = useRef(shortcuts);
    useEffect(() => { shortcutsRef.current = shortcuts; }, [shortcuts]);

    const runTextCorrections = useDebouncedCallback(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        const offset = range.startOffset;

        if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent || '';
            const textBeforeCursor = textContent.substring(0, offset);
            
            // 1. Check for Double Spaces (Convert to Single Space)
            if (textBeforeCursor.endsWith("  ")) {
                isLocalUpdate.current = true;
                const startPos = offset - 2;
                node.textContent = textContent.substring(0, startPos) + " " + textContent.substring(offset);
                
                const newRange = document.createRange();
                newRange.setStart(node, startPos + 1);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
                
                handleContentChange(editorRef.current.innerHTML);
                return;
            }

            // 2. Check for Text Shortcuts
            const currentShortcuts = shortcutsRef.current;
            const sortedShortcuts = [...currentShortcuts].sort((a, b) => b.key.length - a.key.length);
            
            let matchedShortcut = null;
            let matchType: 'exact' | 'with-trailing' = 'exact';
            let trailingChar = "";

            for (const s of sortedShortcuts) {
                // Regex to match shortcut key followed by optional single punctuation or whitespace at the end of the buffer
                // This ensures "teh " or "teh." or "teh!" matches "teh"
                const pattern = new RegExp(`(${s.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\s\\.,!?;:]?)$`);
                const match = textBeforeCursor.match(pattern);
                
                if (match) {
                    matchedShortcut = s;
                    trailingChar = match[2] || ""; // The space or punctuation that followed the word
                    break;
                }
            }

            if (matchedShortcut) {
                isLocalUpdate.current = true;
                // Calculate how much text to replace (key length + whatever trailing char we found)
                const totalMatchLen = matchedShortcut.key.length + trailingChar.length;
                const startPos = offset - totalMatchLen;
                const replacement = matchedShortcut.value + trailingChar;
                
                node.textContent = textContent.substring(0, startPos) + replacement + textContent.substring(offset);

                const newRange = document.createRange();
                newRange.setStart(node, startPos + replacement.length);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                handleContentChange(editorRef.current.innerHTML);
                return; 
            }

            // 3. Smart Quotes check
            const lastChar = textBeforeCursor.slice(-1);
            if (lastChar === '"' || lastChar === "'") {
                const textBeforeQuote = textBeforeCursor.substring(0, textBeforeCursor.length - 1);
                const charBefore = textBeforeQuote.slice(-1);
                const isOpenQuoteCondition = textBeforeQuote.length === 0 || /[\s(\[{“‘\u2014]/.test(charBefore);
                
                let replacementChar = null;
                if (lastChar === '"') {
                    replacementChar = isOpenQuoteCondition ? '“' : '”';
                } else {
                    replacementChar = isOpenQuoteCondition ? '‘' : '’';
                }

                if (replacementChar && replacementChar !== lastChar) {
                    isLocalUpdate.current = true;
                    node.textContent = textBeforeQuote + replacementChar + textContent.substring(offset);
                    const newRange = document.createRange();
                    newRange.setStart(node, offset); 
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    handleContentChange(editorRef.current.innerHTML);
                }
            }
        }
    }, 400); // Slightly faster for responsiveness

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        isLocalUpdate.current = true;
        if (localUpdateTimeoutRef.current) clearTimeout(localUpdateTimeoutRef.current);
        
        // Lock local updates for a moment to prevent React from overwriting while user is typing
        localUpdateTimeoutRef.current = setTimeout(() => {
            isLocalUpdate.current = false;
        }, 1000);

        const editor = e.currentTarget;
        handleContentChange(editor.innerHTML);
        runTextCorrections();
    }, [handleContentChange, runTextCorrections]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            const currentScroll = editorContainerRef.current.scrollLeft;
            const currentSpreadIndex = Math.round(currentScroll / layout.stride);
            if (Math.abs(e.deltaY) > 20) {
                const direction = Math.sign(e.deltaY);
                const nextSpreadIndex = Math.max(0, currentSpreadIndex + direction);
                snapToSpread(nextSpreadIndex);
            }
        }
    }, [layout.stride, snapToSpread]);

    const handleScroll = useDebouncedCallback(() => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        const container = editorContainerRef.current;
        const scrollLeft = container.scrollLeft;
        const currentColumnIndex = Math.round(scrollLeft / layout.stride);
        const contentWidth = container.scrollWidth - (2 * layout.sideMargin);
        const totalColumns = Math.ceil((contentWidth + layout.gap) / layout.stride);
        const actualPageCount = Math.max(2, totalColumns - 1);
        setPageInfo({ current: currentColumnIndex + 1, total: actualPageCount });

        if (!isTyping.current) {
            const currentScroll = editorContainerRef.current.scrollLeft;
            const nearestSpread = Math.round(currentScroll / layout.stride);
            snapToSpread(nearestSpread, false);
        }
    }, 150);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText) {
            e.preventDefault();
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                actions: [
                    {
                        label: 'Brainstorm "What If?"',
                        onSelect: () => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = activeChapter.content;
                            const context = tempDiv.innerText.substring(0, 2000);
                            onGenerateWhatIf(selectedText, context);
                        }
                    },
                    { label: 'Read Selection Aloud', onSelect: () => handleTTSPlay() },
                    { label: 'Copy', onSelect: () => document.execCommand('copy') }
                ]
            });
        }
    }, [activeChapter.content, handleTTSPlay, onGenerateWhatIf]);

    const toolbarContainerClasses = `
        transition-[max-height] duration-300 ease-in-out flex-shrink-0 relative z-20
        ${isFocusMode ? 'max-h-0 overflow-hidden' : 'max-h-40 overflow-visible'}
    `;

    return (
        <div className="flex h-full w-full overflow-hidden antialiased bg-transparent">
            <style>{`
                .editor-content::after { content: ""; display: block; height: 100%; min-height: 100%; break-before: column; -webkit-column-break-before: always; visibility: hidden; }
                .editor-content { hyphens: auto; -webkit-hyphens: auto; }
                @keyframes slide-in-top { 0% { transform: translate(-50%, -100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
                .toast-enter { animation: slide-in-top 0.3s ease-out forwards; }
                .book-spine-effect { position: fixed; top: 0; bottom: 0; left: 50%; width: 40px; margin-left: -20px; background: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.12) 70%, rgba(0,0,0,0) 100%); pointer-events: none; z-index: 5; opacity: 0.5; }
            `}</style>
            
            {notification && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-2 rounded-full shadow-2xl toast-enter flex items-center gap-2 backdrop-blur-md border border-white/10" style={{ backgroundColor: settings.successColor, color: '#FFFFFF' }}>
                    <span className="font-bold text-sm">{notification}</span>
                </div>
            )}

            {/* Main Editing Area */}
            <div className="flex-grow flex flex-col min-w-0 h-full relative">
                <div className="flex-grow relative min-h-0 overflow-hidden">
                    <div id="editorContainer" ref={editorContainerRef} className="absolute inset-0 overflow-x-auto overflow-y-hidden focus:outline-none no-scrollbar" onWheel={handleWheel} onScroll={handleScroll} style={{ overflowAnchor: 'none' }}>
                        {layout.columns === 2 && settings.showBookSpine && <div className="book-spine-effect" />}
                        <div ref={editorRef} contentEditable suppressContentEditableWarning spellCheck={isSpellcheckEnabled} className="editor-content outline-none" style={{ 
                            fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}em`, color: settings.textColor, lineHeight: settings.lineHeight || 1.8, 
                            textAlign: settings.textAlign === 'justify' ? 'justify' : 'left', height: 'calc(100% - 6rem)', columnFill: 'auto', columnGap: `${layout.gap}px`, 
                            columnWidth: `${layout.colWidth}px`, columnCount: layout.columns, boxSizing: 'content-box', width: `${(layout.colWidth * layout.columns) + (layout.gap * (layout.columns - 1))}px`, 
                            paddingTop: '3rem', paddingBottom: '3rem', paddingLeft: `${layout.sideMargin}px`, paddingRight: `${layout.sideMargin}px`, 
                            orphans: 2, widows: 2, opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.15s ease-in-out'
                        }} onInput={handleInput} onKeyDown={handleTTSStop} onContextMenu={handleContextMenu} />
                    </div>
                    <div className="absolute bottom-4 right-8 z-10 text-xs font-sans pointer-events-none select-none backdrop-blur-sm px-2 py-1 rounded" style={{ color: settings.textColor, opacity: 0.5, backgroundColor: settings.toolbarBg ? `${settings.toolbarBg}40` : 'transparent' }}>
                        {layout.columns === 1 ? `Page ${pageInfo.current} / ${pageInfo.total}` : `Pages ${pageInfo.current}-${pageInfo.current + 1} / ${pageInfo.total}`}
                    </div>
                </div>
                <div className={toolbarContainerClasses}>
                    <Toolbar settings={settings} onSettingsChange={onSettingsChange} chapters={chapters} activeChapterId={activeChapterId} onSelectChapter={onActiveChapterIdChange} isSaving={isSaving} activeChapterWordCount={activeChapterWordCount} sessionWordCount={sessionWordCount} writingGoals={writingGoals} onSaveToFolder={handleManualSave} onDownloadRtf={() => { downloadFile('novel.rtf', generateRtfForChapters(chapters), 'application/rtf'); }} isFocusMode={isFocusMode} onToggleFocusMode={onToggleFocusMode} isNotesPanelOpen={isNotesPanelOpen} onToggleNotesPanel={() => setIsNotesPanelOpen(!isNotesPanelOpen)} onToggleModal={(m) => m === 'findReplace' ? setIsFindReplaceOpen(!isFindReplaceOpen) : setActiveModal(m)} isSoundEnabled={isSoundEnabled} onToggleSound={() => onSettingsChange({ isSoundEnabled: !isSoundEnabled })} isFullscreen={isFullscreen} onToggleFullscreen={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} isSinglePageView={false} isSpellcheckEnabled={isSpellcheckEnabled} onToggleSpellcheck={() => setIsSpellcheckEnabled(!isSpellcheckEnabled)} onToggleTransitionStyle={() => onSettingsChange({ transitionStyle: settings.transitionStyle === 'scroll' ? 'fade' : 'scroll' })} hasDirectory={!!directoryHandle} onToggleReadAloud={() => setActiveModal('readAloud')} ttsStatus={ttsStatus} onExportNove={() => {}} onImportNove={() => {}} updateAvailable={!!availableUpdate} />
                </div>
            </div>

            {/* Right-side Notes Panel */}
            {isNotesPanelOpen && (
                <div style={{ width: notesPanelWidth }} className="h-full relative flex-shrink-0">
                    <NotesPanel 
                        settings={settings} 
                        activeChapter={activeChapter} 
                        onChapterDetailsChange={handleChapterDetailsChange} 
                        initialWidth={notesPanelWidth} 
                        onWidthChange={setNotesPanelWidth}
                        allChapters={chapters}
                        allCharacters={characters}
                        generateId={generateId}
                    />
                </div>
            )}

            {/* Modal Components */}
            {isFindReplaceOpen && (
                <FindReplaceModal 
                    onClose={() => setIsFindReplaceOpen(false)} 
                    chapters={chapters} 
                    activeChapterId={activeChapterId} 
                    onNavigateMatch={(res) => {
                        if (res.chapterId !== activeChapterId) onActiveChapterIdChange(res.chapterId);
                    }} 
                    onReplace={() => {}} 
                    onReplaceAll={(f, r, s) => {
                    }}
                    settings={settings} 
                />
            )}
            {activeModal === 'stats' && (
                <StatsDashboardModal 
                    settings={settings} 
                    chapters={chapters} 
                    totalWordCount={totalWordCount} 
                    goals={writingGoals} 
                    onGoalsChange={onWritingGoalsChange} 
                    onClose={() => setActiveModal(null)} 
                />
            )}
            {activeModal === 'shortcuts' && (
                <ShortcutsModal 
                    onClose={() => setActiveModal(null)} 
                    shortcuts={shortcuts} 
                    onUpdateShortcuts={onShortcutsChange} 
                    settings={settings} 
                />
            )}
            {activeModal === 'spellCheck' && (
                <SpellCheckModal 
                    settings={settings} 
                    chapter={activeChapter} 
                    onClose={() => setActiveModal(null)} 
                    onUpdateContent={handleContentChange} 
                />
            )}
            {activeModal === 'userGuide' && (
                <UserGuideModal 
                    settings={settings} 
                    onClose={() => setActiveModal(null)} 
                />
            )}
            {activeModal === 'history' && (
                <VersionHistoryModal 
                    settings={settings} 
                    activeChapter={activeChapter} 
                    directoryHandle={directoryHandle} 
                    onRestore={(content) => {
                        handleContentChange(content);
                        setActiveModal(null);
                    }} 
                    onClose={() => setActiveModal(null)} 
                />
            )}
            {activeModal === 'voiceSettings' && (
                <VoiceSettingsModal 
                    settings={settings} 
                    characters={characters} 
                    onClose={() => {
                        setActiveModal(previousModal);
                        setPreviousModal(null);
                    }} 
                    onSettingsChange={onSettingsChange} 
                />
            )}
            {activeModal === 'readAloud' && (
                <ReadAloudModal 
                    settings={settings} 
                    onClose={() => setActiveModal(null)} 
                    onPlay={handleTTSPlay} 
                    onPause={() => ttsAudioElementRef.current?.pause()} 
                    onStop={handleTTSStop} 
                    onOpenSettings={() => { 
                        setPreviousModal('readAloud'); 
                        setActiveModal('voiceSettings'); 
                    }} 
                    status={ttsStatus} 
                    activeChapterTitle={activeChapter.title} 
                />
            )}
            {activeModal === 'customizeToolbar' && (
                <CustomizeToolbarModal 
                    settings={settings} 
                    currentVisibility={settings.toolbarVisibility || {}} 
                    onSave={(v) => onSettingsChange({ toolbarVisibility: v })} 
                    onClose={() => setActiveModal(null)} 
                    onSaveProject={onSaveToFolder} 
                    hasContent={hasContent} 
                    appUpdate={availableUpdate} 
                />
            )}
            {activeModal === 'designGallery' && (
                <DesignGalleryModal 
                    settings={settings} 
                    onClose={() => setActiveModal(null)} 
                    galleryItems={galleryItems} 
                    onGalleryItemsChange={onGalleryItemsChange} 
                    onSettingsChange={onSettingsChange} 
                />
            )}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    actions={contextMenu.actions}
                    onClose={() => setContextMenu(null)}
                    settings={settings}
                />
            )}
        </div>
    );
};
