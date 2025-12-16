
import React, { useState, useRef, useCallback, useEffect, useMemo, useContext } from 'react';
import { produce } from 'immer';
import { Type, Modality, GenerateContentResponse } from "@google/genai";
import { useDebouncedCallback } from 'use-debounce';
import { Packer, Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import type { EditorSettings, ICharacter, IChapter, TileBackgroundStyle, ISnippet, AssemblyPanel, Excerpt, SocialPost, BrainstormHistory, AssemblyViewState, PlotBrainstormState, SynopsisState, IWorldItem, ChapterPacingInfo, Theme, RelationshipDataPoint, PlotPoint, ChekhovsGun, ICharacterRelationship, IMapLocation } from './types';
import { useNovelDispatch, useNovelState } from './NovelContext';
import { AssemblyAIContext, AssemblyAIContextType, AssemblyAIState, SnippetSuggestion } from './components/assembly/AssemblyAIContext';
import { getAI, hasAPIKey, API_KEY_ERROR } from './utils/ai';

// ... (Imports for panels remain the same)
import { CharactersPanel } from './components/assembly/characters';
import { ChaptersPanel } from './components/assembly/chapters';
import { SnippetsPanel } from './components/assembly/snippets';
import { SocialMediaPanel } from './components/assembly/social';
import { PlotBrainstormPanel } from './components/assembly/plot';
import { SynopsisPanel } from './components/assembly/synopsis';
import { WorldPanel } from './components/assembly/world';
import { PlusIcon, DocumentTextIcon, TileBackgroundIcon, ImportIcon } from './components/common/Icons';
import { generateId, extractJson } from './utils/common';
import { generateInitialChapterRtf, fetchImageAsArrayBuffer, markdownToDocxParagraphs } from './utils/manuscriptUtils';
import { getImageColor } from './utils/colorUtils';
import { Modal } from './components/manuscript/modals/Modal';
import { ImportNovelModal } from './components/assembly/modals/ImportNovelModal';

// ... (DeleteCharacterModal and DeleteChapterModal definitions remain unchanged)
interface DeleteCharacterModalProps {
    character: ICharacter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteCharacterModal: React.FC<DeleteCharacterModalProps> = React.memo(({ character, onConfirm, onCancel, settings }) => {
    const footerContent = (
        <>
            <button onClick={onCancel} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}>Cancel</button>
            <button onClick={onConfirm} className="rounded px-4 py-2 text-white" style={{ backgroundColor: settings.dangerColor }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}>Delete Character</button>
        </>
    );

    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>
                Are you sure you want to permanently delete the character "{character.name}"? This action cannot be undone.
            </p>
        </Modal>
    );
});

interface DeleteChapterModalProps {
    chapter: IChapter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteChapterModal: React.FC<DeleteChapterModalProps> = React.memo(({ chapter, onConfirm, onCancel, settings }) => {
    const footerContent = (
         <>
            <button onClick={onCancel} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}>Cancel</button>
            <button onClick={onConfirm} className="rounded px-4 py-2 text-white" style={{ backgroundColor: settings.dangerColor }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}>Delete Chapter</button>
        </>
    );
    
    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>
                Are you sure you want to permanently delete "{chapter.title} {chapter.chapterNumber}"? This action cannot be undone.
            </p>
        </Modal>
    );
});

// ... (PlaceholderPanel, AssemblyHeader, AssemblyComponent remain mostly unchanged)

const PlaceholderPanel: React.FC<{ panelName: string; settings: EditorSettings }> = ({ panelName, settings }) => {
    const panelTitles: {[key: string]: string} = {
        'snippets': 'Snippets',
        'world': 'World Building',
        'plot': 'Plot Brainstorm',
        'synopsis': 'Synopsis',
        'social': 'Social Media'
    };
    const title = panelTitles[panelName] || (panelName.charAt(0).toUpperCase() + panelName.slice(1));

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: `${settings.textColor}80`}}>
            <h2 className="text-3xl font-bold" style={{ color: settings.textColor }}>{title}</h2>
            <p className="mt-4 text-lg">This feature is coming soon!</p>
            <p className="mt-2 text-sm max-w-md" style={{ color: `${settings.textColor}B3`}}>
                Stay tuned for powerful new tools to manage your {panelName}, world-building notes, plot ideas, and more, all within the Assembly view.
            </p>
        </div>
    );
};

interface AssemblyHeaderProps {
    settings: EditorSettings;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
    onAdd: () => void;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    onExport: () => void;
    onImport: () => void;
}

