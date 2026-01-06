
import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import type { IChapter, EditorSettings, Shortcut, WritingGoals, GalleryItem, INovelState, SearchResult, AppUpdate } from '../../types';
import { useDebouncedCallback } from 'use-debounce';
import { useNovelDispatch, useNovelState, initialNovelState } from '../../NovelContext';
import { getAI, Modality } from '../../utils/ai';

import { generateRtfForChapters, downloadFile, calculateWordCountFromHtml, decode, decodeAudioData, exportForNoveli, parseNoveliSync, exportDistributionNoveli } from '../../utils/manuscriptUtils';
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
import { UserGuideModal } from './modals/UserGuideModal';

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

// FIX: Added 'findReplace' to ModalType to resolve type errors when calling onToggleModal from Toolbar.
type ModalType = 'findReplace' | 'shortcuts' | 'stats' | 'customizeToolbar' | 'history' | 'voiceSettings' | 'designGallery' | 'readAloud' | 'spellCheck' | 'userGuide';
type TTSStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const useTypewriterSound = (enabled: boolean, volume: number = 0.75) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const enterThudBufferRef = useRef<AudioBuffer | null>(null);
    const keyClickBufferRef = useRef<AudioBuffer | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        return () => {
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

        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.warn("Audio resume failed", e));
        }
        
        const t = ctx.currentTime;

        if (type === 'enter') {
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
    const [previousModal, setPreviousModal] = useState<ModalType | null>(null); 
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false); 
    
    const [isSaving, setIsSaving] = useState(isSavingProp);
    const [isSpellcheckEnabled, setIsSpellcheckEnabled] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [sessionWordCount, setSessionWordCount] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isToolbarAnimating, setIsToolbarAnimating] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
    
    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; actions: { label: string; onSelect: () => void }[] } | null>(null);

    // Page Info State
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });
    
    // TTS State
    const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
    const ttsAudioContextRef = useRef<AudioContext | null>(null);
    const ttsAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    const isSoundEnabled = settings.isSoundEnabled || false;
    const playTypewriterSound = useTypewriterSound(isSoundEnabled, settings.soundVolume);

    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const initialTotalWordCountRef = useRef<number | null>(null);
    const savedSelectionRange = useRef<Range | null>(null);
    const noveliImportInputRef = useRef<HTMLInputElement>(null);
    const isLocalUpdate = useRef(false);
    
    const pendingSearchRef = useRef<SearchResult | null>(null);
    
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

    useEffect(() => {
        setIsSaving(isSavingProp);
    }, [isSavingProp]);

    // --- Update Checking Logic ---
    useEffect(() => {
        const checkUpdates = async () => {
            // @ts-ignore
            if (window.electronAPI && window.electronAPI.checkForUpdates) {
                try {
                    // @ts-ignore
                    const result = await window.electronAPI.checkForUpdates();
                    if (result && result.isNewer) {
                        setAvailableUpdate(result);
                    }
                } catch (e) {
                    console.warn("Update check failed", e);
                }
            }
        };
        // Wait a few seconds after launch to not bog down initial render
        const timer = setTimeout(checkUpdates, 5000);
        return () => clearTimeout(timer);
    }, []);

    /**
     * FIXED: Mixed logical operators and refined typing for activeChapter.
     * Guaranteed presence via NovelProvider defaults.
     */
    const activeChapter = useMemo(() => (chapters.find(ch => ch.id === activeChapterId) || chapters[0]) as IChapter, [chapters, activeChapterId]);
    
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
        const c1 = chapters[0];
        if (!c1) return false;
        if (c1.content.length > 30) return true;
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