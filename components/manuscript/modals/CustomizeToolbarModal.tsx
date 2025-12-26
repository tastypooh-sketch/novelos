
import React, { useState, useEffect } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import type { EditorSettings, ToolbarVisibility, AppUpdate } from '../../../types';
import { TrashIconOutline, SpinnerIcon, SparklesIconOutline, RefreshIcon } from '../../common/Icons';
import MarkdownRenderer from '../../common/MarkdownRenderer';

interface CustomizeToolbarModalProps {
    settings: EditorSettings;
    currentVisibility: Partial<ToolbarVisibility>;
    onSave: (visibility: ToolbarVisibility) => void;
    onClose: () => void;
    onSaveProject: () => Promise<boolean>;
    hasContent: boolean;
    appUpdate?: AppUpdate | null;
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

export const CustomizeToolbarModal: React.FC<CustomizeToolbarModalProps> = ({ settings, currentVisibility, onSave, onClose, onSaveProject, hasContent, appUpdate: initialUpdate }) => {
    const [visibility, setVisibility] = useState(currentVisibility);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [activeUpdate, setActiveUpdate] = useState<AppUpdate | null>(initialUpdate || null);

    const handleToggle = (key: keyof ToolbarVisibility) => {
        setVisibility(produce(draft => {
            draft[key] = !draft[key];
        }));
    };

    const handleCheckUpdate = async () => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            setCheckingUpdate(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.checkForUpdates();
                setActiveUpdate(result && result.isNewer ? result : null);
                if (result && !result.isNewer) {
                    alert("You are on the latest version of Novelos!");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setCheckingUpdate(false);
            }
        }
    };

    const handleSaveAndReload = async () => {
        onSave(visibility as ToolbarVisibility);
        
        if (hasContent) {
            setIsSaving(true);
            setSaveStatus("Saving Project...");
            try {
                const success = await onSaveProject();
                
                if (success) {
                    setSaveStatus("Saved! Reloading...");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    setSaveStatus(null);
                    setIsSaving(false);
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
        <Modal onClose={onClose} settings={settings} title="Settings & Toolbar" className="max-w-xl" footer={footerContent}>
            <div className="space-y-8">
                
                {/* App Update Section */}
                {activeUpdate ? (
                    <div className="p-4 rounded-lg border-2 animate-in slide-in-from-top duration-500" style={{ backgroundColor: `${settings.accentColor}15`, borderColor: settings.accentColor }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <SparklesIconOutline className="h-5 w-5" style={{ color: settings.accentColor }} />
                                <h3 className="font-bold text-lg">Update Recommended</h3>
                            </div>
                            <span className="text-xs font-mono px-2 py-1 rounded bg-black/20">{activeUpdate.currentVersion} → {activeUpdate.latestVersion}</span>
                        </div>
                        
                        <div className="text-sm space-y-2 mb-4 opacity-90 max-h-40 overflow-y-auto pr-2 bg-black/10 p-3 rounded border border-white/5">
                            <h4 className="font-bold text-xs uppercase opacity-50 mb-1">Release Notes</h4>
                            <MarkdownRenderer source={activeUpdate.releaseNotes} settings={settings} />
                        </div>

                        <a 
                            href={activeUpdate.updateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2.5 rounded-md text-white font-bold shadow-lg transition-transform active:scale-95 mb-2"
                            style={{ backgroundColor: settings.accentColor }}
                        >
                            Download from Lemon Squeezy
                        </a>
                        <p className="text-[10px] text-center opacity-50 italic">Updates are provided as full installers. Your novel and settings will stay safe.</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-dashed" style={{ borderColor: settings.toolbarInputBorderColor }}>
                        <div className="flex flex-col">
                            <span className="text-xs opacity-50 uppercase font-bold tracking-widest">System Status</span>
                            <span className="text-sm font-medium">Novelos is up to date (v7.0.9)</span>
                        </div>
                        <button 
                            onClick={handleCheckUpdate}
                            disabled={checkingUpdate}
                            className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/20 hover:bg-black/40 text-xs transition-colors disabled:opacity-50"
                        >
                            {checkingUpdate ? <SpinnerIcon className="h-3 w-3" /> : <RefreshIcon className="h-3 w-3" />}
                            Check for Updates
                        </button>
                    </div>
                )}

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
                        Reset All UI Settings
                    </button>
                </div>
            </div>
        </Modal>
    );
};
