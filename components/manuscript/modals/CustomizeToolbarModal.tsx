
import React, { useState, useEffect } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import type { EditorSettings, ToolbarVisibility, INovelState } from '../../../types';
import { TrashIconOutline, SpinnerIcon, ShareIcon } from '../../common/Icons';
import { exportDistributionNoveli } from '../../../utils/manuscriptUtils';
import { generateId } from '../../../utils/common';

interface CustomizeToolbarModalProps {
    settings: EditorSettings;
    currentVisibility: Partial<ToolbarVisibility>;
    onSave: (visibility: ToolbarVisibility) => void;
    onClose: () => void;
    onSaveProject: () => Promise<boolean>;
    hasContent: boolean;
}

const ALL_TOOLBAR_ITEMS: { key: keyof ToolbarVisibility; label: string }[] = [
    { key: 'stats', label: 'Stats Dashboard' },
    { key: 'notes', label: 'Notes Panel' },
    { key: 'findReplace', label: 'Find & Replace' },
    { key: 'shortcuts', label: 'Shortcuts' },
    { key: 'spellcheck', label: 'Spellcheck & Proofreader' },
    { key: 'sound', label: 'Typing Sound Toggle' },
    { key: 'fullscreen', label: 'Fullscreen Toggle' },
    { key: 'focus', label: 'Focus Mode Toggle' },
    { key: 'pageTransition', label: 'Page Transition Style' },
    { key: 'readAloud', label: 'Read Aloud (TTS)'},
    { key: 'designGallery', label: 'Design Gallery' },
    { key: 'history', label: 'Version History' },
    { key: 'alignment', label: 'Text Alignment' },
    { key: 'lineHeight', label: 'Line Spacing' },
    { key: 'userGuide', label: 'User Guide' },
];

