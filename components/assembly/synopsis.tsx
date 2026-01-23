import React, { useCallback, useContext } from 'react';
import type { EditorSettings, SynopsisState } from '../../types';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { SparklesIconOutline, SpinnerIcon, DocumentTextIcon, RefreshIcon, ShareIcon } from '../common/Icons';
import { AIError } from '../common/AIError';

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
        <div className="p-8 rounded-3xl border flex flex-col gap-6" style={{ backgroundColor: `${settings.toolbarButtonBg}40`, borderColor: settings.toolbarInputBorderColor }}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 ml-1" style={{ color: settings.textColor }}>{title}</h3>
                    <p className="text-xs italic opacity-60 mt-1" style={{ color: settings.textColor }}>{description}</p>
                </div>
                {content && (
                    <div className="flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(content)} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors" style={{ color: settings.textColor }} title="Copy">
                            <ShareIcon className="h-4 w-4" />
                        </button>
                        <button onClick={onRegenerate} disabled={isLoading} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50" style={{ color: settings.textColor }}>
                            {isLoading ? <SpinnerIcon className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-grow p-6 rounded-2xl bg-black/10 min-h-[12rem] overflow-y-auto border border-white/5 shadow-inner">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30 font-bold tracking-widest text-[10px]" style={{ color: settings.textColor }}>
                        <SpinnerIcon className="h-10 w-10" />
                        <span>SYNTHESIZING...</span>
                    </div>
                ) : content ? (
                    <div className="prose-container text-lg leading-relaxed opacity-90">
                        <MarkdownRenderer source={content} settings={settings} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-sm italic opacity-20" style={{ color: settings.textColor }}>
                        Awaiting generation.
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
    const { onGenerateFullSynopsis, onRegenerateMarketAnalysis, onRegeneratePromotionalContent, onRegenerateSynopsis, onSetError } = useAssemblyAI();
    const { marketAnalysis, promotionalContent, synopsis, isGeneratingMarketAnalysis, isGeneratingPromotionalContent, isGeneratingSynopsis, error } = synopsisState;
    const hasGeneratedAnything = marketAnalysis || promotionalContent || synopsis;
    const isGeneratingAnything = isGeneratingMarketAnalysis || isGeneratingPromotionalContent || isGeneratingSynopsis;

    return (
        <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto" style={{ color: settings.textColor }}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <DocumentTextIcon className="h-8 w-8 text-yellow-400" /> Synopsis & Marketing
                    </h2>
                    <p className="text-sm opacity-60 mt-1" style={{ color: settings.textColor }}>Distill your manuscript into industry-ready artifacts.</p>
                </div>
                {!hasGeneratedAnything && !isGeneratingAnything && (
                    <button onClick={onGenerateFullSynopsis} disabled={isGeneratingAnything} className="px-10 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl flex items-center gap-3 transition-transform active:scale-95" style={{ backgroundColor: settings.accentColor }}>
                        <SparklesIconOutline className="h-5 w-5" />
                        GENERATE FULL PACKAGE
                    </button>
                )}
            </div>
            
            <div className="flex-grow space-y-8 pb-10">
                {!hasGeneratedAnything && !isGeneratingAnything ? (
                     <div className="flex flex-col items-center justify-center text-center opacity-20 py-20" style={{ color: settings.textColor }}>
                        <DocumentTextIcon className="h-32 w-32 mb-8" />
                        <h3 className="text-3xl italic max-w-2xl mx-auto">Prepare your novel for the world.</h3>
                        <p className="text-lg mt-4 max-w-lg mx-auto leading-relaxed">The AI will analyze your entire story board to generate BISAC codes, taglines, comps, and both short and long synopses.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-1000">
                        <SynopsisSection title="Positioning & Market" description="Tropes, Comp Titles, and Keywords." content={marketAnalysis} isLoading={isGeneratingMarketAnalysis} onRegenerate={onRegenerateMarketAnalysis} settings={settings} />
                        <SynopsisSection title="Creative Promotions" description="Taglines, Loglines, and Reader Persona." content={promotionalContent} isLoading={isGeneratingPromotionalContent} onRegenerate={onRegeneratePromotionalContent} settings={settings} />
                        <div className="xl:col-span-2">
                             <SynopsisSection title="Story Synopsis" description="Complete narrative overview for queries and outlines." content={synopsis} isLoading={isGeneratingSynopsis} onRegenerate={onRegenerateSynopsis} settings={settings} />
                        </div>
                    </div>
                )}
            </div>
            {error && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"><AIError message={error} onDismiss={() => onSetError(null)} /></div>}
        </div>
    );
};