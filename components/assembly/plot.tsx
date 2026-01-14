import React, { useState, useMemo } from 'react';
import type { EditorSettings, PlotBrainstormState, PlotPoint, IChapter, ICharacter } from '../../types';
import { useAssemblyAI } from './AssemblyAIContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { SparklesIconOutline, SpinnerIcon, LightbulbIcon, RefreshIcon } from '../common/Icons';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { AIError } from '../common/AIError';

const PlotTimeline: React.FC<{ plotPoints: PlotPoint[]; chapters: IChapter[]; settings: EditorSettings; }> = ({ plotPoints, chapters, settings }) => {
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    const maxChapter = useMemo(() => Math.max(...chapters.map(c => c.chapterNumber), 0), [chapters]);
    const typeColors: Record<string, string> = { 'Inciting Incident': '#facc15', 'Climax': '#f43f5e', 'Resolution': '#4ade80', 'Rising Action': '#38bdf8' };

    return (
        <div className="w-full h-32 relative overflow-x-auto border-b border-white/5" onMouseLeave={() => setTooltip(null)}>
            <svg width={Math.max(800, maxChapter * 50 + 100)} height="120" className="min-w-full">
                <line x1="50" y1="60" x2={Math.max(750, maxChapter * 50 + 50)} y2="60" stroke={settings.toolbarInputBorderColor} strokeWidth="2" strokeDasharray="4,4" opacity="0.3" />
                {plotPoints.map((p, i) => {
                    const x = 50 + (p.chapterNumber - 1) * 50;
                    return (
                        <g key={p.id} onMouseMove={(e) => setTooltip({ content: `Ch ${p.chapterNumber}: ${p.title}`, x: e.clientX, y: e.clientY })} className="cursor-help">
                            <circle cx={x} cy="60" r="6" fill={typeColors[p.type] || settings.accentColor} />
                            <text x={x} y="85" textAnchor="middle" fill={settings.textColor} fontSize="10" opacity="0.5">{p.chapterNumber}</text>
                        </g>
                    );
                })}
            </svg>
            {tooltip && <div className="fixed z-50 p-2 rounded shadow-lg text-xs backdrop-blur-md border border-white/10" style={{ top: tooltip.y + 10, left: tooltip.x + 10, backgroundColor: settings.toolbarBg, color: settings.textColor }}>{tooltip.content}</div>}
        </div>
    );
};

export const PlotBrainstormPanel: React.FC<{ settings: EditorSettings; plotState: PlotBrainstormState; }> = ({ settings, plotState }) => {
    const { chapters } = useNovelState();
    const { onGenerateFullAnalysis } = useAssemblyAI();
    const { pacingAndStructureAnalysis, characterAnalysis, opportunityAnalysis, isGeneratingPacingAndStructure, error } = plotState;

    return (
        <div className="w-full h-full flex flex-col p-6 space-y-6 overflow-y-auto" style={{ backgroundColor: `${settings.toolbarButtonBg}20` }}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold flex items-center gap-3"><LightbulbIcon className="h-7 w-7 text-yellow-400" /> Plot Brainstorming</h2>
                <button onClick={onGenerateFullAnalysis} disabled={isGeneratingPacingAndStructure} className="px-6 py-2 rounded-full font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50" style={{ backgroundColor: settings.accentColor }}>
                    {isGeneratingPacingAndStructure ? <SpinnerIcon className="mr-2 inline" /> : <SparklesIconOutline className="mr-2 inline" />}
                    Analyze Novel Structure
                </button>
            </div>

            {pacingAndStructureAnalysis && (
                <div className="p-6 rounded-xl border space-y-4" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                    <h3 className="font-bold text-lg border-b pb-2" style={{ borderColor: settings.toolbarInputBorderColor }}>Narrative Timeline</h3>
                    <PlotTimeline plotPoints={pacingAndStructureAnalysis.plotPoints} chapters={chapters} settings={settings} />
                    <MarkdownRenderer source={pacingAndStructureAnalysis.summary} settings={settings} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {characterAnalysis && (
                    <div className="p-5 rounded-xl border" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                        <h3 className="font-bold mb-3 opacity-70 uppercase tracking-widest text-xs">Arc Consistency</h3>
                        <MarkdownRenderer source={characterAnalysis} settings={settings} />
                    </div>
                )}
                {opportunityAnalysis && (
                    <div className="p-5 rounded-xl border" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
                        <h3 className="font-bold mb-3 opacity-70 uppercase tracking-widest text-xs">Twists & Foreshadowing</h3>
                        <MarkdownRenderer source={opportunityAnalysis} settings={settings} />
                    </div>
                )}
            </div>
            {error && <AIError message={error} />}
        </div>
    );
};
