import React, { useCallback, useContext } from 'react';
import type { EditorSettings, SynopsisState } from '../../types';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { SparklesIconOutline, SpinnerIcon, DocumentTextIcon, RefreshIcon } from '../common/Icons';

interface SynopsisSectionProps {
    title: string;
    description: string;
    content: string | null;
    isLoading: boolean;
    onRegenerate: () => void;
    settings: EditorSettings;
}

const SynopsisSection: React.FC<SynopsisSectionProps> = ({ title, description, content, isLoading, onRegenerate, settings }) => {
    return (
        <div className="p-4 rounded-lg flex flex-col" style={{ backgroundColor: settings.toolbarButtonBg }}>
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-xs opacity-70">{description}</p>
                </div>
                {content && (
                    <button 
                        onClick={onRegenerate} 
                        disabled={isLoading}
                        className="p-2 rounded-md flex items-center gap-2 text-xs disabled:opacity-50"
                        style={{ backgroundColor: settings.toolbarBg }}
                    >
                        {isLoading ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                        Regenerate
                    </button>
                )}
            </div>
            <div 
                className="flex-grow p-4 rounded min-h-[10rem] overflow-y-auto"
                style={{ backgroundColor: settings.backgroundColor }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <SpinnerIcon className="h-8 w-8" />
                    </div>
                ) : content ? (
                    <MarkdownRenderer source={content} settings={settings} />
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-sm opacity-60">
                        Analysis will appear here.
                    </div>
                )}
            </div>
        </div>
    );
};


interface SynopsisPanelProps {
    settings: EditorSettings;
    synopsisState: SynopsisState;
}

export const SynopsisPanel: React.FC<SynopsisPanelProps> = ({ settings, synopsisState }) => {
    const { 
        onGenerateFullSynopsis,
        onRegenerateMarketAnalysis,
        onRegeneratePromotionalContent,
        onRegenerateSynopsis,
    } = useAssemblyAI();

    const { 
        marketAnalysis, promotionalContent, synopsis,
        isGeneratingMarketAnalysis, isGeneratingPromotionalContent, isGeneratingSynopsis, error 
    } = synopsisState;
    
    const hasGeneratedAnything = marketAnalysis || promotionalContent || synopsis;
    const isGeneratingAnything = isGeneratingMarketAnalysis || isGeneratingPromotionalContent || isGeneratingSynopsis;

    const handleGenerate = useCallback(() => {
        if (isGeneratingAnything) return;
        onGenerateFullSynopsis();
    }, [isGeneratingAnything, onGenerateFullSynopsis]);
    
    return (
        <div className="w-full h-full flex flex-col p-4" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            <div className="flex-shrink-0 flex items-center justify-between gap-2 mb-4">
                 <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-6 w-6" />
                    <h2 className="text-xl font-bold">Synopsis & Marketing</h2>
                 </div>
                 {!hasGeneratedAnything && !isGeneratingAnything && (
                     <button
                        onClick={handleGenerate}
                        className="px-4 py-2 rounded-md text-sm font-medium flex items-center text-white"
                        style={{ backgroundColor: settings.accentColor }}
                     >
                        Generate Synopsis & Marketing
                     </button>
                 )}
            </div>
            
            <div className="flex-grow min-h-0 overflow-y-auto pr-2 space-y-4">
                {!hasGeneratedAnything && !isGeneratingAnything ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-center p-8" style={{ color: `${settings.textColor}99` }}>
                        <DocumentTextIcon className="h-16 w-16 mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold">Distill Your Story's Essence</h3>
                        <p className="mt-2 text-sm max-w-lg">
                           Click the button above for the AI to analyze your entire novel structure and produce professional marketing materials and a full synopsis.
                        </p>
                    </div>
                ) : (
                    <>
                        <SynopsisSection
                            title="Market Analysis"
                            description="BISAC codes, keywords, tropes, and comp titles for positioning your novel."
                            content={marketAnalysis}
                            isLoading={isGeneratingMarketAnalysis}
                            onRegenerate={onRegenerateMarketAnalysis}
                            settings={settings}
                        />
                         <SynopsisSection
                            title="Promotional Content"
                            description="Taglines, a logline, song lyrics, and an ideal reader profile."
                            content={promotionalContent}
                            isLoading={isGeneratingPromotionalContent}
                            onRegenerate={onRegeneratePromotionalContent}
                            settings={settings}
                        />
                         <SynopsisSection
                            title="Synopsis Generation"
                            description="A short, query-ready synopsis and a detailed long synopsis."
                            content={synopsis}
                            isLoading={isGeneratingSynopsis}
                            onRegenerate={onRegenerateSynopsis}
                            settings={settings}
                        />
                    </>
                )}
                 {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
            </div>
        </div>
    );
};