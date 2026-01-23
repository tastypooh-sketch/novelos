
import React, { useMemo } from 'react';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';
import { AUTO_CORRECTIONS } from '../Manuscript';
import { SparklesIconOutline } from '../../common/Icons';

interface AutoCorrectionModalProps {
    settings: EditorSettings;
    onSettingsChange: (settings: Partial<EditorSettings>) => void;
    onClose: () => void;
}

export const AutoCorrectionModal: React.FC<AutoCorrectionModalProps> = ({ settings, onSettingsChange, onClose }) => {
    const isEnabled = settings.isAutoCorrectEnabled !== false;

    const groupedRules = useMemo(() => {
        const groups: Record<string, typeof AUTO_CORRECTIONS> = {};
        AUTO_CORRECTIONS.forEach(rule => {
            const cat = rule.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(rule);
        });
        return groups;
    }, []);

    return (
        <Modal onClose={onClose} settings={settings} title="Auto-Correction Settings" className="max-w-2xl">
            <div className="space-y-6">
                <div className="p-4 rounded-lg bg-black/10 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SparklesIconOutline className="h-6 w-6 text-blue-400" />
                        <div>
                            <h3 className="font-bold">Enable Magic Auto-Correction</h3>
                            <p className="text-xs opacity-60">Corrections happen automatically after a 2-second pause in typing.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onSettingsChange({ isAutoCorrectEnabled: !isEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent`}
                        style={{ backgroundColor: isEnabled ? settings.accentColor : '#4b5563' }}
                    >
                        <span
                            className={`${isEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                </div>

                <div className="space-y-6 opacity-90">
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Active Rules List</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(groupedRules).map(([category, rules]) => (
                            <div key={category} className="space-y-2">
                                <h4 className="text-xs font-bold text-blue-400 mb-2 border-b border-white/5 pb-1">{category}</h4>
                                <div className="space-y-1.5">
                                    {/* Fix: Explicitly cast rules to any[] to satisfy the compiler that it's a mapable array */}
                                    {(rules as any[]).map((rule, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-black/10">
                                            <span className="opacity-80">{rule.label}</span>
                                            <div className="flex items-center gap-2 font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                                                <span className="opacity-50">"{(rule.find as RegExp).source}"</span>
                                                <span className="text-blue-400">→</span>
                                                <span className="text-green-400">"{rule.replace}"</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-white/10 text-center">
                    <p className="text-[10px] opacity-40">Auto-corrections use character-offset caret preservation to ensure zero disruption to your flow.</p>
                </div>
            </div>
        </Modal>
    );
};
