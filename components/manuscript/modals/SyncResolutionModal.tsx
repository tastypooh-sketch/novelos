
import React, { useState } from 'react';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';
import { CloudSyncIcon, SpinnerIcon, RefreshIcon } from '../../common/Icons';

interface SyncResolutionModalProps {
    settings: EditorSettings;
    onResolve: (file: File | null) => Promise<void>; // Pass null if user cancels/chooses local
    desktopDate?: Date;
}

export const SyncResolutionModal: React.FC<SyncResolutionModalProps> = ({ settings, onResolve, desktopDate }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = async (file: File) => {
        setIsProcessing(true);
        // We pass the file back to App.tsx to do the comparison and loading
        await onResolve(file);
        setIsProcessing(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleSkip = () => {
        if (confirm("Are you sure? Any work done on the portable version will be overwritten if you save now.")) {
            onResolve(null);
        }
    };

    return (
        <Modal onClose={() => {}} settings={settings} title="Sync Required" className="max-w-xl">
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                        <CloudSyncIcon className="w-12 h-12" />
                    </div>
                </div>
                
                <div>
                    <h3 className="text-xl font-bold mb-2">Portable Work Detected</h3>
                    <p className="opacity-80 text-sm">
                        You exported a portable copy of this project recently. To prevent data loss, please import the latest 
                        <strong> .zip</strong> file from your portable device (USB drive, etc.).
                    </p>
                    {desktopDate && (
                        <p className="text-xs opacity-60 mt-2">
                            Last Desktop Save: {desktopDate.toLocaleString()}
                        </p>
                    )}
                </div>

                <div 
                    className={`border-2 border-dashed rounded-xl p-8 transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-gray-600'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {isProcessing ? (
                        <div className="flex flex-col items-center">
                            <SpinnerIcon className="w-8 h-8 mb-2" />
                            <p>Analyzing Timestamp...</p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-4 font-semibold">Drop "Project_Name_Date.zip" here</p>
                            <label className="px-4 py-2 rounded cursor-pointer text-white text-sm font-medium transition-colors hover:opacity-90" style={{backgroundColor: settings.accentColor}}>
                                Browse Files
                                <input type="file" accept=".zip" onChange={handleInputChange} className="hidden" />
                            </label>
                        </>
                    )}
                </div>

                <div className="pt-4 border-t border-gray-700">
                    <button onClick={handleSkip} className="text-xs underline opacity-50 hover:opacity-100 hover:text-red-400">
                        I didn't work on the portable version (Skip Sync)
                    </button>
                </div>
            </div>
        </Modal>
    );
};