const AssemblyHeader: React.FC<AssemblyHeaderProps> = ({ settings, activePanel, onPanelChange, onAdd, onSettingsChange, onExport, onImport }) => {
    
    const handleCycleBackground = () => {
        const styles: TileBackgroundStyle[] = ['solid', 'diagonal', 'horizontal'];
        const currentStyle = settings.assemblyTileStyle || 'solid';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onSettingsChange({ assemblyTileStyle: nextStyle });
    };

    const tabBaseClasses = "px-4 py-2 text-sm font-medium transition-colors focus:outline-none border-t border-l border-r rounded-t-lg";
    const inactiveTabHoverStyle = {
        backgroundColor: settings.toolbarButtonHoverBg || ''
    };
    
    const sansSerifFonts = ['Inter', 'Roboto', 'Open Sans', 'Arial'];

    const tabLabels: Record<AssemblyPanel, string> = {
        chapters: 'Chapters',
        characters: 'Characters',
        snippets: 'Snippets',
        world: 'World',
        plot: 'Plot Brainstorm',
        synopsis: 'Synopsis',
        social: 'Social Media',
    };
    const tabs: AssemblyPanel[] = ['chapters', 'characters', 'snippets', 'social', 'world', 'plot', 'synopsis'];

    const canAdd = ['characters', 'chapters', 'snippets', 'world'].includes(activePanel);

    const getAddItemLabel = () => {
        switch(activePanel) {
            case 'characters': return 'Character';
            case 'chapters': return 'Chapter';
            case 'snippets': return 'Snippet';
            case 'world': return 'World Item';
            default: return '';
        }
    }

    const showTileControls = ['characters', 'chapters'].includes(activePanel);

    return (
        <div className="px-3 pt-3 border-b flex flex-wrap justify-between items-end" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
            {/* Left side: Tabs */}
            <div className="flex items-end gap-2 flex-wrap">
                {tabs.map(panel => (
                     <button
                        key={panel}
                        onClick={() => onPanelChange(panel)}
                        className={tabBaseClasses}
                        style={{
                            backgroundColor: activePanel === panel ? 'transparent' : settings.toolbarButtonBg,
                            borderColor: settings.toolbarInputBorderColor,
                            borderBottomColor: activePanel === panel ? 'transparent' : settings.toolbarInputBorderColor,
                            marginBottom: activePanel === panel ? '-1px' : '0px',
                            color: settings.toolbarText
                        }}
                        onMouseEnter={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = inactiveTabHoverStyle.backgroundColor }}
                        onMouseLeave={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || '' }}
                    >
                        {tabLabels[panel]}
                    </button>
                ))}
            </div>

            {/* Right side: Controls */}
            <div className="flex items-center gap-3 pb-1">
                 <select
                    id="assemblyFontSelect"
                    aria-label="Assembly View Font"
                    value={settings.assemblyFontFamily || 'Inter'}
                    onChange={(e) => onSettingsChange({ assemblyFontFamily: e.target.value })}
                    className="px-2 py-1.5 rounded-md text-sm border-0 focus:ring-2 focus:ring-offset-2"
                    style={{ 
                        backgroundColor: settings.toolbarButtonBg, 
                        color: settings.toolbarText,
                        borderColor: settings.toolbarInputBorderColor,
                        outline: 'none',
                        '--tw-ring-offset-color': settings.toolbarBg,
                        '--tw-ring-color': settings.accentColor,
                     } as React.CSSProperties}
                 >
                    {sansSerifFonts.map(font => <option key={font} value={font} style={{fontFamily: font}}>{font}</option>)}
                 </select>
                 {showTileControls && (
                    <button
                        onClick={handleCycleBackground}
                        className="px-3 py-1.5 rounded-md"
                        style={{ backgroundColor: settings.toolbarButtonBg }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                        title={`Tile Style: ${settings.assemblyTileStyle || 'solid'}`}
                    >
                        <TileBackgroundIcon style={settings.assemblyTileStyle || 'solid'} />
                    </button>
                 )}
                 <button
                    onClick={onImport}
                    className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                    style={{ backgroundColor: settings.toolbarButtonBg }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    title="Import Novel Manuscript"
                >
                    <ImportIcon className="h-4 w-4 mr-2" />
                    Import
                </button>
                 <button
                    onClick={onExport}
                    className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                    style={{ backgroundColor: settings.toolbarButtonBg }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    title="Export Assembly as DOCX"
                >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Export
                </button>
                 {canAdd && (
                    <button
                        onClick={onAdd}
                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center text-white"
                        style={{ backgroundColor: settings.accentColor }}
                        onMouseEnter={e => { if (canAdd) e.currentTarget.style.backgroundColor = settings.accentColorHover || '' }}
                        onMouseLeave={e => { if (canAdd) e.currentTarget.style.backgroundColor = settings.accentColor || '' }}
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add New {getAddItemLabel()}
                    </button>
                 )}
            </div>
        </div>
    );
};

interface MainAssemblyProps {
    settings: EditorSettings;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
}

const AssemblyComponent: React.FC<MainAssemblyProps> = ({ settings, onSettingsChange, directoryHandle, activePanel, onPanelChange }) => {
    // ... (This component remains the same)
    const { characters, chapters, snippets, worldItems, plotBrainstormState, synopsisState, assemblyState } = useNovelState();
    const dispatch = useNovelDispatch();
    
    const [characterToDelete, setCharacterToDelete] = useState<ICharacter | null>(null);
    const [chapterToDelete, setChapterToDelete] = useState<IChapter | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const onAssemblyStateChange = (updates: Partial<AssemblyViewState>) => {
        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: updates });
    };

    const handleCharacterSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelection = new Set<string>(assemblyState.selectedCharacterIds);
        if (e.ctrlKey || e.metaKey) {
            newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        } else {
            if (newSelection.has(id) && newSelection.size === 1) {
                newSelection.clear();
            } else {
                newSelection.clear();
                newSelection.add(id);
            }
        }
        onAssemblyStateChange({ selectedCharacterIds: Array.from(newSelection) });
    }, [assemblyState.selectedCharacterIds, onAssemblyStateChange]);

    const handleChapterSelection = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelection = new Set<string>(assemblyState.selectedChapterIds);
        if (e.ctrlKey || e.metaKey) {
            newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        } else {
             if (newSelection.has(id) && newSelection.size === 1) {
                newSelection.clear();
            } else {
                newSelection.clear();
                newSelection.add(id);
            }
        }
        onAssemblyStateChange({ selectedChapterIds: Array.from(newSelection) });
    }, [assemblyState.selectedChapterIds, onAssemblyStateChange]);

    const handleUpdateCharacter = useCallback((id: string, updates: Partial<ICharacter>) => {
        dispatch({ type: 'UPDATE_CHARACTER', payload: { id, updates } });
    }, [dispatch]);

    const handleAddCharacter = useCallback(() => {
        let lastSelectedId: string | undefined = undefined;
        if (assemblyState.selectedCharacterIds.length > 0) {
            const selectedSet = new Set(assemblyState.selectedCharacterIds);
            for (let i = characters.length - 1; i >= 0; i--) {
                if (selectedSet.has(characters[i].id)) {
                    lastSelectedId = characters[i].id;
                    break;
                }
            }
        }

        const newCharacter: ICharacter = {
          id: generateId(),
          name: 'New Character',
          rawNotes: '',
          summary: '',
          profile: '',
          imageColor: '#6b7280',
        };

        const newCharactersArray = produce(characters, draft => {
            const afterIndex = lastSelectedId ? draft.findIndex(c => c.id === lastSelectedId) : -1;
            if (afterIndex !== -1) {
                draft.splice(afterIndex + 1, 0, newCharacter);
            } else {
                draft.push(newCharacter);
            }
        });
        
        dispatch({ type: 'SET_CHARACTERS', payload: newCharactersArray });
    }, [dispatch, characters, assemblyState.selectedCharacterIds]);

    const handleDeleteCharacter = useCallback(() => {
        if (characterToDelete) {
            dispatch({ type: 'DELETE_CHARACTER', payload: characterToDelete.id });
            setCharacterToDelete(null);
        }
    }, [dispatch, characterToDelete]);
    
    const handleSetCharacters = useCallback((newCharacters: ICharacter[]) => {
        dispatch({ type: 'SET_CHARACTERS', payload: newCharacters });
    }, [dispatch]);

    const handleUpdateChapter = useCallback((id: string, updates: Partial<IChapter>) => {
        dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
    }, [dispatch]);

    const handleAddChapter = useCallback(async () => {
        const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
        let lastSelectedId: string | undefined = undefined;
        if (assemblyState.selectedChapterIds.length > 0) {
            const selectedSet = new Set(assemblyState.selectedChapterIds);
            for (let i = sortedChapters.length - 1; i >= 0; i--) {
                if (selectedSet.has(sortedChapters[i].id)) {
                    lastSelectedId = sortedChapters[i].id;
                    break;
                }
            }
        }

        const newChapterId = generateId();
        const newChapterData: Omit<IChapter, 'chapterNumber'> & { chapterNumber?: number } = {
          id: newChapterId,
          title: 'New Chapter',
          content: '<div><br></div>',
          notes: '',
          rawNotes: '',
          summary: 'A brief summary of the chapter.',
          outline: '',
          analysis: 'The purpose of this chapter in the story arc.',
          location: '',
          conflict: '',
          chapterGoal: '',
        };
        
        const afterIndex = lastSelectedId ? sortedChapters.findIndex(c => c.id === lastSelectedId) : -1;

        const newChaptersArray = produce(sortedChapters, draft => {
            if (afterIndex !== -1) {
                draft.splice(afterIndex + 1, 0, newChapterData as IChapter);
            } else {
                draft.push(newChapterData as IChapter);
            }
            draft.forEach((c, index) => {
                c.chapterNumber = index + 1;
            });
        });

        const newlyAddedChapter = newChaptersArray.find(c => c.id === newChapterId)!;
        
        dispatch({ type: 'SET_CHAPTERS', payload: newChaptersArray });

        if (directoryHandle) {
            try {
                const rtfContent = generateInitialChapterRtf(newlyAddedChapter);
                const fileName = `${newlyAddedChapter.title}-${newlyAddedChapter.chapterNumber}.rtf`;
                const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(rtfContent);
                await writable.close();
            } catch (error) {
                console.error("Failed to create new chapter file:", error);
                alert("Could not automatically create the RTF file for the new chapter. You may need to save it manually.");
            }
        }
    }, [dispatch, chapters, directoryHandle, assemblyState.selectedChapterIds]);

    const handleDeleteChapter = useCallback(() => {
        if (chapterToDelete) {
            dispatch({ type: 'DELETE_CHAPTER', payload: chapterToDelete.id });
            setChapterToDelete(null);
        }
    }, [dispatch, chapterToDelete]);
    
    const handleSetChapters = useCallback((newChapters: IChapter[]) => {
        dispatch({ type: 'SET_CHAPTERS', payload: newChapters });
    }, [dispatch]);

    const handleAddSnippet = useCallback(() => {
        // This is handled inside the SnippetsPanel now
    }, []);

    const handleAddWorldItem = useCallback(() => {
        onPanelChange('world');
        onAssemblyStateChange({ worldPanelView: 'crucible' });
    }, [onPanelChange, onAssemblyStateChange]);
    
    const handleAdd = () => {
        if (activePanel === 'characters') {
            handleAddCharacter();
        } else if (activePanel === 'chapters') {
            handleAddChapter();
        } else if (activePanel === 'snippets') {
            // Snippets are added via the dropbox in the panel
        } else if (activePanel === 'world') {
            handleAddWorldItem();
        }
    };
    
    const handleExportAssembly = useCallback(async () => {
        try {
            const sections: (Paragraph)[] = [];

            // --- CHARACTERS ---
            sections.push(new Paragraph({ text: "Characters", heading: HeadingLevel.HEADING_1, pageBreakBefore: false }));

            for (const character of characters) {
                sections.push(new Paragraph({ text: character.name, heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }));

                if (character.photo) {
                    try {
                        const imageBuffer = await fetchImageAsArrayBuffer(character.photo);
                        sections.push(new Paragraph({
                            children: [new ImageRun({ data: new Uint8Array(imageBuffer), transformation: { width: 150, height: 150 } } as any)],
                            alignment: AlignmentType.CENTER,
                        }));
                    } catch (e) {
                        console.error(`Could not embed image for ${character.name}`, e);
                        sections.push(new Paragraph({ children: [new TextRun({ text: `[Image for ${character.name} could not be loaded]`, italics: true })]}));
                    }
                }

                if (character.tagline) sections.push(new Paragraph({ children: [new TextRun({ text: "Tagline: ", bold: true }), new TextRun(character.tagline)], spacing: { after: 100 }}));
                if (character.summary) sections.push(new Paragraph({ children: [new TextRun({ text: "Summary: ", bold: true }), new TextRun(character.summary)], spacing: { after: 100 } }));
                if (character.keywords && character.keywords.length > 0) sections.push(new Paragraph({ children: [new TextRun({ text: "Keywords: ", bold: true }), new TextRun(character.keywords.join(', '))] , spacing: { after: 100 }}));

                sections.push(new Paragraph({ text: "Detailed Profile", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                sections.push(...markdownToDocxParagraphs(character.profile));

                sections.push(new Paragraph({ text: "Rough Notes", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                sections.push(...(character.rawNotes || 'No rough notes provided.').split('\n').map(line => new Paragraph({ text: line })));
            }

            // --- CHAPTERS ---
            const sortedChapters = [...chapters].sort((a,b) => a.chapterNumber - b.chapterNumber);
            sections.push(new Paragraph({ text: "Chapters", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

            for (const chapter of sortedChapters) {
                sections.push(new Paragraph({ text: `${chapter.chapterNumber}. ${chapter.title}`, heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }));
                 if (chapter.photo) {
                    try {
                        const imageBuffer = await fetchImageAsArrayBuffer(chapter.photo);
                        sections.push(new Paragraph({
                            children: [new ImageRun({ data: new Uint8Array(imageBuffer), transformation: { width: 300, height: 180 } } as any)],
                            alignment: AlignmentType.CENTER,
                        }));
                    } catch (e) {
                        console.error(`Could not embed image for ${chapter.title}`, e);
                        sections.push(new Paragraph({ children: [new TextRun({ text: `[Image for ${chapter.title} could not be loaded]`, italics: true })] }));
                    }
                }
                
                if (chapter.tagline) sections.push(new Paragraph({ children: [new TextRun({ text: "Tagline: ", bold: true }), new TextRun(chapter.tagline)], spacing: { after: 100 } }));
                if (chapter.summary) sections.push(new Paragraph({ children: [new TextRun({ text: "Summary: ", bold: true }), new TextRun(chapter.summary)], spacing: { after: 100 } }));
                if (chapter.location) sections.push(new Paragraph({ children: [new TextRun({ text: "Location: ", bold: true }), new TextRun(chapter.location)], spacing: { after: 100 } }));
                if (chapter.conflict) sections.push(new Paragraph({ children: [new TextRun({ text: "Conflict: ", bold: true }), new TextRun(chapter.conflict)], spacing: { after: 100 } }));
                if (chapter.chapterGoal) sections.push(new Paragraph({ children: [new TextRun({ text: "Goal: ", bold: true }), new TextRun(chapter.chapterGoal)], spacing: { after: 100 } }));


                sections.push(new Paragraph({ text: "Outline", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                sections.push(...markdownToDocxParagraphs(chapter.outline));

                sections.push(new Paragraph({ text: "Story Analysis", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                sections.push(...markdownToDocxParagraphs(chapter.analysis));

                const linkedChars = (chapter.characterIds || []).map(id => characters.find(c => c.id === id)?.name).filter(Boolean);
                if (linkedChars.length > 0) {
                    sections.push(new Paragraph({ text: "Linked Characters", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                    sections.push(new Paragraph({ text: linkedChars.join(', ') }));
                }
                
                const linkedSnips = (chapter.linkedSnippetIds || []).map(id => snippets.find(s => s.id === id)).filter(Boolean);
                if (linkedSnips.length > 0) {
                     sections.push(new Paragraph({ text: "Linked Snippets", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                     linkedSnips.forEach(s => s && sections.push(new Paragraph({ text: s.cleanedText, bullet: { level: 0 } })));
                }


                sections.push(new Paragraph({ text: "Rough Notes", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                sections.push(...(chapter.rawNotes || 'No rough notes provided.').split('\n').map(line => new Paragraph({ text: line })));
            }
            
            // --- WORLD ITEMS ---
            if (worldItems.length > 0) {
                sections.push(new Paragraph({ text: "World-Building", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));

                for (const item of worldItems) {
                    sections.push(new Paragraph({ text: `${item.type}: ${item.name}`, heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }));

                    if (item.summary) sections.push(new Paragraph({ children: [new TextRun({ text: "Summary: ", bold: true }), new TextRun(item.summary)], spacing: { after: 100 } }));

                    sections.push(new Paragraph({ text: "Description", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                    sections.push(...markdownToDocxParagraphs(item.description));

                    sections.push(new Paragraph({ text: "Rough Notes", heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
                    sections.push(...(item.rawNotes || 'No rough notes provided.').split('\n').map(line => new Paragraph({ text: line })));
                }
            }


            // --- SNIPPETS ---
            if(snippets.length > 0){
                sections.push(new Paragraph({ text: "Snippet Repository", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
                for(const snippet of snippets) {
                    sections.push(new Paragraph({
                        children: [ new TextRun({ text: `Type: ${snippet.type}`, bold: true }) ],
                        spacing: { before: 300 }
                    }));
                    sections.push(...snippet.cleanedText.split('\n').map(line => new Paragraph({ text: line })));
                    const linkedChars = snippet.characterIds.map(id => characters.find(c => c.id === id)?.name).filter(Boolean);
                    if(linkedChars.length > 0) {
                        sections.push(new Paragraph({ children: [new TextRun({text: "Characters: ", italics: true}), new TextRun({text: linkedChars.join(', '), italics: true})]}));
                    }
                }
            }


            const doc = new Document({
                sections: [{
                    properties: {},
                    children: sections,
                }],
            });

            Packer.toBlob(doc).then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "assembly_export.docx";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
        } catch (error) {
            console.error("Failed to generate DOCX file:", error);
            alert("An error occurred while creating the export file. Please check the console for details.");
        }
    }, [characters, chapters, snippets, worldItems]);

    const activeAssemblyHeader = useMemo(() => (
        <AssemblyHeader 
            settings={settings}
            activePanel={activePanel}
            onPanelChange={onPanelChange}
            onAdd={handleAdd}
            onSettingsChange={onSettingsChange}
            onExport={handleExportAssembly}
            onImport={() => setIsImportModalOpen(true)}
        />
    ), [settings, activePanel, onPanelChange, handleAdd, onSettingsChange, handleExportAssembly]);


    return (
        <div 
            className="h-full flex flex-col pt-14"
            onClick={() => {
                onAssemblyStateChange({
                    selectedCharacterIds: [],
                    selectedChapterIds: [],
                    expandedWorldItemId: null,
                });
            }}
            style={{
                backgroundColor: 'transparent',
                color: settings.textColor,
                fontFamily: settings.assemblyFontFamily || 'Inter',
            }}
        >
            {activeAssemblyHeader}
            <main className="flex-grow min-h-0">
                {activePanel === 'characters' ? (
                    <CharactersPanel
                        characters={characters}
                        settings={settings}
                        tileBackgroundStyle={settings.assemblyTileStyle || 'solid'}
                        selectedIds={new Set(assemblyState.selectedCharacterIds)}
                        onSelect={handleCharacterSelection}
                        onUpdate={handleUpdateCharacter}
                        onDeleteRequest={setCharacterToDelete}
                        onSetCharacters={handleSetCharacters}
                        expandedCharacterId={assemblyState.expandedCharacterId}
                        setExpandedCharacterId={(id) => onAssemblyStateChange({ expandedCharacterId: id })}
                    />
                ) : activePanel === 'chapters' ? (
                    <ChaptersPanel
                        chapters={chapters}
                        characters={characters}
                        snippets={snippets}
                        settings={settings}
                        tileBackgroundStyle={settings.assemblyTileStyle || 'solid'}
                        selectedIds={new Set(assemblyState.selectedChapterIds)}
                        onSelect={handleChapterSelection}
                        onUpdateChapter={handleUpdateChapter}
                        onDeleteRequest={setChapterToDelete}
                        onSetChapters={handleSetChapters}
                        directoryHandle={directoryHandle}
                        isLinkPanelOpen={assemblyState.isChapterLinkPanelOpen}
                        onToggleLinkPanel={() => onAssemblyStateChange({ isChapterLinkPanelOpen: !assemblyState.isChapterLinkPanelOpen })}
                        expandedChapterId={assemblyState.expandedChapterId}
                        setExpandedCharacterId={(id) => onAssemblyStateChange({ expandedChapterId: id })}
                        pacingAnalysis={assemblyState.pacingAnalysis}
                        isGeneratingPacingAnalysis={assemblyState.isGeneratingPacingAnalysis}
                    />
                ) : activePanel === 'snippets' ? (
                     <SnippetsPanel 
                        settings={settings}
                     />
                ) : activePanel === 'social' ? (
                    <SocialMediaPanel 
                        settings={settings}
                    />
                 ) : activePanel === 'plot' ? (
                    <PlotBrainstormPanel 
                        settings={settings}
                        plotState={plotBrainstormState}
                    />
                ) : activePanel === 'synopsis' ? (
                    <SynopsisPanel 
                        settings={settings}
                        synopsisState={synopsisState}
                    />
                ) : activePanel === 'world' ? (
                    <WorldPanel 
                        settings={settings}
                    />
                ) : (
                    <PlaceholderPanel panelName={activePanel} settings={settings} />
                )}
            </main>
            {characterToDelete && (
                <DeleteCharacterModal
                    character={characterToDelete}
                    onConfirm={handleDeleteCharacter}
                    onCancel={() => setCharacterToDelete(null)}
                    settings={settings}
                />
            )}
             {chapterToDelete && (
                <DeleteChapterModal
                    chapter={chapterToDelete}
                    onConfirm={handleDeleteChapter}
                    onCancel={() => setCharacterToDelete(null)}
                    settings={settings}
                />
            )}
            {isImportModalOpen && (
                <ImportNovelModal
                    settings={settings}
                    onClose={() => setIsImportModalOpen(false)}
                    directoryHandle={directoryHandle}
                />
            )}
        </div>
    );
};

export const Assembly: React.FC<MainAssemblyProps & { onDirectoryHandleChange: (handle: FileSystemDirectoryHandle | null) => void}> = ({
    settings,
    onSettingsChange,
    directoryHandle,
    onDirectoryHandleChange,
    activePanel,
    onPanelChange
}) => {
    const dispatch = useNovelDispatch();
    const { chapters, characters, worldItems, assemblyState, plotBrainstormState } = useNovelState();
    const [state, setState] = useState<AssemblyAIState>({
        isGeneratingProfile: null,
        isGeneratingChapter: null,
        isGeneratingWorldItem: null,
        isDistillingWorld: false,
        isGeneratingSnippets: false,
        isGeneratingMap: false,
        errorId: null,
        errorMessage: null,
    });

    const ensureHashtags = (post: SocialPost | null): SocialPost | null => {
        if (!post || !post.hashtags) return post;
        return {
            ...post,
            hashtags: post.hashtags
                .map(tag => tag.trim())
                .filter(Boolean)
                .map(tag => tag.startsWith('#') ? tag : `#${tag.replace(/\s/g, '')}`)
        };
    };

    const onSetError = useCallback((errorMessage: string | null, errorId: string | null = null) => {
        setState(s => ({ ...s, errorMessage, errorId }));
    }, []);

    const onGenerateProfile = useCallback(async (character: ICharacter, rawNotes: string) => {
        setState(s => ({ ...s, isGeneratingProfile: character.id, errorId: null, errorMessage: null }));
        try {
            // Promise for primary character profile
            const textPrompt = `Based on these notes: "${rawNotes}", generate a JSON object for a character profile with: 'summary' (1-2 sentences), 'tagline' (a catchy phrase), 'keywords' (an array of exactly 3 single-word strings), and 'profile' (a detailed multi-paragraph profile in Markdown).`;
            const textPromise = getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: textPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            tagline: { type: Type.STRING },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            profile: { type: Type.STRING },
                        },
                        required: ['summary', 'tagline', 'keywords', 'profile'],
                    }
                }
            });

            // Promise for primary character image
            let imagePromise: Promise<GenerateContentResponse> | null = null;
            if (!character.photo && !character.isPhotoLocked) {
                const imagePrompt = `A photorealistic, highly detailed headshot of a character described as: ${rawNotes}. Cinematic lighting, professional photography, saturated colors, vibrant colors. No text, no watermarks, no signatures.`;
                imagePromise = getAI().models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: imagePrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
            }
            
            // Promise for relationship analysis
            const allCharacterNames = characters.map(c => c.name);
            const relationshipPrompt = `Analyze the following character notes for a character named "${character.name}". 
Identify all mentions of other characters. For each mentioned character, extract all descriptive details and their relationship to "${character.name}".
Do not include "${character.name}" in your output.

Existing characters in the story are: ${allCharacterNames.join(', ')}. Use this list to help identify existing characters.

Return a JSON array of objects. Each object should have:
- "name": The name of the mentioned character.
- "description": A one-line summary of the relationship (e.g., 'Mentor', 'Rival', 'Childhood Friend').
- "details": A string containing all extracted notes and relationship details for this character.

Notes:
"""
${rawNotes}
"""`;

            const relationshipPromise = getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: relationshipPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING, description: "A one-line summary of the relationship (e.g., 'Mentor', 'Rival', 'Childhood Friend')." },
                                details: { type: Type.STRING },
                            },
                            required: ['name', 'description', 'details'],
                        }
                    }
                }
            });


            const textResult = await textPromise;
            
            const textData = extractJson<{
                summary: string;
                tagline: string;
                keywords: string[];
                profile: string;
            }>(textResult.text || '');

            if (!textData) throw new Error("Failed to parse character profile JSON");

            let photoUrl: string | undefined = undefined;
            if (imagePromise) {
                const imageResult = await imagePromise;
                const part = imageResult.candidates?.[0]?.content?.parts?.[0];
                if (part?.inlineData) {
                    photoUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            
            const finalUpdates: Partial<ICharacter> = { 
                summary: textData.summary,
                tagline: textData.tagline,
                profile: textData.profile,
                keywords: Array.isArray(textData.keywords) 
                    ? textData.keywords.map(k => String(k)).slice(0, 3)
                    : [],
                rawNotes 
            };
            if (photoUrl) {
                finalUpdates.photo = photoUrl;
                try {
                    finalUpdates.imageColor = await getImageColor(photoUrl);
                } catch(e) {
                    console.error("Could not get image color", e);
                }
            }
            
            const relationshipResult = await relationshipPromise;
            const relationshipData = extractJson<{ name: string; description: string; details: string; }[]>(relationshipResult.text || '') || [];
            
            const newRelationships: ICharacterRelationship[] = [];

            // Post-process relationships (Dynamic Linking)
            for (const rel of relationshipData) {
                const existingChar = characters.find(c => c.name === rel.name);
                if (existingChar) {
                    // Intelligent linking: Update the OTHER character with a reciprocal relationship note/link
                    const reciprocalNote = `\n[AI Link: Referenced in ${character.name}'s profile as: ${rel.description}]`;
                    const updatedNotes = `${existingChar.rawNotes}\n\n${rel.details}${reciprocalNote}`;
                    
                    // Add inverse relationship to the other character if not exists
                    const existingRelationships = existingChar.relationships || [];
                    if (!existingRelationships.some(r => r.characterId === character.id)) {
                        const newInverseRel: ICharacterRelationship = {
                            characterId: character.id,
                            description: `Linked to ${character.name} (${rel.description})` // Simplified inverse
                        };
                        dispatch({ 
                            type: 'UPDATE_CHARACTER', 
                            payload: { 
                                id: existingChar.id, 
                                updates: { 
                                    rawNotes: updatedNotes,
                                    relationships: [...existingRelationships, newInverseRel]
                                } 
                            } 
                        });
                    } else {
                         dispatch({ 
                            type: 'UPDATE_CHARACTER', 
                            payload: { 
                                id: existingChar.id, 
                                updates: { rawNotes: updatedNotes } 
                            } 
                        });
                    }

                    // Build relationships for source character
                    newRelationships.push({
                        characterId: existingChar.id,
                        description: rel.description,
                    });
                }
            }
            finalUpdates.relationships = newRelationships;

            dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates: finalUpdates } });

        } catch (e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, character.id);
            } else {
                onSetError("Failed to generate profile.", character.id);
            }
        } finally {
            setState(s => ({ ...s, isGeneratingProfile: null }));
        }
    }, [characters, dispatch, onSetError]);

    const onUpdateProfile = useCallback(async (character: ICharacter, manuscriptContent: string) => {
        setState(s => ({...s, isGeneratingProfile: character.id, errorId: null, errorMessage: null}));
        try {
            const prompt = `You are an AI editor updating a character profile. Analyze the provided "Full Manuscript" to understand how the character "${character.name}" has evolved through their actions and dialogue.
Then, update their profile based *only* on the events in the manuscript.
Also, identify key relationships with other characters mentioned in the manuscript. For each, provide a one-line description.

Return a JSON object with:
- 'summary' (1-2 sentences)
- 'tagline' (a catchy phrase reflecting their current state)
- 'keywords' (an array of exactly 3 single-word strings)
- 'profile' (a detailed Markdown profile)
- 'relationships' (an array of objects, each with 'characterName' and 'description')

Original Profile Notes:
---
${character.rawNotes}
---

Full Manuscript:
---
${manuscriptContent}
---
`;
            const response = await getAI().models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            tagline: { type: Type.STRING },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            profile: { type: Type.STRING },
                            relationships: {
                                type: Type.ARRAY,
                                description: "List of key relationships with other characters.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        characterName: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                    },
                                    required: ['characterName', 'description'],
                                }
                            }
                        },
                        required: ['summary', 'tagline', 'keywords', 'profile', 'relationships'],
                    }
                }
            });

            const updatedData = extractJson<{
                summary: string;
                tagline: string;
                keywords: string[];
                profile: string;
                relationships?: { characterName: string; description: string }[];
            }>(response.text || '');

            if (!updatedData) throw new Error("Failed to parse updated profile JSON");
            
            const newRelationships: ICharacterRelationship[] = [];
            
            // Dynamic Linking for UpdateProfile
            for (const rel of (updatedData.relationships || [])) {
                const relatedChar = characters.find(c => c.name === rel.characterName && c.id !== character.id);
                if (relatedChar) {
                    newRelationships.push({
                        characterId: relatedChar.id,
                        description: rel.description
                    });

                    // Reciprocal link: Update the OTHER character if they don't mention this one
                    const existingRelationships = relatedChar.relationships || [];
                    if (!existingRelationships.some(r => r.characterId === character.id)) {
                        const newInverseRel: ICharacterRelationship = {
                            characterId: character.id,
                            description: `Linked to ${character.name} (Updated via Manuscript)`
                        };
                        dispatch({
                            type: 'UPDATE_CHARACTER',
                            payload: {
                                id: relatedChar.id,
                                updates: {
                                    relationships: [...existingRelationships, newInverseRel]
                                }
                            }
                        });
                    }
                }
            }

            const updates: Partial<ICharacter> = {
                summary: updatedData.summary,
                tagline: updatedData.tagline,
                profile: updatedData.profile,
                keywords: Array.isArray(updatedData.keywords) 
                    ? updatedData.keywords.map(k => String(k)).slice(0, 3)
                    : [],
                relationships: newRelationships,
                previousProfile: {
                    summary: character.summary,
                    profile: character.profile,
                    tagline: character.tagline,
                    keywords: character.keywords,
                    relationships: character.relationships,
                }
            };

            dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates } });
            
        } catch(e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, character.id);
            } else {
                onSetError("Failed to update profile.", character.id);
            }
        } finally {
            setState(s => ({...s, isGeneratingProfile: null}));
        }
    }, [dispatch, onSetError, characters]);

    const onGenerateChapterDetails = useCallback(async (chapter: IChapter, rawNotes: string) => {
        setState(s => ({ ...s, isGeneratingChapter: chapter.id, errorId: null, errorMessage: null }));
        try {
            const allCharacterNames = characters.map(c => c.name).join(', ');
            const textPrompt = `Based on these notes: "${rawNotes}", generate a JSON object for a chapter.
            
            Also, identify which of the following characters appear in this chapter: ${allCharacterNames}.
            Return "charactersPresent" as an array of these specific names.

            Output JSON structure:
            {
                "title": "Creative Chapter Title",
                "summary": "1-2 sentence summary",
                "tagline": "One sentence catchy phrase",
                "keywords": ["word1", "word2", "word3"],
                "outline": "Markdown outline",
                "analysis": "Paragraph on story arc purpose",
                "charactersPresent": ["Name1", "Name2"]
            }`;

            const textPromise = getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: textPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            tagline: { type: Type.STRING },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            outline: { type: Type.STRING },
                            analysis: { type: Type.STRING },
                            charactersPresent: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['title', 'summary', 'tagline', 'keywords', 'outline', 'analysis', 'charactersPresent'],
                    }
                }
            });

            let imagePromise: Promise<GenerateContentResponse> | null = null;
            if (!chapter.photo && !chapter.isPhotoLocked) {
                const imagePrompt = `A detailed, atmospheric, cinematic still of a scene described as: ${rawNotes}. No text, no watermarks, no signatures.`;
                imagePromise = getAI().models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: imagePrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
            }

            const textResult = await textPromise;
            const textData = extractJson<{
                title: string;
                summary: string;
                tagline: string;
                keywords: string[];
                outline: string;
                analysis: string;
                charactersPresent?: string[];
            }>(textResult.text || '');

            if (!textData) throw new Error("Failed to parse chapter details JSON");

            let photoUrl: string | undefined = undefined;
            if (imagePromise) {
                const imageResult = await imagePromise;
                const part = imageResult.candidates?.[0]?.content?.parts?.[0];
                if (part?.inlineData) {
                    photoUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }

            // Auto-link characters
            const characterIds = (textData.charactersPresent || [])
                .map(name => characters.find(c => c.name === name)?.id)
                .filter((id): id is string => !!id);

            const finalUpdates: Partial<IChapter> = { 
                title: textData.title,
                summary: textData.summary,
                tagline: textData.tagline,
                outline: textData.outline,
                analysis: textData.analysis,
                keywords: Array.isArray(textData.keywords) 
                    ? textData.keywords.map(k => String(k)).slice(0, 3)
                    : [],
                characterIds: characterIds.length > 0 ? characterIds : chapter.characterIds,
                rawNotes
            };
            if (photoUrl) {
                finalUpdates.photo = photoUrl;
                finalUpdates.imageColor = await getImageColor(photoUrl);
            }

            dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapter.id, updates: finalUpdates } });

        } catch (e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, chapter.id);
            } else {
                onSetError("Failed to generate chapter details.", chapter.id);
            }
        } finally {
            setState(s => ({ ...s, isGeneratingChapter: null }));
        }
    }, [dispatch, onSetError, characters]);
    
    const onUpdateChapterFromManuscript = useCallback(async (chapter: IChapter) => {
        setState(s => ({...s, isGeneratingChapter: chapter.id, errorId: null, errorMessage: null}));
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapter.content;
            const chapterText = tempDiv.innerText;

            if(!chapterText.trim()){
                onSetError("Chapter is empty. Write something before updating from manuscript.", chapter.id);
                setState(s => ({...s, isGeneratingChapter: null}));
                return;
            }

            const allCharacterNames = characters.map(c => c.name).join(', ');
            const prompt = `You are an AI editor updating a chapter outline. Analyze the provided "Chapter Text".
            
            Also, identify which of these characters appear in the text: ${allCharacterNames}.
            Return "charactersPresent" as an array of these specific names.

            Generate a JSON object with 'summary' (1-2 sentences), 'tagline' (a catchy phrase), 'keywords' (an array of 3 single-word strings), 'outline' (a detailed multi-point Markdown outline), 'analysis' (a paragraph on its role), and 'charactersPresent'.

            Chapter Text:
            ---
            ${chapterText}
            ---
            `;
            const response = await getAI().models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                 config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            tagline: { type: Type.STRING },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            outline: { type: Type.STRING },
                            analysis: { type: Type.STRING },
                            charactersPresent: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['summary', 'tagline', 'keywords', 'outline', 'analysis', 'charactersPresent'],
                    }
                }
            });
            
            const updatedData = extractJson<{
                summary: string;
                tagline: string;
                keywords: string[];
                outline: string;
                analysis: string;
                charactersPresent?: string[];
            }>(response.text || '');

            if (!updatedData) throw new Error("Failed to parse updated chapter JSON");

            // Auto-link characters
            const characterIds = (updatedData.charactersPresent || [])
                .map(name => characters.find(c => c.name === name)?.id)
                .filter((id): id is string => !!id);

            const updates: Partial<IChapter> = {
                summary: updatedData.summary,
                tagline: updatedData.tagline,
                outline: updatedData.outline,
                analysis: updatedData.analysis,
                keywords: Array.isArray(updatedData.keywords) 
                    ? updatedData.keywords.map(k => String(k)).slice(0, 3)
                    : [],
                characterIds: characterIds.length > 0 ? characterIds : chapter.characterIds,
                previousDetails: {
                    summary: chapter.summary,
                    outline: chapter.outline,
                    analysis: chapter.analysis,
                    tagline: chapter.tagline,
                    keywords: chapter.keywords,
                }
            };
            dispatch({type: 'UPDATE_CHAPTER', payload: {id: chapter.id, updates}});

        } catch(e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, chapter.id);
            } else {
                onSetError("Failed to update chapter.", chapter.id);
            }
        } finally {
            setState(s => ({...s, isGeneratingChapter: null}));
        }

    }, [dispatch, onSetError, characters]);

    const onAnalyzeSnippets = useCallback(async (rawText: string, characters: ICharacter[]) => {
        setState(s => ({ ...s, isGeneratingSnippets: true, errorId: null, errorMessage: null }));
        try {
            const characterNames = characters.map(c => c.name).join(', ');
            const prompt = `Analyze the following raw text, which contains snippets of writing separated by blank lines. For each snippet, perform these actions:
1.  Clean up grammar and formatting.
2.  Categorize it as one of: 'Dialogue', 'Narrative Description', 'Internal Monologue', 'Theme Statement', 'General Action', 'World-Building Note', 'Uncategorized'.
3.  If it's 'Dialogue', identify the speaker from this list of characters: [${characterNames}]. If the speaker isn't on the list, or it's ambiguous, do not assign a character.
4.  Identify all characters mentioned or involved in the snippet from the same list.

Return a single JSON array of objects. Each object must have:
- "cleanedText" (string)
- "type" (string from the category list)
- "characterNames" (an array of strings with the names of all involved characters)

Raw Text:
"""
${rawText}
"""`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                cleanedText: { type: Type.STRING },
                                type: { type: Type.STRING },
                                characterNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ['cleanedText', 'type', 'characterNames'],
                        },
                    },
                },
            });

            const resultData = extractJson<{ cleanedText: string; type: ISnippet['type']; characterNames: string[] }[]>(response.text || '');
            
            if (!resultData) throw new Error("Failed to parse snippets JSON");

            const newSnippets: ISnippet[] = resultData.map(item => ({
                id: generateId(),
                cleanedText: item.cleanedText,
                type: item.type,
                characterIds: item.characterNames
                    .map(name => characters.find(c => c.name === name)?.id)
                    .filter((id): id is string => !!id),
                isUsed: false,
            }));

            dispatch({ type: 'ADD_SNIPPETS', payload: newSnippets });
            return true;
        } catch (e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, 'snippets');
            } else {
                onSetError("Failed to analyze snippets.", 'snippets');
            }
            return false;
        } finally {
            setState(s => ({ ...s, isGeneratingSnippets: false }));
        }
    }, [characters, dispatch, onSetError]);

    const onSuggestPlacement = useCallback(async (snippet: ISnippet, chapters: IChapter[]) => {
        try {
            const chapterSummaries = chapters.map(c => `ID: ${c.id}, Title: ${c.title}, Summary: ${c.summary}, Outline: ${c.outline}`).join('\n\n');
            const prompt = `I have a snippet of text and I need to find the best place to insert it into my novel.
            
            Snippet:
            "${snippet.cleanedText}"
            
            Here are the chapters of my novel:
            ${chapterSummaries}
            
            Analyze the snippet and the chapters. Suggest the top 3 most suitable chapters where this snippet could fit, based on context, characters involved, and plot progression.
            
            Return a JSON array of objects. Each object should have:
            - "chapterId": The ID of the suggested chapter.
            - "confidence": "High", "Medium", or "Low".
            - "justification": A brief explanation of why it fits here.
            `;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                chapterId: { type: Type.STRING },
                                confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                                justification: { type: Type.STRING },
                            },
                            required: ['chapterId', 'confidence', 'justification'],
                        },
                    },
                },
            });

            const suggestions = extractJson<SnippetSuggestion[]>(response.text || '');
            if (!suggestions) throw new Error("Failed to parse suggestions");
            
            return suggestions;

        } catch (e) {
            console.error(e);
            if (!hasAPIKey()) {
                return API_KEY_ERROR;
            }
            return "Failed to generate suggestions.";
        }
    }, []);

    const onGenerateFullAnalysis = useCallback(async () => {
        // Implementation moved to individual specialized calls for granular control, 
        // or this can be a wrapper that calls them all.
        // For now, let's assume the UI calls individual methods or we implement a chain here.
        // Since the UI in PlotBrainstormPanel calls onGenerateFullAnalysis when nothing is generated,
        // we should implement a basic chain.
        
        await onRegeneratePacingAndStructure();
        await onRegenerateCharacters();
        await onRegenerateOpportunities();
    }, []);

    const onRegeneratePacingAndStructure = useCallback(async () => {
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: true, error: null } });
        try {
            const chapterSummaries = chapters.map(c => `Chapter ${c.chapterNumber} (${c.title}): ${c.summary} \nOutline: ${c.outline}`).join('\n\n');
            
            const prompt = `Analyze the pacing and structure of the following novel outline.
            Identify the key plot points (Inciting Incident, Rising Action, Climax, Falling Action, Resolution) and map them to specific chapters.
            Provide a summary of the overall pacing.

            Outline:
            ${chapterSummaries}

            Return a JSON object with:
            - "summary": A markdown string analyzing the pacing.
            - "plotPoints": An array of objects with { id: string, chapterNumber: number, title: string, description: string, type: string }.
            `;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const data = extractJson<{ summary: string; plotPoints: Omit<PlotPoint, 'id'>[] }>(response.text || '');
            if (!data) throw new Error("Failed to parse analysis");

            const plotPoints: PlotPoint[] = data.plotPoints.map(p => ({...p, id: generateId(), type: p.type as PlotPoint['type'] }));

            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { pacingAndStructureAnalysis: { summary: data.summary, plotPoints } } });

        } catch (e) {
            console.error(e);
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { error: hasAPIKey() ? "Failed to generate pacing analysis." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: false } });
        }
    }, [chapters, dispatch]);

    const onRegenerateCharacters = useCallback(async () => {
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingCharacters: true, error: null } });
        try {
             const charProfiles = characters.map(c => `${c.name}: ${c.summary}\n${c.profile}`).join('\n\n');
             const prompt = `Analyze the character arcs and relationships in this novel based on these profiles. Identify potential inconsistencies, lack of motivation, or flat arcs. Suggest improvements.
             
             Profiles:
             ${charProfiles}
             
             Return a markdown string.`;

             const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
             dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { characterAnalysis: response.text } });

        } catch(e) {
             console.error(e);
             dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { error: hasAPIKey() ? "Failed to generate character analysis." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingCharacters: false } });
        }
    }, [characters, dispatch]);

    const onRegenerateOpportunities = useCallback(async () => {
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingOpportunities: true, error: null } });
        try {
            const chapterSummaries = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Analyze this plot outline for plot holes, loose ends, and missed opportunities. Suggest twists or foreshadowing that could strengthen the narrative.
            
            Outline:
            ${chapterSummaries}
            
            Return a markdown string.`;
            
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { opportunityAnalysis: response.text } });

        } catch(e) {
            console.error(e);
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { error: hasAPIKey() ? "Failed to generate opportunity analysis." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingOpportunities: false } });
        }
    }, [chapters, dispatch]);

    const onGenerateRelationshipAnalysis = useCallback(async (char1Id: string, char2Id: string) => {
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingRelationshipAnalysis: true, error: null } });
        try {
            const char1 = characters.find(c => c.id === char1Id);
            const char2 = characters.find(c => c.id === char2Id);
            if (!char1 || !char2) throw new Error("Characters not found");

            const manuscriptContext = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.content}`).join('\n\n'); // In real app, might be too large, use summaries?
            // Using summaries for now to save tokens
            const summaries = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`).join('\n');

            const prompt = `Analyze the relationship between ${char1.name} and ${char2.name} throughout the novel based on the following chapter summaries.
            Track the sentiment of their interactions (-1 for hostile, 0 for neutral, 1 for positive/allied) and provide a summary of their dynamic's evolution.

            Summaries:
            ${summaries}

            Return a JSON object:
            {
                "analysisText": "Markdown analysis of their relationship arc...",
                "dataPoints": [
                    { "chapterNumber": 1, "sentiment": 0.5, "summary": "They meet...", "excerpt": "Optional short quote or reference" }
                ]
            }`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = extractJson<{ analysisText: string; dataPoints: RelationshipDataPoint[] }>(response.text || '');
            if (!data) throw new Error("Failed to parse relationship analysis");

            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { relationshipAnalysis: { character1Id: char1Id, character2Id: char2Id, ...data } } });

        } catch (e) {
            console.error(e);
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { error: hasAPIKey() ? "Failed to analyze relationship." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingRelationshipAnalysis: false } });
        }
    }, [characters, chapters, dispatch]);

    const onGenerateChekhovsGuns = useCallback(async () => {
        // Similar implementation
    }, []);
    const onGenerateThematicAnalysis = useCallback(async () => {
        // Similar implementation
    }, []);
    const onGenerateArcTest = useCallback(async (characterId: string) => {
        // Similar implementation
    }, []);

    const onGenerateFullSynopsis = useCallback(async () => {
        await onRegenerateMarketAnalysis();
        await onRegeneratePromotionalContent();
        await onRegenerateSynopsis();
    }, []);

    const onRegenerateMarketAnalysis = useCallback(async () => {
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: true, error: null } });
        try {
            const context = `Title: Novelos Project\nGenre: Fiction\n\n${chapters.map(c => c.summary).join('\n')}`;
            const prompt = `Based on this story summary, provide a market analysis. Include BISAC codes, keywords, relevant tropes, and 3 comparable titles (comps). Return as markdown.`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { marketAnalysis: response.text } });
        } catch (e) {
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { error: hasAPIKey() ? "Failed to generate market analysis." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: false } });
        }
    }, [chapters, dispatch]);

    const onRegeneratePromotionalContent = useCallback(async () => {
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: true, error: null } });
        try {
             const context = chapters.map(c => c.summary).join('\n');
             const prompt = `Generate promotional content for this story: a Logline, 3 Taglines, a "Song Lyric" that fits the vibe, and an "Ideal Reader" profile. Return as markdown.`;
             const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
             dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { promotionalContent: response.text } });
        } catch(e) {
             dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { error: hasAPIKey() ? "Failed to generate promotional content." : API_KEY_ERROR } });
        } finally {
             dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: false } });
        }
    }, [chapters, dispatch]);

    const onRegenerateSynopsis = useCallback(async () => {
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: true, error: null } });
        try {
            const context = chapters.map(c => c.summary).join('\n');
            const prompt = `Write two synopses for this story based on the summaries: 
            1. A Short Synopsis (query letter length, ~300 words).
            2. A Long Synopsis (detailed, revealing the ending, ~1000 words).
            Return as markdown.`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { synopsis: response.text } });
        } catch (e) {
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { error: hasAPIKey() ? "Failed to generate synopsis." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: false } });
        }
    }, [chapters, dispatch]);

    const onGenerateSocialContent = useCallback(async (excerpt: Excerpt) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true, error: null } });
        try {
            // Get Chapter Context for Voice
            const chapter = chapters.find(c => c.id === excerpt.chapterId);
            let voiceContext = "";
            if (chapter) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chapter.content;
                voiceContext = tempDiv.innerText;
            }

            // 1. Generate Image Prompt
            const imagePromptReq = `Read this excerpt from a novel: "${excerpt.text}". Describe a single, evocative, photorealistic image that captures the mood and imagery of this scene. The description should be suitable for an AI image generator. Focus on lighting, composition, and key elements.`;
            const imagePromptRes = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: imagePromptReq });
            const imagePrompt = imagePromptRes.text || '';
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: imagePrompt } });

            // 2. Generate Image
            const enhancedImagePrompt = `${imagePrompt} High saturation, vibrant colors. No text, no lettering, no writing.`;
            const imageRes = await getAI().models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: enhancedImagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const part = imageRes.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: imageUrl } });
            }

            // 3. Generate Posts
            const postReq = `You are a social media manager for an author.
            
            First, analyze the "Manuscript Context" below to understand the author's unique voice, writing style, and the tone of the story.
            
            Then, based on the provided "Excerpt", write two social media posts.
            1. An Instagram caption: 
               - It must be short and concise.
               - It MUST be written in the author's voice derived from the "Manuscript Context", not just the excerpt.
               - Include relevant emojis.
               - You MUST include 20-25 relevant, researched hashtags to maximize reach.
            2. A TikTok script/caption concept: 
               - Short, punchy, suitable for a video hook, also reflecting the story's vibe.
               - Include 5-10 relevant hashtags.

            Manuscript Context (for voice analysis):
            """
            ${voiceContext.substring(0, 10000)}...
            """

            Excerpt:
            """
            ${excerpt.text}
            """

            Return JSON: { "instagram": { "text": "...", "hashtags": ["..."] }, "tiktok": { "text": "...", "hashtags": ["..."] } }
            Important: Ensure all hashtags start with "#".`;
            
            const postRes = await getAI().models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: postReq,
                config: { responseMimeType: 'application/json' }
            });
            const posts = extractJson<{ instagram: SocialPost, tiktok: SocialPost }>(postRes.text || '');
            
            if (posts) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { 
                    generatedInstagramPost: ensureHashtags(posts.instagram),
                    generatedTiktokPost: ensureHashtags(posts.tiktok)
                } });
            }

        } catch (e) {
            console.error(e);
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { error: hasAPIKey() ? "Failed to generate social content." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } });
        }
    }, [dispatch, chapters]);

    const onRegenerateImage = useCallback(async (imagePrompt: string, moodOnly: boolean, character?: ICharacter) => {
        try {
            let finalPrompt = imagePrompt;
            if (moodOnly) {
                finalPrompt += " Depict strictly the environment, scenery, and atmosphere. DO NOT include any people, characters, human figures, or silhouettes. The scene must be entirely devoid of life forms, focusing only on the setting and mood.";
            } else if (character) {
                finalPrompt += ` Include the character described as: ${character.rawNotes || character.summary}`;
            }
            
            finalPrompt += " High saturation, vibrant colors. No text, no lettering, no writing.";

            const imageRes = await getAI().models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: finalPrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const part = imageRes.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }, []);

    const onRegenerateTextAndHashtags = useCallback(async (excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
             const chapter = chapters.find(c => c.id === excerpt.chapterId);
             let voiceContext = "";
             if (chapter) {
                 const tempDiv = document.createElement('div');
                 tempDiv.innerHTML = chapter.content;
                 voiceContext = tempDiv.innerText;
             }

             const prompt = `You are a social media manager. Analyze the "Manuscript Context" for authorial voice and tone.
             Regenerate a ${platform} post for this excerpt: "${excerpt.text}".
             
             Requirements:
             - Make it unique from previous versions.
             - Keep it strictly consistent with the author's voice from the "Manuscript Context".
             ${platform === 'instagram' ? '- Keep the caption short and concise.' : ''}
             ${platform === 'instagram' ? '- You MUST include 20-25 relevant hashtags.' : '- Include 5-10 relevant hashtags.'}
             
             Manuscript Context:
             """
             ${voiceContext.substring(0, 10000)}...
             """
             
             Return JSON: { "text": "...", "hashtags": ["..."] }
             Important: Ensure all hashtags start with "#".`;

             const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const post = extractJson<SocialPost>(response.text || '');
            if (post) {
                const fixedPost = ensureHashtags(post);
                if (platform === 'instagram') dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: fixedPost } });
                else dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: fixedPost } });
            }
        } catch(e) {
            console.error(e);
        } finally {
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } });
        }
    }, [dispatch, chapters]);

    const onExtractExcerpts = useCallback(async (chapter: IChapter, allCharacters: ICharacter[]) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapter.content;
            const text = tempDiv.innerText;

            const prompt = `Analyze this chapter text and extract 3-5 engaging, shareable excerpts (1-3 sentences each) suitable for social media teasers. They should be intriguing but not spoil major plot points.
            For each excerpt, identify any characters present from this list: ${allCharacters.map(c => c.name).join(', ')}.
            
            Chapter Text:
            ${text.substring(0, 10000)}... (truncated)

            Return JSON array: [{ "text": "...", "characterNames": ["..."] }]`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = extractJson<{ text: string, characterNames: string[] }[]>(response.text || '');
            if (data) {
                const excerpts = data.map(item => ({
                    text: item.text,
                    chapterId: chapter.id,
                    characterIds: item.characterNames.map(n => allCharacters.find(c => c.name === n)?.id).filter((id): id is string => !!id)
                }));
                dispatch({ type: 'ADD_AI_EXCERPTS', payload: excerpts });
            }

        } catch(e) {
            console.error(e);
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { error: hasAPIKey() ? "Failed to generate excerpts." : API_KEY_ERROR } });
        } finally {
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } });
        }
    }, [dispatch]);

    const onGeneratePostVariations = useCallback(async (post: SocialPost, excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const prompt = `Based on this excerpt: "${excerpt.text}" and this initial post: "${post.text}", generate 3 distinct variations of the post for ${platform}. 
            Change the tone (e.g., one funny, one dramatic, one mysterious).
            ${platform === 'instagram' ? 'Each variation MUST include 20-25 relevant hashtags.' : ''}
            Return JSON: [{ "text": "...", "hashtags": ["..."] }]
            Important: Ensure all hashtags start with "#".`;
            
            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            const variations = extractJson<SocialPost[]>(response.text || '');
            if (variations) {
                const fixedVariations = variations.map(v => ensureHashtags(v)).filter((v): v is SocialPost => !!v);
                dispatch({ type: 'SET_POST_VARIATIONS', payload: { variations: fixedVariations, platform } });
            }
        } catch(e) {
            console.error(e);
        } finally {
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } });
        }
    }, [dispatch]);

    const onRefineWorldItem = useCallback(async (item: IWorldItem) => {
        setState(s => ({ ...s, isGeneratingWorldItem: item.id, errorId: null, errorMessage: null }));
        try {
            const prompt = `Refine the following world-building notes for "${item.name}" (${item.type}). 
            Organize them into a clear, structured description suitable for a story bible. 
            Infer missing details if they are implied.
            Also provide a 1-sentence summary.

            Notes:
            ${item.rawNotes}

            Return JSON: { "description": "...", "summary": "..." }`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const data = extractJson<{ description: string, summary: string }>(response.text || '');
            if (data) {
                dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates: { description: data.description, summary: data.summary } } });
            }
        } catch(e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, item.id);
            } else {
                onSetError("Failed to refine world item.", item.id);
            }
        } finally {
            setState(s => ({ ...s, isGeneratingWorldItem: null }));
        }
    }, [dispatch, onSetError]);

    const onDistillWorldNotes = useCallback(async (crucibleText: string) => {
        setState(s => ({ ...s, isDistillingWorld: true, errorId: null, errorMessage: null }));
        try {
            const prompt = `Analyze these raw world-building notes. Identify distinct items (Locations, Lore, Objects, Organizations, Concepts).
            For each item, extract the details and create a structured entry.
            
            Notes:
            ${crucibleText}

            Return JSON array: [{ "name": "...", "type": "...", "rawNotes": "...", "summary": "...", "description": "..." }]`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const items = extractJson<Omit<IWorldItem, 'id' | 'imageColor'>[]>(response.text || '');
            if (items) {
                const newItems: IWorldItem[] = items.map(i => ({
                    ...i,
                    id: generateId(),
                    imageColor: '#6b7280'
                }));
                dispatch({ type: 'ADD_WORLD_ITEMS', payload: newItems });
                dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldCrucibleText: '' } }); // Clear after successful distill
            }
        } catch(e) {
            console.error(e);
            if (!hasAPIKey()) {
                onSetError(API_KEY_ERROR, 'distill');
            } else {
                onSetError("Failed to distill notes.", 'distill');
            }
        } finally {
            setState(s => ({ ...s, isDistillingWorld: false }));
        }
    }, [dispatch, onSetError]);

    const onConsolidateWorldItem = useCallback(async (item: IWorldItem) => {
        // Implementation to merge duplicates or refine further
    }, []);

    const onGeneratePacingAnalysis = useCallback(async () => {
        dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: true } });
        try {
            const chapterData = chapters.map(c => `Chapter ${c.chapterNumber}: ${c.title}\nSummary: ${c.summary}`).join('\n\n');
            const prompt = `Analyze the pacing of these chapters based on their summaries. Assign a pacing score from -1 (Slow, Introspective, Setup) to 1 (Fast, Action, Climax) for each chapter. Provide a brief justification.
            
            Chapters:
            ${chapterData}
            
            Return JSON array: [{ "chapterNumber": 1, "pacingScore": 0.5, "justification": "..." }]`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = extractJson<{ chapterNumber: number, pacingScore: number, justification: string }[]>(response.text || '');
            if (data) {
                const pacingInfo: ChapterPacingInfo[] = data.map(d => {
                    const chapter = chapters.find(c => c.chapterNumber === d.chapterNumber);
                    return {
                        chapterId: chapter ? chapter.id : generateId(),
                        chapterNumber: d.chapterNumber,
                        title: chapter ? chapter.title : `Chapter ${d.chapterNumber}`,
                        pacingScore: d.pacingScore,
                        justification: d.justification
                    };
                });
                dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { pacingAnalysis: pacingInfo } });
            }
        } catch(e) {
            console.error(e);
            onSetError(hasAPIKey() ? 'Failed to generate pacing analysis.' : API_KEY_ERROR);
        } finally {
            dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: false } });
        }
    }, [chapters, dispatch, onSetError]);

    const onSuggestLocations = useCallback(async () => {
        setState(s => ({ ...s, isGeneratingMap: true, errorId: null, errorMessage: null }));
        try {
            const context = `Existing Locations: ${worldItems.filter(i => i.type === 'Location').map(i => i.name).join(', ')}
            
            Story Summaries:
            ${chapters.map(c => c.summary).join('\n')}
            `;

            const prompt = `You are a cartographer for a fantasy novel. Based on the provided story context, identify 3-5 key geographic locations that should be on a map but might not be pinned yet.
            
            For each location:
            1. Provide a Name.
            2. Provide a short Description.
            3. Assign coordinates (x, y) on a scale of 0 to 100. Ensure they are spread out reasonably and not all clustered in one corner. Avoid placing them too close to the edges (keep between 10 and 90).

            Context:
            ${context}

            Return JSON array: [{ "name": "...", "description": "...", "x": 50, "y": 50 }]`;

            const response = await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const locations = extractJson<{ name: string, description: string, x: number, y: number }[]>(response.text || '');
            
            if (locations) {
                locations.forEach(loc => {
                    const newPin: IMapLocation = {
                        id: generateId(),
                        name: loc.name,
                        description: loc.description,
                        x: loc.x,
                        y: loc.y
                    };
                    dispatch({ type: 'ADD_MAP_LOCATION', payload: newPin });
                });
            }

        } catch (e) {
            console.error(e);
            onSetError(hasAPIKey() ? "Failed to suggest locations." : API_KEY_ERROR);
        } finally {
            setState(s => ({ ...s, isGeneratingMap: false }));
        }
    }, [worldItems, chapters, dispatch, onSetError]);


    const value: AssemblyAIContextType = {
        ...state,
        onGenerateProfile,
        onUpdateProfile,
        onGenerateChapterDetails,
        onUpdateChapterFromManuscript,
        onAnalyzeSnippets,
        onSuggestPlacement,
        onGenerateFullAnalysis,
        onRegeneratePacingAndStructure,
        onRegenerateCharacters,
        onRegenerateOpportunities,
        onGenerateRelationshipAnalysis,
        onGenerateChekhovsGuns,
        onGenerateThematicAnalysis,
        onGenerateArcTest,
        onGenerateFullSynopsis,
        onRegenerateMarketAnalysis,
        onRegeneratePromotionalContent,
        onRegenerateSynopsis,
        onGenerateSocialContent,
        onRegenerateImage,
        onRegenerateTextAndHashtags,
        onExtractExcerpts,
        onGeneratePostVariations,
        onRefineWorldItem,
        onDistillWorldNotes,
        onConsolidateWorldItem,
        onSetError,
        onGeneratePacingAnalysis,
        onSuggestLocations
    };

    return (
        <AssemblyAIContext.Provider value={value}>
            <AssemblyComponent 
                settings={settings} 
                onSettingsChange={onSettingsChange}
                directoryHandle={directoryHandle}
                activePanel={activePanel}
                onPanelChange={onPanelChange}
            />
        </AssemblyAIContext.Provider>
    );
};