export const CustomizeToolbarModal: React.FC<CustomizeToolbarModalProps> = ({ settings, currentVisibility, onSave, onClose, onSaveProject, hasContent }) => {
    const [visibility, setVisibility] = useState(currentVisibility);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    const handleToggle = (key: keyof ToolbarVisibility) => {
        setVisibility(produce(draft => {
            draft[key] = !draft[key];
        }));
    };

    const handleSaveAndReload = async () => {
        // Save Settings locally
        onSave(visibility as ToolbarVisibility);
        
        // Save Project if needed
        if (hasContent) {
            setIsSaving(true);
            setSaveStatus("Saving Project...");
            try {
                // This triggers the folder selection dialog if no path is set
                // or just saves if path exists.
                // The new auto-reload logic in App.tsx will pick up the saved path.
                const success = await onSaveProject();
                
                if (success) {
                    setSaveStatus("Saved! Reloading...");
                    // Short delay to let the user see the success message
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setSaveStatus(null);
                    setIsSaving(false);
                    // If save cancelled or failed, ask user if they want to proceed anyway
                    if (confirm("Project could not be saved automatically. Reload anyway? Any unsaved changes will be lost.")) {
                        window.location.reload();
                    }
                }
            } catch (e) {
                console.error("Save error during reload:", e);
                setIsSaving(false);
                setSaveStatus("Error saving.");
                alert("An error occurred while saving.");
            }
        } else {
            // Empty project, just reload
            setSaveStatus("Reloading...");
            setTimeout(() => window.location.reload(), 500);
        }
    };

    const handleFactoryReset = () => {
        if (window.confirm("Factory Reset: This will reset all visual settings, toolbar preferences, and the design gallery to their defaults. Your written content (chapters/characters) will NOT be deleted.\n\nThis is useful for applying updates to default assets.\n\nAre you sure?")) {
            localStorage.removeItem('architextSettingsV1');
            localStorage.removeItem('novelosDesignGalleryV1');
            window.location.reload();
        }
    };

    const handleCreateStoreCopy = async () => {
        if (!window.confirm("Create Store-Ready Copy?\n\nThis will generate a ZIP file containing a pristine, empty copy of Noveli.html suitable for distribution or sale (e.g. uploading to Lemon Squeezy).\n\nIt will NOT contain any of your current chapters, characters, or notes.")) {
            return;
        }

        const cleanState: INovelState = {
            characters: [{
                id: generateId(),
                name: 'New Character',
                photo: null,
                rawNotes: '',
                tagline: '',
                summary: '',
                profile: '',
                keywords: [],
                imageColor: '#6b7280',
                accentStyle: 'left-top-ingress',
                isPhotoLocked: false,
                isPrimary: false,
            }],
            chapters: [{
                id: generateId(), 
                title: 'Chapter', 
                chapterNumber: 1, 
                content: '<div><br></div>', 
                notes: '',
                rawNotes: '',
                summary: '',
                outline: '',
                analysis: '',
                photo: null,
                imageColor: '#6b7280',
                isPhotoLocked: false,
                tagline: '',
                keywords: [],
                location: '',
                conflict: '',
                chapterGoal: '',
                accentStyle: 'left-top-ingress',
                linkedSnippetIds: [],
                betaFeedback: '',
                betaFeedbackSummary: '',
                wordCount: 0,
            }],
            snippets: [],
            worldItems: [],
            mapLocations: [],
            globalNotes: 'This is where you can keep global notes for your entire project. They will be saved as part of your project file.',
            socialMediaState: {
                isLoading: false,
                error: null,
                selectedChapterId: null,
                excerpts: [],
                selectedExcerptId: null,
                generatedImagePrompt: null,
                generatedImageUrl: null,
                generatedInstagramPost: null,
                generatedTiktokPost: null,
                postVariations: null,
                variationPlatform: null,
            },
            activeAssemblyPanel: 'chapters',
            assemblyState: {
                selectedCharacterIds: [],
                selectedChapterIds: [],
                expandedCharacterId: null,
                expandedChapterId: null,
                isChapterLinkPanelOpen: false,
                worldPanelView: 'crucible',
                worldCrucibleText: '',
                expandedWorldItemId: null,
                pacingAnalysis: null,
                isGeneratingPacingAnalysis: false,
                mapState: {
                    pan: { x: 0, y: 0 },
                    zoom: 1,
                },
            },
            plotBrainstormState: {
                pacingAndStructureAnalysis: null,
                characterAnalysis: null,
                opportunityAnalysis: null,
                isGeneratingPacingAndStructure: false,
                isGeneratingCharacters: false,
                isGeneratingOpportunities: false,
                error: null,
                selectedCharacter1IdForRelationship: null,
                selectedCharacter2IdForRelationship: null,
                isGeneratingRelationshipAnalysis: false,
                relationshipAnalysis: null,
                isGeneratingThemes: false,
                thematicAnalysis: null,
                selectedTheme: null,
                isGeneratingChekhovsGuns: false,
                chekhovsGuns: null,
                selectedCharacterIdForArcTest: null,
                isGeneratingArcTest: false,
                arcTestResult: null,
            },
            synopsisState: {
                marketAnalysis: null,
                promotionalContent: null,
                synopsis: null,
                isGeneratingMarketAnalysis: false,
                isGeneratingPromotionalContent: false,
                isGeneratingSynopsis: false,
                error: null,
            },
            whatIfState: {
                isOpen: false,
                isLoading: false,
                originalText: null,
                suggestions: null,
                error: null,
                position: null,
            },
        };

        const defaultSettings: EditorSettings = {
            fontFamily: 'Lora',
            fontSize: 1.4,
            lineHeight: 1.8,
            backgroundColor: '#111827',
            textColor: '#FFFFFF',
            textAlign: 'left',
            backgroundImage: null,
            backgroundImageOpacity: 0.5,
            toolbarBg: '#1F2937',
            toolbarText: '#FFFFFF',
            toolbarButtonBg: '#374151',
            toolbarButtonHoverBg: '#4B5563',
            toolbarInputBorderColor: '#4B5563',
            accentColor: '#2563eb',
            accentColorHover: '#1d4ed8',
            successColor: '#16a34a',
            successColorHover: '#15803d',
            dangerColor: '#be123c',
            dangerColorHover: '#9f1239',
            dropdownBg: '#374151',
            transitionStyle: 'scroll',
            toolbarVisibility: {
                stats: true,
                notes: true,
                findReplace: true,
                shortcuts: true,
                spellcheck: true,
                sound: true,
                fullscreen: true,
                focus: true,
                pageTransition: true,
                readAloud: true,
                designGallery: true,
                history: true,
                alignment: true,
                lineHeight: true,
                userGuide: true,
            },
            assemblyTileStyle: 'solid',
            assemblyFontFamily: 'Inter',
            narratorVoice: 'Kore',
            ttsAccent: 'en-GB',
            ttsSpeed: 1.2,
            ttsVolume: 0.6,
            soundVolume: 0.75,
            isSoundEnabled: false,
            galleryStartupBehavior: 'fixed',
            showBookSpine: false,
        };

        await exportDistributionNoveli(cleanState, defaultSettings);
    };

    const footerContent = (
        <button
            onClick={handleSaveAndReload}
            disabled={isSaving}
            className="px-6 py-2 rounded-md text-white flex items-center justify-center gap-2 font-medium min-w-[160px]"
            style={{ backgroundColor: settings.successColor }}
            onMouseEnter={e => { if(!isSaving) e.currentTarget.style.backgroundColor = settings.successColorHover || '' }}
            onMouseLeave={e => { if(!isSaving) e.currentTarget.style.backgroundColor = settings.successColor || '' }}
        >
            {isSaving ? (
                <>
                    <SpinnerIcon className="h-4 w-4 text-white" />
                    {saveStatus}
                </>
            ) : (
                "Save & Reload"
            )}
        </button>
    );

    return (
        <Modal onClose={onClose} settings={settings} title="Settings & Toolbar" className="max-w-md" footer={footerContent}>
            <div className="space-y-6">
                
                <div>
                    <h3 className="font-semibold text-sm mb-3">Toolbar Visibility</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {ALL_TOOLBAR_ITEMS.map(({ key, label }) => (
                            <label key={key} className="flex items-center space-x-3 p-2 rounded cursor-pointer" style={{backgroundColor: settings.toolbarButtonBg}}>
                                <input
                                    type="checkbox"
                                    checked={!!visibility[key]}
                                    onChange={() => handleToggle(key)}
                                    className="rounded"
                                    style={{color: settings.accentColor}}
                                />
                                <span className="text-sm">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Advanced / Reset Section */}
                <div className="pt-4 mt-4 border-t space-y-3" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <h3 className="font-semibold text-xs opacity-50 uppercase tracking-wider">Advanced</h3>

                    <button
                        onClick={handleFactoryReset}
                        className="w-full px-4 py-2 rounded-md text-sm border flex items-center justify-center gap-2 transition-colors mt-4"
                        style={{ 
                            borderColor: settings.dangerColor, 
                            color: settings.dangerColor,
                            backgroundColor: 'transparent'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = `${settings.dangerColor}15`}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <TrashIconOutline className="h-4 w-4" />
                        Reset All Settings to Default
                    </button>

                    <button
                        onClick={handleCreateStoreCopy}
                        className="w-full px-4 py-2 rounded-md text-sm border flex items-center justify-center gap-2 transition-colors mt-2"
                        style={{ 
                            borderColor: settings.accentColor, 
                            color: settings.accentColor,
                            backgroundColor: 'transparent'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = `${settings.accentColor}15`}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ShareIcon className="h-4 w-4" />
                        Create Store-Ready Copy (Distribution)
                    </button>
                </div>
            </div>
        </Modal>
    );
};
