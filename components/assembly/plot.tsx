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
        <div className="w-full h-40 relative overflow-x-auto rounded-xl border bg-black/10 transition-colors" style={{ borderColor: `${settings.textColor}10` }} onMouseLeave={() => setTooltip(null)}>
            <svg width={Math.max(800, maxChapter * 60 + 100)} height="160" className="min-w-full">
                <line x1="50" y1="80" x2={Math.max(750, maxChapter * 60 + 50)} y2="80" stroke={settings.textColor} strokeWidth="2" strokeDasharray="6,6" opacity="0.1" />
                {plotPoints.map((p, i) => {
                    const x = 50 + (p.chapterNumber - 1) * 60;
                    return (
                        <g key={p.id} onMouseMove={(e) => setTooltip({ content: `Ch ${p.chapterNumber}: ${p.title}`, x: e.clientX, y: e.clientY })} className="cursor-pointer group">
                            <circle cx={x} cy="80" r="8" fill={typeColors[p.type] || settings.accentColor} className="transition-transform group-hover:scale-125" />
                            <text x={x} y="110" textAnchor="middle" fill={settings.textColor} fontSize="10" className="font-bold opacity-30 group-hover:opacity-100 transition-opacity">CH {p.chapterNumber}</text>
                        </g>
                    );
                })}
            </svg>
            {tooltip && <div className="fixed z-50 p-3 rounded-xl shadow-2xl text-[11px] font-bold tracking-tight backdrop-blur-xl border" style={{ top: tooltip.y + 15, left: tooltip.x + 15, backgroundColor: `${settings.toolbarBg}E6`, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}>{tooltip.content}</div>}
        </div>
    );
};

export const PlotBrainstormPanel: React.FC<{ settings: EditorSettings; plotState: PlotBrainstormState; }> = ({ settings, plotState }) => {
    const { chapters } = useNovelState();
    const { onGenerateFullAnalysis } = useAssemblyAI();
    const { pacingAndStructureAnalysis, characterAnalysis, opportunityAnalysis, isGeneratingPacingAndStructure, error } = plotState;

    return (
        <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto" style={{ color: settings.textColor }}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: settings.textColor }}>
                        <LightbulbIcon className="h-8 w-8 text-yellow-400" /> Plot Engineering
                    </h2>
                    <p className="text-sm opacity-60 mt-1" style={{ color: settings.textColor }}>Deep structural analysis and developmental feedback.</p>
                </div>
                <button 
                    onClick={onGenerateFullAnalysis} 
                    disabled={isGeneratingPacingAndStructure} 
                    className="px-8 py-3 rounded-2xl font-bold text-sm text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3" 
                    style={{ backgroundColor: settings.accentColor }}
                >
                    {isGeneratingPacingAndStructure ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                    {isGeneratingPacingAndStructure ? 'CALCULATING STRUCTURE...' : 'RUN FULL ANALYSIS'}
                </button>
            </div>

            {pacingAndStructureAnalysis ? (
                <div className="space-y-6 animate-in fade-in duration-700">
                    <div className="p-8 rounded-3xl border space-y-6" style={{ backgroundColor: `${settings.toolbarButtonBg}40`, borderColor: settings.toolbarInputBorderColor }}>
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 ml-1" style={{ color: settings.textColor }}>Narrative Pulse & Milestones</h3>
                        <PlotTimeline plotPoints={pacingAndStructureAnalysis.plotPoints} chapters={chapters} settings={settings} />
                        <div className="prose-container max-w-4xl text-lg leading-relaxed opacity-90">
                            <MarkdownRenderer source={pacingAndStructureAnalysis.summary} settings={settings} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-3xl border space-y-4 h-full flex flex-col" style={{ backgroundColor: `${settings.toolbarButtonBg}40`, borderColor: settings.toolbarInputBorderColor }}>
                            <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 ml-1" style={{ color: settings.textColor }}>Arc Integrity Report</h3>
                            <div className="flex-grow prose-container opacity-90 text-sm font-medium leading-relaxed overflow-y-auto">
                                <MarkdownRenderer source={characterAnalysis || 'Awaiting analysis...'} settings={settings} />
                            </div>
                        </div>
                        <div className="p-8 rounded-3xl border space-y-4 h-full flex flex-col" style={{ backgroundColor: `${settings.toolbarButtonBg}40`, borderColor: settings.toolbarInputBorderColor }}>
                            <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 ml-1" style={{ color: settings.textColor }}>Twists & Hidden Assets</h3>
                            <div className="flex-grow prose-container opacity-90 text-sm font-medium leading-relaxed overflow-y-auto">
                                <MarkdownRenderer source={opportunityAnalysis || 'Awaiting analysis...'} settings={settings} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20 py-20" style={{ color: settings.textColor }}>
                    <SparklesIconOutline className="h-32 w-32 mb-8" />
                    <h3 className="text-3xl italic">Structural analysis will appear here.</h3>
                    <p className="text-lg mt-4 max-w-md mx-auto leading-relaxed">Run the analysis to map your plot points and evaluate your story's pacing and thematic depth.</p>
                </div>
            )}
            {error && <div className="max-w-md mx-auto"><AIError message={error} /></div>}
        </div>
    );
};