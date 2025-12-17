
import React, { useState } from 'react';
import { produce } from 'immer';
import { Modal } from './Modal';
import type { EditorSettings, ToolbarVisibility } from '../../../types';
import { TrashIconOutline, SpinnerIcon } from '../../common/Icons';

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
                </div>
            </div>
        </Modal>
    );
};
