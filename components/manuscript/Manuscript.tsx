import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import type { IChapter, EditorSettings, Shortcut, WritingGoals, GalleryItem, INovelState, SearchResult } from '../../types';
import { useDebouncedCallback } from 'use-debounce';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { getAI } from '../../utils/ai';

import { generateRtfForChapters, downloadFile, calculateWordCountFromHtml, decode, exportForNoveli, parseNoveliSync } from '../../utils/manuscriptUtils';
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
import { PlayIcon, PauseIcon, StopIcon, UnfocusIcon } from '../common/Icons';
import { DesignGalleryModal } from './modals/DesignGalleryModal';
import { SpellCheckModal } from './modals/SpellCheckModal';

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

type ModalType = 'shortcuts' | 'stats' | 'customizeToolbar' | 'history' | 'voiceSettings' | 'designGallery' | 'readAloud' | 'spellCheck';
type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// Helper to create a WAV file from raw PCM data so it can be played by HTMLAudioElement
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
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte Rate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // Block Align (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // Bits Per Sample
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

        // Robust initialization for Strict Mode
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        return () => {
            // Robust cleanup
            if (ctx.state !== 'closed') {
                ctx.close().catch(e => console.warn("Failed to close audio context", e));
            }
            audioContextRef.current = null;
        };
    }, [enabled]);

    const play = useCallback((type: 'key' | 'enter' = 'key') => {
        const ctx = audioContextRef.current;
        if (!enabled || !ctx) return;
        
        const vol = volume;

        // Auto-resume if suspended (browser policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn("Audio resume failed", e));
        }
        
        const t = ctx.currentTime;

        if (type === 'enter') {
            // Synthesis for Enter Thud
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(2000, t);
            gain1.gain.setValueAtTime(0, t);
            gain1.gain.linearRampToValueAtTime(0.04 * vol, t + 0.01);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.start(t); osc1.stop(t + 1.5);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(5200, t);
            gain2.gain.setValueAtTime(0, t);
            gain2.gain.linearRampToValueAtTime(0.02 * vol, t + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.start(t); osc2.stop(t + 0.8);

            // Noise burst
            if (!enterThudBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.05;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
                enterThudBufferRef.current = buffer;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = enterThudBufferRef.current;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 600;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.02 * vol, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
            noise.start(t);
        } else {
            // Synthesis for Key Click
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            if (!keyClickBufferRef.current) {
                const bufferSize = ctx.sampleRate * 0.05;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                keyClickBufferRef.current = buffer;
            }
            const src = ctx.createBufferSource();
            src.buffer = keyClickBufferRef.current;
            filter.type = 'bandpass';
            filter.frequency.value = 2500;
            filter.Q.value = 1.5;
            gain.gain.setValueAtTime(0.15 * vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
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
    const [previousModal, setPreviousModal] = useState<ModalType | null>(null); // Track history for back navigation
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false); // Managed separately to be non-modal
    
    const [isSaving, setIsSaving] = useState(isSavingProp);
    const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [sessionWordCount, setSessionWordCount] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isToolbarAnimating, setIsToolbarAnimating] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    
    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actions: { label: string; onSelect: () => void }[] } | null>(null);

    // Page Info State
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
    
    // TTS State
    const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
    const ttsAudioElementRef = useRef<HTMLAudioElement | null>(null);
    
    // Audio Context for Typewriter Sounds - now handled by hook
    // Use persistent setting
    const isSoundEnabled = settings.isSoundEnabled || false;
    const playTypewriterSound = useTypewriterSound(isSoundEnabled, settings.soundVolume);

    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const initialTotalWordCountRef = useRef<number | null>(null);
    const savedSelectionRange = useRef<Range | null>(null);
    const noveliImportInputRef = useRef<HTMLInputElement>(null);
    const isLocalUpdate = useRef(false);
    
    // Search Pending Ref
    const pendingSearchRef = useRef<SearchResult | null>(null);
    
    // Scroll Stability Refs
    const isTyping = useRef(false);
    const stableScrollLeft = useRef(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Layout Geometry - MAXIMIZED LANDSCAPE SETTINGS
    const GAP_PX = 60; 
    const SIDE_MARGIN_PX = 40;
    const [layout, setLayout] = useState({ colWidth: 0, stride: 0, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns: 2 });

    const handleChapterDetailsChange = useCallback((id: string, updates: Partial<IChapter>) => {
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
    }, [dispatch]);

    const handleContentChange = useCallback((newContent: string) => {
        handleChapterDetailsChange(activeChapterId, { content: newContent });
    }, [activeChapterId, handleChapterDetailsChange]);

    useEffect(() => {
        setIsSaving(isSavingProp);
    }, [isSavingProp]);

    const activeChapter = useMemo(() => chapters.find(ch => ch.id === activeChapterId) ?? chapters[0], [chapters, activeChapterId]);
    
    const shortcutsMap = useMemo(() => {
        const map = new Map<string, string>();
        shortcuts.forEach(s => map.set(s.key, s.value));
        return map;
    }, [shortcuts]);

    const activeChapterWordCount = useMemo(() => {
        if (activeChapter.wordCount !== undefined) return activeChapter.wordCount;
        return calculateWordCountFromHtml(activeChapter.content);
    }, [activeChapter.content, activeChapter.wordCount]);
    
    const totalWordCount = useMemo(() => {
        return chapters.reduce((acc, chapter) => {
            const count = chapter.wordCount !== undefined ? chapter.wordCount : calculateWordCountFromHtml(chapter.content);
            return acc + count;
        }, 0);
    }, [chapters]);

    const hasContent = useMemo(() => {
        if (chapters.length > 1) return true;
        // Check chapter 1 for content
        const c1 = chapters[0];
        if (!c1) return false;
        if (c1.content.length > 30) return true; // arbitrary simple length check
        return false;
    }, [chapters]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (initialTotalWordCountRef.current === null) {
            initialTotalWordCountRef.current = totalWordCount;
        }
        const sessionCount = totalWordCount - (initialTotalWordCountRef.current || 0);
        setSessionWordCount(sessionCount);
    }, [totalWordCount]);

    useEffect(() => {
        document.execCommand('defaultParagraphSeparator', false, 'div');
    }, []);

    // --- Save Handler ---
    const handleManualSave = useCallback(async () => {
        if (isSaving) return;
        
        const success = await onSaveToFolder();
        
        if (success) {
            const now = new Date();
            const d = String(now.getDate()).padStart(2, '0');
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            
            setNotification(`Project Saved [${d}/${m} ${h}:${min}]`);
            setTimeout(() => setNotification(null), 3000);
        }
    }, [isSaving, onSaveToFolder]);

    // --- Keyboard Shortcut for Save ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleManualSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleManualSave]);


    // --- Selection Persistence Logic ---
    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
            savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
        } else {
            savedSelectionRange.current = null;
        }
    }, []);

    const restoreSelection = useCallback(() => {
        if (savedSelectionRange.current && editorRef.current) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(savedSelectionRange.current);
                if (document.activeElement !== editorRef.current) {
                    editorRef.current.focus();
                }
            }
            savedSelectionRange.current = null;
        }
    }, []);

    const handleToggleNotesPanel = useCallback(() => {
        saveSelection();
        setIsNotesPanelOpen(prev => !prev);
    }, [saveSelection]);

    // --- Find and Replace Protocols ---

    const highlightTextInEditor = useCallback((index: number, length: number) => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        
        // Use a TreeWalker to find the text node at index
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let currentIndex = 0;
        let node: Node | null = null;
        
        while(node = walker.nextNode()) {
            const nodeLen = node.textContent?.length || 0;
            if (currentIndex + nodeLen > index) {
                // Found the start node
                const startOffset = index - currentIndex;
                const range = document.createRange();
                
                // Handling matches that span multiple nodes is complex. 
                // For this implementation, we assume the match is within the node or we select to end of node.
                // A more robust implementation would traverse subsequent nodes.
                const endOffset = Math.min(startOffset + length, nodeLen); 
                
                range.setStart(node, startOffset);
                range.setEnd(node, endOffset);
                
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                    
                    // Scroll into view
                    const rect = range.getBoundingClientRect();
                    const container = editorContainerRef.current;
                    if (container && rect) {
                        const relativeX = rect.left - container.getBoundingClientRect().left + container.scrollLeft;
                        // Calculate spread
                        const targetSpread = Math.floor(Math.max(0, relativeX - layout.sideMargin) / layout.stride);
                        container.scrollTo({ left: targetSpread * layout.stride, behavior: 'smooth' });
                    }
                }
                return;
            }
            currentIndex += nodeLen;
        }
    }, [layout]);

    // Handle Pending Search after Chapter Load
    useEffect(() => {
        if (pendingSearchRef.current && pendingSearchRef.current.chapterId === activeChapterId) {
            // Slight delay to allow DOM render
            setTimeout(() => {
                if (pendingSearchRef.current) {
                    highlightTextInEditor(pendingSearchRef.current.index, pendingSearchRef.current.length);
                    pendingSearchRef.current = null;
                }
            }, 200);
        }
    }, [activeChapterId, activeChapter.content, highlightTextInEditor]);

    const handleNavigateMatch = useCallback(async (result: SearchResult) => {
        if (result.chapterId !== activeChapterId) {
            // Data Integrity Protocol: Force Save before switching
            setIsSaving(true);
            setNotification("Saving before navigation...");
            await onSaveToFolder();
            setIsSaving(false);
            setNotification(null);
            
            pendingSearchRef.current = result;
            onActiveChapterIdChange(result.chapterId);
        } else {
            highlightTextInEditor(result.index, result.length);
        }
    }, [activeChapterId, onSaveToFolder, onActiveChapterIdChange, highlightTextInEditor]);

    const handleFindReplaceUpdate = (result: SearchResult, newText: string) => {
        // Only works for current chapter for now to be safe
        if (result.chapterId !== activeChapterId) {
            handleNavigateMatch(result); // Switch to it first
            return;
        }
        
        // Simple replace for now - replace the specific occurrence? 
        // Or re-run find on content string.
        // For robustness, since we have index, we could try string manipulation, but HTML makes it hard.
        // We will stick to global replace for the context or a unique identifier approach if possible.
        // Fallback: Use string replacement on content.
        
        // Create regex from context to locate unique spot (risky) or just the word.
        // Let's use the Selection Range if it is highlighted
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString() === result.context.substring(result.context.length/2 - result.length/2, result.context.length/2 + result.length/2)) { // Basic check
             document.execCommand('insertText', false, newText);
        } else {
             // Fallback: Global replace of text (risky for duplicates)
             // or precise replacement if we had exact HTML offset.
             // We'll trust the user to have navigated to it and highlighted it via handleNavigateMatch.
             // If highlighted:
             document.execCommand('insertText', false, newText);
        }
    };

    const handleGlobalReplace = (find: string, replace: string, scope: 'chapter' | 'manuscript') => {
        const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        
        if (scope === 'chapter') {
             const newContent = activeChapter.content.replace(regex, replace);
             handleChapterDetailsChange(activeChapter.id, { content: newContent });
        } else {
             // Iterate all chapters
             chapters.forEach(ch => {
                 if (ch.content.match(regex)) {
                     const newContent = ch.content.replace(regex, replace);
                     dispatch({ type: 'UPDATE_CHAPTER', payload: { id: ch.id, updates: { content: newContent } } });
                 }
             });
             alert("Global replace complete.");
        }
    };


    // --- Context Menu Logic ---
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
            return; 
        }

        e.preventDefault();
        const text = selection.toString();
        let context = text;
        if (selection.anchorNode && selection.anchorNode.parentElement) {
            context = selection.anchorNode.parentElement.innerText.substring(0, 1000); 
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            actions: [
                {
                    label: '🔮 What If? (Brainstorm Alternatives)',
                    onSelect: () => onGenerateWhatIf(text, context)
                }
            ]
        });
    }, [onGenerateWhatIf]);


    // --- Layout & Geometry Engine ---

    const calculateLayout = useCallback(() => {
        if (!editorContainerRef.current) return;
        
        const containerWidth = editorContainerRef.current.clientWidth;
        const minTwoPageColWidth = 450;
        const availableWidthTwo = Math.max(0, containerWidth - GAP_PX - (2 * SIDE_MARGIN_PX));
        const safeColWidthTwo = Math.floor(availableWidthTwo / 2);
        
        let columns = 2;
        let colWidth = safeColWidthTwo;

        if (safeColWidthTwo < minTwoPageColWidth) {
            columns = 1;
            const availableWidthOne = Math.max(0, containerWidth - (2 * SIDE_MARGIN_PX));
            colWidth = Math.floor(availableWidthOne);
        }
        
        const stride = colWidth + GAP_PX;

        setLayout({ colWidth, stride, gap: GAP_PX, sideMargin: SIDE_MARGIN_PX, columns });
        
        const scrollLeft = editorContainerRef.current.scrollLeft;
        
        // Spread Counting Logic
        const currentColumnIndex = stride > 0 ? Math.round(scrollLeft / stride) : 0;
        const contentWidth = editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX);
        const totalColumns = stride > 0 ? Math.ceil((contentWidth + GAP_PX) / stride) : 1;

        // User Requirements:
        // 1. Page readout must be "Page X and Y of Z" (where Z is total page count).
        // 2. Total page count is 1 less than actual count (due to spacer), but minimum 2.
        const actualPageCount = Math.max(2, totalColumns - 1);
        const currentLeftPage = currentColumnIndex + 1;

        setPageInfo({ current: currentLeftPage, total: actualPageCount });

    }, []);

    useLayoutEffect(() => {
        const timer = setTimeout(() => {
            calculateLayout();
            if (editorContainerRef.current && layout.stride > 0) {
                const currentScroll = editorContainerRef.current.scrollLeft;
                const nearestSpread = Math.round(currentScroll / layout.stride);
                editorContainerRef.current.scrollTo({ left: nearestSpread * layout.stride });
            }
            restoreSelection();
        }, 10);
        
        window.addEventListener('resize', calculateLayout);
        return () => {
            window.removeEventListener('resize', calculateLayout);
            clearTimeout(timer);
        };
    }, [calculateLayout, isNotesPanelOpen, notesPanelWidth, isFocusMode, settings.fontSize, settings.fontFamily, restoreSelection, isVisible]);

    // --- Discrete Scroll & Snap Logic ---

    const snapToSpread = useCallback((targetSpreadIndex: number, useTransition: boolean = true) => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        
        // Ensure we can scroll to the spacer if needed
        const contentWidth = editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX);
        const totalColumns = Math.ceil((contentWidth + GAP_PX) / layout.stride);
        const totalSpreads = totalColumns; // Allow scrolling to the very end
        const clampedIndex = Math.max(0, Math.min(targetSpreadIndex, totalSpreads));

        const targetScrollLeft = clampedIndex * layout.stride;
        
        if (Math.abs(editorContainerRef.current.scrollLeft - targetScrollLeft) < 2) return;

        if (settings.transitionStyle === 'fade' && useTransition) {
            setIsTransitioning(true);
            setTimeout(() => {
                if (editorContainerRef.current) {
                    editorContainerRef.current.scrollTo({
                        left: targetScrollLeft,
                        behavior: 'instant'
                    });
                }
                requestAnimationFrame(() => {
                    setIsTransitioning(false);
                });
            }, 150); 
        } else {
            editorContainerRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: useTransition ? 'smooth' : 'instant'
            });
        }
    }, [layout, settings.transitionStyle, GAP_PX, SIDE_MARGIN_PX]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!editorContainerRef.current || layout.stride === 0) return;

        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            
            const currentScroll = editorContainerRef.current.scrollLeft;
            const currentSpreadIndex = Math.round(currentScroll / layout.stride);
            
            if (Math.abs(e.deltaY) > 20) {
                const direction = Math.sign(e.deltaY);
                const nextSpreadIndex = Math.max(0, currentSpreadIndex + direction);
                snapToSpread(nextSpreadIndex, true);
            }
        }
    }, [layout, snapToSpread]);

    // Move updatePageInfo up to be accessible by handleScroll
    const updatePageInfo = useCallback(() => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        
        const scrollLeft = editorContainerRef.current.scrollLeft;
        const currentColumnIndex = Math.round(scrollLeft / layout.stride);
        const contentWidth = editorContainerRef.current.scrollWidth - (2 * SIDE_MARGIN_PX);
        const totalColumns = Math.ceil((contentWidth + GAP_PX) / layout.stride);

        // Updated Logic per user requirements
        const actualPageCount = Math.max(2, totalColumns - 1);
        const currentLeftPage = currentColumnIndex + 1;
        
        setPageInfo({ current: currentLeftPage, total: actualPageCount });
    }, [layout, GAP_PX, SIDE_MARGIN_PX]);

    const handleScroll = useDebouncedCallback(() => {
        if (!editorContainerRef.current || layout.stride === 0) return;
        
        updatePageInfo();

        // Only snap if we are not currently typing to avoid fighting with scroll lock
        if (!isTyping.current) {
            const currentScroll = editorContainerRef.current.scrollLeft;
            const nearestSpread = Math.round(currentScroll / layout.stride);
            snapToSpread(nearestSpread, false);
        }
    }, 150);

    // --- Aggressive Scroll Locking for Input ---
    
    useEffect(() => {
        const container = editorContainerRef.current;
        if (!container) return;

        const handleNativeScroll = () => {
            if (isTyping.current) {
                // If the user is typing, we strictly enforce the scroll position
                const diff = Math.abs(container.scrollLeft - stableScrollLeft.current);
                if (diff > 5) { 
                    container.scrollLeft = stableScrollLeft.current;
                }
            } else {
                // If not typing, this is a valid user scroll. Update stable reference.
                stableScrollLeft.current = container.scrollLeft;
            }
        };

        // Passive: false is required to potentially interfere with scroll (though scroll is non-cancellable, property assignment works)
        container.addEventListener('scroll', handleNativeScroll, { passive: false });
        return () => container.removeEventListener('scroll', handleNativeScroll);
    }, []);


    // --- Caret Visibility Enforcement ---

    const checkAndEnforceCaretVisibility = useCallback(() => {
        const container = editorContainerRef.current;
        const editor = editorRef.current;
        
        if (document.activeElement !== editor && !editor?.contains(document.activeElement as Node)) return;

        const selection = window.getSelection();

        if (!container || !editor || !selection || selection.rangeCount === 0 || layout.stride === 0) return;

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) return;

        const caretRect = range.getBoundingClientRect();
        if (caretRect.width === 0 && caretRect.height === 0 && caretRect.x === 0 && caretRect.y === 0) return;

        const containerRect = container.getBoundingClientRect();
        const relativeCaretX = (caretRect.left - containerRect.left) + container.scrollLeft;
        const adjustedCaretX = Math.max(0, relativeCaretX - layout.sideMargin);
        const columnIndex = Math.floor(adjustedCaretX / layout.stride);
        const currentScrollIndex = Math.round(container.scrollLeft / layout.stride);
        
        if (columnIndex >= currentScrollIndex + layout.columns) {
            snapToSpread(columnIndex - (layout.columns - 1), false);
        } else if (columnIndex < currentScrollIndex) {
            snapToSpread(columnIndex, false);
        }
        
        updatePageInfo();

    }, [layout, snapToSpread, updatePageInfo]);

    const handleBeforeInput = useCallback(() => {
        if (editorContainerRef.current && layout.stride > 0) {
            isTyping.current = true;
            // SNAP: Ensure the baseline we lock to is a perfect spread multiple
            const currentScroll = editorContainerRef.current.scrollLeft;
            const nearestSpread = Math.round(currentScroll / layout.stride);
            stableScrollLeft.current = nearestSpread * layout.stride;
            
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    }, [layout.stride]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        isLocalUpdate.current = true;
        const editor = e.currentTarget;
        
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            const offset = range.startOffset;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const textContent = node.textContent || '';
                const nativeEvent = e.nativeEvent as InputEvent;
                const insertedChar = nativeEvent?.data;

                if (nativeEvent?.inputType === 'insertText') {
                    if (insertedChar === '"' || insertedChar === "'") {
                        const textBefore = textContent.substring(0, offset - 1);
                        const charBefore = textBefore.slice(-1);
                        const isOpenQuoteCondition = textBefore.length === 0 || /[\s(\[{“‘]/.test(charBefore);
                        let replacementChar = insertedChar === '"' ? (isOpenQuoteCondition ? '“' : '”') : (isOpenQuoteCondition ? '‘' : '’');
                        if (replacementChar) {
                            node.textContent = textContent.substring(0, offset - 1) + replacementChar + textContent.substring(offset);
                            const newRange = document.createRange();
                            newRange.setStart(node, offset);
                            newRange.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                        }
                    } else if (insertedChar === ' ') {
                        const textBeforeSpace = textContent.substring(0, offset - 1);
                        const lastWord = textBeforeSpace.split(/[\s\xA0]+/).pop();
                        if (lastWord && shortcutsMap.has(lastWord)) {
                            const expansion = shortcutsMap.get(lastWord)!;
                            const startIndex = offset - 1 - lastWord.length;
                            if (startIndex >= 0) {
                                node.textContent = textContent.substring(0, startIndex) + expansion + textContent.substring(offset - 1);
                                const newRange = document.createRange();
                                newRange.setStart(node, startIndex + expansion.length + 1);
                                newRange.collapse(true);
                                sel.removeAllRanges();
                                sel.addRange(newRange);
                            }
                        }
                    }
                }
            }
        }
        handleContentChange(editor.innerHTML);

        // Immediate Caret Check for Page Turns
        // We do this synchronously to update stableScrollLeft before the next scroll event tries to revert it
        if (sel && sel.rangeCount > 0 && editorContainerRef.current && layout.stride > 0) {
             const range = sel.getRangeAt(0);
             if (editorRef.current?.contains(range.commonAncestorContainer)) {
                 const caretRect = range.getBoundingClientRect();
                 const containerRect = editorContainerRef.current.getBoundingClientRect();
                 
                 // Valid caret?
                 if (caretRect.width !== 0 || caretRect.height !== 0 || caretRect.x !== 0) {
                     const relativeCaretX = (caretRect.left - containerRect.left) + editorContainerRef.current.scrollLeft;
                     const adjustedCaretX = Math.max(0, relativeCaretX - layout.sideMargin);
                     const columnIndex = Math.floor(adjustedCaretX / layout.stride);
                     
                     const currentScrollIndex = Math.round(stableScrollLeft.current / layout.stride);
                     
                     let targetSpread = currentScrollIndex;
                     
                     // If caret is ahead of view
                     if (columnIndex >= currentScrollIndex + layout.columns) {
                         targetSpread = columnIndex - (layout.columns - 1);
                     } 
                     // If caret is behind view
                     else if (columnIndex < currentScrollIndex) {
                         targetSpread = columnIndex;
                     }
                     
                     const targetScrollLeft = targetSpread * layout.stride;
                     
                     if (targetScrollLeft !== stableScrollLeft.current) {
                         stableScrollLeft.current = targetScrollLeft;
                         editorContainerRef.current.scrollLeft = targetScrollLeft;
                     }
                 }
             }
        }
    }, [handleContentChange, shortcutsMap, layout]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        // Redundant backup to handleBeforeInput for key-based changes (e.g. Backspace)
        if (editorContainerRef.current && layout.stride > 0) {
            isTyping.current = true;
            const currentScroll = editorContainerRef.current.scrollLeft;
            const nearestSpread = Math.round(currentScroll / layout.stride);
            stableScrollLeft.current = nearestSpread * layout.stride;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }

        // Backspace: Indentation Removal at Start of Paragraph
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const node = range.startContainer;
                // Find parent div (paragraph)
                let p = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
                while (p && p.nodeName !== 'DIV' && p.parentElement !== e.currentTarget) {
                    p = p.parentElement;
                }

                if (p && p.parentElement === e.currentTarget) {
                    // Check if caret is at the start of the block
                    // For text nodes: must be offset 0 and be the first text node (or first relevant child)
                    // For element nodes (empty paragraph <br>): startOffset is usually 0
                    const isAtStart = (range.startOffset === 0) && (node === p || node === p.firstChild || (node.parentNode === p && node === p.firstChild));

                    if (isAtStart) {
                        // Check indentation state. 
                        // Default CSS applies indent. Inline style text-indent: '0px' removes it.
                        // If it is NOT explicitly '0px', it is indented. We want to remove indent.
                        if (!p.style.textIndent || p.style.textIndent !== '0px') {
                            e.preventDefault();
                            p.style.textIndent = '0px';
                            // Trigger content change update
                            handleContentChange(e.currentTarget.innerHTML);
                            return; 
                        }
                        // If it IS '0px', we let default Backspace happen (merge lines).
                    }
                }
            }
        }

        // Enter: Force new paragraph to have default indentation (remove 0px override)
        if (e.key === 'Enter') {
            e.preventDefault();
            // Standardize paragraph creation
            document.execCommand('insertParagraph', false);
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let node = selection.anchorNode;
                // Walk up to find the block element (DIV)
                while (node && (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'DIV') && node.parentNode !== e.currentTarget) {
                    node = node.parentNode;
                }
                
                // If we found a paragraph div and it has the un-indent style, remove it
                if (node && node.nodeName === 'DIV' && (node as HTMLElement).style.textIndent === '0px') {
                    (node as HTMLElement).style.removeProperty('text-indent');
                    // Clean up empty style attribute
                    if (!(node as HTMLElement).getAttribute('style')) {
                        (node as HTMLElement).removeAttribute('style');
                    }
                }
            }
            
            playTypewriterSound('enter');
            handleContentChange(e.currentTarget.innerHTML);
            setTimeout(checkAndEnforceCaretVisibility, 10);
            return;
        }

        if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
            if (e.key === 'Enter') {
                playTypewriterSound('enter');
            } else {
                playTypewriterSound('key');
            }
        }

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            setTimeout(checkAndEnforceCaretVisibility, 10);
        }

        if (e.key === 'PageDown') {
            e.preventDefault();
            const currentScroll = editorContainerRef.current?.scrollLeft || 0;
            const currentSpread = Math.round(currentScroll / layout.stride);
            snapToSpread(currentSpread + 1, true);
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            const currentScroll = editorContainerRef.current?.scrollLeft || 0;
            const currentSpread = Math.round(currentScroll / layout.stride);
            snapToSpread(currentSpread - 1, true);
        }
    }, [checkAndEnforceCaretVisibility, layout, snapToSpread, playTypewriterSound, handleContentChange]);

    const handleKeyUp = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTyping.current = false;
            // Update stable scroll to where we ended up, just in case
            if (editorContainerRef.current && layout.stride > 0) {
                const currentScroll = editorContainerRef.current.scrollLeft;
                const nearestSpread = Math.round(currentScroll / layout.stride);
                stableScrollLeft.current = nearestSpread * layout.stride;
            }
        }, 150);
    }, [layout.stride]);

    const handleClick = useCallback(() => {
        setTimeout(checkAndEnforceCaretVisibility, 10);
    }, [checkAndEnforceCaretVisibility]);

    // --- TTS Handlers ---
    
    useEffect(() => {
        if (ttsAudioElementRef.current) {
            if (settings.ttsSpeed) ttsAudioElementRef.current.playbackRate = settings.ttsSpeed;
            if (settings.ttsVolume !== undefined) ttsAudioElementRef.current.volume = settings.ttsVolume;
        }
    }, [settings.ttsSpeed, settings.ttsVolume]);

    const handleTTSPlay = useCallback(async () => {
        if (ttsStatus === 'loading') return;

        if (ttsStatus === 'paused' && ttsAudioElementRef.current) {
            ttsAudioElementRef.current.play();
            setTtsStatus('playing');
            return;
        }
        
        setTtsStatus('loading');

        const selection = window.getSelection();
        let textToRead = '';
        
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
             textToRead = selection.toString();
        } else {
             const div = document.createElement('div');
             div.innerHTML = activeChapter.content;
             textToRead = div.innerText;
        }

        if (!textToRead.trim()) {
            setTtsStatus('idle');
            return;
        }

        try {
            const accentInstruction = settings.ttsAccent === 'en-GB' ? 'British' : 'American';
            const promptText = `Please read the following text with a ${accentInstruction} accent and appropriate emotion:\n\n${textToRead}`;
            
            const response = await getAI().models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: promptText }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: settings.narratorVoice || 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received from AI.");

            if (ttsAudioElementRef.current) {
                ttsAudioElementRef.current.pause();
                ttsAudioElementRef.current = null;
            }

            const bytes = decode(base64Audio);
            const wavUrl = createWavUrl(bytes, 24000);
            const audio = new Audio(wavUrl);
            
            audio.playbackRate = settings.ttsSpeed || 1.0;
            audio.volume = settings.ttsVolume ?? 1.0;
            audio.preservesPitch = true;
            audio.onended = () => setTtsStatus('idle');
            audio.onerror = (e) => { console.error("Audio playback error", e); setTtsStatus('error'); };
            
            await audio.play();
            ttsAudioElementRef.current = audio;
            setTtsStatus('playing');

        } catch (e) {
            console.error("TTS Error:", e);
            setTtsStatus('error');
        }
    }, [activeChapter.content, ttsStatus, settings.narratorVoice, settings.ttsAccent, settings.ttsSpeed, settings.ttsVolume]);

    const handleTTSPause = useCallback(() => {
        if (ttsAudioElementRef.current) {
            ttsAudioElementRef.current.pause();
            setTtsStatus('paused');
        }
    }, []);

    const handleTTSStop = useCallback(() => {
        if (ttsAudioElementRef.current) {
            ttsAudioElementRef.current.pause();
            ttsAudioElementRef.current = null;
        }
        setTtsStatus('idle');
    }, []);

    const handleOpenTTSModal = useCallback(() => {
        setActiveModal('readAloud');
    }, []);

    useEffect(() => {
        return () => {
            if (ttsAudioElementRef.current) {
                ttsAudioElementRef.current.pause();
                ttsAudioElementRef.current = null;
            }
        };
    }, []);

    useLayoutEffect(() => {
        // Optimized: Only update innerHTML if different.
        // Also capture local status before potentially resetting it.
        const wasLocal = isLocalUpdate.current;

        if (editorRef.current && activeChapter.content && editorRef.current.innerHTML !== activeChapter.content) {
            // Only update if it's not a local input event to prevent cursor jumping
            if (!wasLocal) {
                editorRef.current.innerHTML = activeChapter.content;
            }
        }
        
        // Reset flag
        isLocalUpdate.current = false;

        // CRITICAL OPTIMIZATION:
        // Do NOT recalculate layout on local updates (typing).
        // The browser handles text reflow within existing columns automatically.
        // Forcing a layout calculation reads DOM properties (e.g. clientWidth), forcing a synchronous reflow
        // which fights with the browser's scroll anchoring during rapid typing.
        if (!wasLocal) {
            calculateLayout();
        }
    }, [activeChapter.id, activeChapter.content, calculateLayout]);

    // --- Noveli Logic ---
    const handleExportNoveli = useCallback(async () => {
        await exportForNoveli(fullState, settings, writingGoals);
    }, [fullState, settings, writingGoals]);

    const processImport = async (file: File) => {
        try {
            const result = await parseNoveliSync(file);
            if (result && result.state && result.state.chapters) {
                const newState = result.state;
                
                const existingIds = new Set(fullState.chapters.map(c => c.id));

                // 1. Update existing chapters
                const updatedChapters = fullState.chapters.map(existing => {
                    const incoming = newState.chapters.find(c => c.id === existing.id);
                    if (incoming) {
                        return { ...existing, ...incoming };
                    }
                    return existing;
                });

                // 2. Identify new chapters created in Noveli
                const newChapters = newState.chapters
                    .filter(c => !existingIds.has(c.id))
                    .map(c => ({
                        // Provide sensible defaults for fields Noveli might not have set
                        notes: '',
                        rawNotes: '',
                        summary: '',
                        outline: '',
                        analysis: '',
                        tagline: '',
                        keywords: [],
                        location: '',
                        conflict: '',
                        chapterGoal: '',
                        characterIds: [],
                        linkedSnippetIds: [],
                        imageColor: '#6b7280',
                        accentStyle: 'left-top-ingress' as const,
                        ...c
                    }));

                // 3. Merge and Sort
                const finalChapters = [...updatedChapters, ...newChapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

                dispatch({ type: 'SET_CHAPTERS', payload: finalChapters });
                
                if (result.settings) {
                    await onSettingsChange(result.settings);
                }

                const newCount = newChapters.length;
                alert(`Import successful! ${newCount > 0 ? `${newCount} new chapter(s) added.` : 'Chapters updated.'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to import Noveli sync file.");
        } finally {
            if (noveliImportInputRef.current) noveliImportInputRef.current.value = '';
        }
    };

    const handleImportNoveliClick = useCallback(async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // Electron Path: Use native dialog for improved access and validation
            try {
                // @ts-ignore
                const result = await window.electronAPI.importNoveliFile();
                if (!result) return; // User canceled

                // Check for warning from main process
                if (result.warning) {
                    const proceed = window.confirm(`${result.warning}\n\nDo you still want to import this older file?`);
                    if (!proceed) return;
                }

                // Convert Node Buffer to File for existing parser logic
                const file = new File([result.content], result.name, { type: 'application/zip' });
                await processImport(file);

            } catch (e) {
                console.error("Electron import error:", e);
                alert("Failed to import file via Electron.");
            }
        } else {
            // Web Path: Fallback to standard input
            noveliImportInputRef.current?.click();
        }
    }, [fullState.chapters, dispatch, onSettingsChange]);

    // Standard HTML input handler (fallback for web)
    const handleImportNoveliFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processImport(file);
    }, [fullState.chapters, dispatch, onSettingsChange]);


    const exactContentWidth = layout.colWidth > 0 
        ? (layout.colWidth * layout.columns) + (layout.gap * (layout.columns - 1)) 
        : '100%';

    const editorStyle: React.CSSProperties = {
        fontFamily: settings.fontFamily,
        fontSize: `${settings.fontSize}em`,
        color: settings.textColor,
        lineHeight: settings.lineHeight || 1.8,
        textAlign: settings.textAlign === 'justify' ? 'justify' : 'left',
        hyphens: settings.textAlign === 'justify' ? 'auto' : 'manual',
        WebkitHyphens: settings.textAlign === 'justify' ? 'auto' : 'manual',
        height: 'calc(100% - 6rem)', // Subtract top/bottom padding (3rem + 3rem) from height to prevent overflow
        columnFill: 'auto',
        columnGap: `${layout.gap}px`,
        columnWidth: `${layout.colWidth}px`,
        columnCount: layout.columns,
        boxSizing: 'content-box',
        width: typeof exactContentWidth === 'number' ? `${exactContentWidth}px` : exactContentWidth,
        paddingTop: '3rem',
        paddingBottom: '3rem',
        paddingLeft: `${layout.sideMargin}px`, 
        paddingRight: `${layout.sideMargin}px`, 
        orphans: 2,
        widows: 2,
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.15s ease-in-out',
        // Force GPU layer to help with painting issues during scroll/reflow
        transform: 'translateZ(0)'
    };

    // Toolbar visibility logic to allow popups but keep animation
    useEffect(() => {
        setIsToolbarAnimating(true);
        const timer = setTimeout(() => setIsToolbarAnimating(false), 300);
        return () => clearTimeout(timer);
    }, [isFocusMode]);

    const toolbarContainerClasses = `
        transition-[max-height] duration-300 ease-in-out flex-shrink-0 relative z-20
        ${isFocusMode ? 'max-h-0 overflow-hidden' : 'max-h-40'}
        ${!isFocusMode && isToolbarAnimating ? 'overflow-hidden' : ''}
        ${!isFocusMode && !isToolbarAnimating ? 'overflow-visible' : ''}
    `;

    return (
        <div className="flex h-full overflow-hidden antialiased" style={{ backgroundColor: "transparent" }}>
            <input 
                type="file" 
                accept=".json,.zip" 
                ref={noveliImportInputRef} 
                onChange={handleImportNoveliFile} 
                className="hidden" 
            />
            <style>{`
                .editor-content::after {
                    content: "";
                    display: block;
                    height: 100%;
                    min-height: 100%;
                    break-before: column;
                    -webkit-column-break-before: always;
                    visibility: hidden;
                }
                @keyframes slide-in-top {
                    0% { transform: translate(-50%, -100%); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
                .toast-enter {
                    animation: slide-in-top 0.3s ease-out forwards;
                }
                /* Spine Effect for 2-column mode */
                .book-spine-effect {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    left: 50%;
                    width: 60px; /* Width of the gutter */
                    margin-left: -30px; /* Center it */
                    background: linear-gradient(to right, 
                        rgba(0,0,0,0) 0%, 
                        rgba(0,0,0,0.15) 35%, 
                        rgba(0,0,0,0.3) 50%, 
                        rgba(0,0,0,0.15) 65%, 
                        rgba(0,0,0,0) 100%
                    );
                    pointer-events: none;
                    z-index: 5;
                    opacity: 0.6;
                }
            `}</style>
            
            {/* Toast Notification */}
            {notification && (
                <div 
                    className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-2 rounded-full shadow-xl toast-enter flex items-center gap-2 backdrop-blur-md border border-white/20"
                    style={{ backgroundColor: settings.successColor, color: '#FFFFFF' }}
                >
                    <span className="font-bold text-sm">{notification}</span>
                </div>
            )}

            <div className="flex-grow flex flex-col min-w-0 h-full relative">
                {/* Editor Viewport */}
                <div className="flex-grow relative min-h-0 overflow-hidden">
                    <div 
                        id="editorContainer" 
                        ref={editorContainerRef}
                        className="absolute inset-0 overflow-x-auto overflow-y-hidden focus:outline-none"
                        onWheel={handleWheel}
                        onScroll={handleScroll}
                        onClick={handleClick}
                        onKeyUp={handleKeyUp}
                        style={{ overflowAnchor: 'none' }} 
                    >
                        {/* Book Spine Visualization (Only show in 2-column mode AND if enabled) */}
                        {layout.columns === 2 && (settings.showBookSpine !== false) && <div className="book-spine-effect" />}

                        <div 
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={isSpellcheckEnabled}
                            lang="en"
                            data-gramm="false"
                            data-gramm_editor="false"
                            data-enable-grammarly="false"
                            className="editor-content outline-none"
                            style={editorStyle}
                            onBeforeInput={handleBeforeInput}
                            onInput={handleInput}
                            onKeyDown={handleKeyDown}
                            onBlur={checkAndEnforceCaretVisibility}
                            onContextMenu={handleContextMenu}
                        />
                    </div>

                    {/* NEW: Leave Focus Mode Button */}
                    {isFocusMode && (
                        <button
                            onClick={onToggleFocusMode}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full transition-all duration-300 backdrop-blur-[2px] opacity-50 hover:opacity-100"
                            style={{ 
                                backgroundColor: settings.toolbarBg ? `${settings.toolbarBg}40` : 'rgba(0,0,0,0.2)', 
                                color: settings.toolbarText || '#FFF'
                            }}
                            title="Exit Focus Mode"
                        >
                            <UnfocusIcon />
                        </button>
                    )}

                    {/* Floating TTS Controls */}
                    {(ttsStatus === 'playing' || ttsStatus === 'paused') && activeModal !== 'readAloud' && (
                        <div 
                            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 rounded-full shadow-lg flex items-center px-3 py-2 gap-3 border backdrop-blur-md transition-all duration-300 ease-in-out"
                            style={{
                                backgroundColor: `${settings.toolbarBg}E6`, 
                                borderColor: settings.toolbarInputBorderColor,
                                color: settings.toolbarText
                            }}
                        >
                            <button 
                                onClick={ttsStatus === 'playing' ? handleTTSPause : handleTTSPlay}
                                className="p-2 rounded-full hover:bg-black/10 transition-colors"
                                title={ttsStatus === 'playing' ? "Pause" : "Resume"}
                            >
                                {ttsStatus === 'playing' ? <PauseIcon className="h-6 w-6"/> : <PlayIcon className="h-6 w-6"/>}
                            </button>
                            <div className="w-px h-5 bg-gray-500/30"></div>
                            <button 
                                onClick={handleTTSStop}
                                className="p-2 rounded-full hover:bg-black/10 transition-colors text-red-400"
                                title="Stop"
                            >
                                <StopIcon className="h-6 w-6"/>
                            </button>
                        </div>
                    )}

                    {/* NEW INDICATOR - Spread/Page Information */}
                    <div 
                        className="absolute bottom-4 right-8 z-10 text-xs font-sans pointer-events-none select-none transition-opacity duration-300 backdrop-blur-sm px-2 py-1 rounded"
                        style={{ 
                            color: settings.textColor, 
                            opacity: 0.6,
                            backgroundColor: settings.toolbarBg ? `${settings.toolbarBg}40` : 'transparent' 
                        }}
                    >
                        {layout.columns === 1 ? (
                            <span>Page {pageInfo.current} of {pageInfo.total}</span>
                        ) : (
                            <span>Pages {pageInfo.current} and {pageInfo.current + 1} of {pageInfo.total}</span>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className={toolbarContainerClasses}>
                    <Toolbar 
                        settings={settings} 
                        onSettingsChange={onSettingsChange} 
                        chapters={chapters}
                        activeChapterId={activeChapterId}
                        onSelectChapter={onActiveChapterIdChange}
                        isSaving={isSaving}
                        activeChapterWordCount={activeChapterWordCount}
                        sessionWordCount={sessionWordCount}
                        writingGoals={writingGoals}
                        onSaveToFolder={() => {
                            if (isSavingProp) return Promise.resolve(false); // Prevent double trigger
                            return onSaveToFolder().then(() => true); // Route toolbar click through prop handler
                        }}
                        onDownloadRtf={() => { const rtf = generateRtfForChapters(chapters); downloadFile('novel.rtf', rtf, 'application/rtf'); }}
                        isFocusMode={isFocusMode}
                        onToggleFocusMode={onToggleFocusMode}
                        isNotesPanelOpen={isNotesPanelOpen}
                        onToggleNotesPanel={handleToggleNotesPanel}
                        onToggleModal={(modal) => {
                            if (modal === 'findReplace') {
                                setIsFindReplaceOpen(p => !p);
                            } else {
                                setActiveModal(modal);
                            }
                        }}
                        isSoundEnabled={isSoundEnabled}
                        onToggleSound={() => onSettingsChange({ isSoundEnabled: !isSoundEnabled })}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); setIsFullscreen(!isFullscreen); }}
                        isSinglePageView={false}
                        isSpellcheckEnabled={isSpellcheckEnabled}
                        onToggleSpellcheck={() => setIsSpellcheckEnabled(p => !p)}
                        onToggleTransitionStyle={() => onSettingsChange({ transitionStyle: settings.transitionStyle === 'scroll' ? 'fade' : 'scroll' })}
                        hasDirectory={!!directoryHandle}
                        onToggleReadAloud={handleOpenTTSModal}
                        ttsStatus={ttsStatus}
                        onExportNoveli={handleExportNoveli}
                        onImportNoveli={handleImportNoveliClick}
                    />
                </div>
            </div>

            {/* Side Panels & Modals */}
            {isNotesPanelOpen && (
                <div 
                    className="flex-shrink-0 h-full relative border-l" 
                    style={{ width: `${notesPanelWidth}px`, borderColor: settings.toolbarInputBorderColor }}
                >
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
             {isFindReplaceOpen && (
                <FindReplaceModal 
                    settings={settings} 
                    chapters={chapters}
                    activeChapterId={activeChapterId}
                    onNavigateMatch={handleNavigateMatch}
                    onReplace={handleFindReplaceUpdate} 
                    onReplaceAll={handleGlobalReplace}
                    onClose={() => setIsFindReplaceOpen(false)} 
                />
            )}
             {activeModal === 'shortcuts' && <ShortcutsModal settings={settings} shortcuts={shortcuts} onUpdateShortcuts={onShortcutsChange} onClose={() => setActiveModal(null)} />}
             {activeModal === 'customizeToolbar' && (
                <CustomizeToolbarModal 
                    settings={settings} 
                    currentVisibility={settings.toolbarVisibility || {}} 
                    onSave={(newVisibility) => onSettingsChange({ toolbarVisibility: newVisibility })} 
                    onClose={() => setActiveModal(null)} 
                    onSaveProject={onSaveToFolder}
                    hasContent={hasContent}
                />
             )}
             {activeModal === 'designGallery' && <DesignGalleryModal settings={settings} onClose={() => setActiveModal(null)} galleryItems={galleryItems} onGalleryItemsChange={onGalleryItemsChange} onSettingsChange={onSettingsChange} />}
             
             {activeModal === 'voiceSettings' && (
                <VoiceSettingsModal 
                    settings={settings} 
                    characters={characters} 
                    onClose={() => {
                        if (previousModal) {
                            setActiveModal(previousModal);
                            setPreviousModal(null);
                        } else {
                            setActiveModal(null);
                        }
                    }} 
                    onSettingsChange={onSettingsChange} 
                />
             )}
             {activeModal === 'history' && <VersionHistoryModal settings={settings} activeChapter={activeChapter} directoryHandle={directoryHandle} onRestore={(content) => handleChapterDetailsChange(activeChapterId, { content })} onClose={() => setActiveModal(null)} />}
             
             {activeModal === 'readAloud' && (
                <ReadAloudModal
                    settings={settings}
                    onClose={() => { 
                        setActiveModal(null); 
                    }}
                    onPlay={handleTTSPlay}
                    onPause={handleTTSPause} 
                    onStop={handleTTSStop}
                    onOpenSettings={() => {
                        setPreviousModal('readAloud');
                        setActiveModal('voiceSettings');
                    }}
                    status={ttsStatus}
                    activeChapterTitle={`${activeChapter.chapterNumber}. ${activeChapter.title}`}
                />
             )}

             {activeModal === 'spellCheck' && (
                <SpellCheckModal 
                    settings={settings} 
                    chapter={activeChapter} 
                    onClose={() => setActiveModal(null)} 
                    onUpdateContent={(newContent) => handleChapterDetailsChange(activeChapter.id, { content: newContent })} 
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