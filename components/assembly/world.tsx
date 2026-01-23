import React, { useState, useCallback, useMemo, useContext, useEffect, useRef } from 'react';
import type { EditorSettings, IWorldItem, IMapLocation } from '../../types';
import { useNovelDispatch, useNovelState } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import { SparklesIconOutline, SpinnerIcon, TrashIconOutline, ChevronDownIcon, ChevronUpIcon, MapIcon, MapPinIcon, PlusIcon, DocumentTextIcon, UserCircleIcon, BookIcon, GlobeAltIcon } from '../common/Icons';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { generateId } from '../../utils/common';
import { AIError } from '../common/AIError';

const PinEditor: React.FC<{
    pin: IMapLocation;
    onSave: (id: string, updates: Partial<IMapLocation>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    settings: EditorSettings;
}> = ({ pin, onSave, onDelete, onClose, settings }) => {
    const [name, setName] = useState(pin.name);
    const [description, setDescription] = useState(pin.description);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute z-20 w-64 p-4 rounded-xl shadow-2xl border" style={{ backgroundColor: settings.toolbarBg, color: settings.textColor, borderColor: settings.toolbarInputBorderColor, transform: 'translate(20px, -50%)' }}>
            <div className="space-y-3">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Location Name" className="w-full px-3 py-2 rounded-lg border text-sm font-bold bg-transparent" style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." rows={3} className="w-full px-3 py-2 rounded-lg border text-xs resize-none bg-transparent" style={{ borderColor: settings.toolbarInputBorderColor, color: settings.textColor }} />
            </div>
            <div className="flex justify-between items-center mt-4">
                <button onClick={() => onDelete(pin.id)} className="p-2 rounded-lg text-white hover:opacity-90" style={{ backgroundColor: settings.dangerColor }}><TrashIconOutline className="h-4 w-4" /></button>
                <button onClick={() => { onSave(pin.id, { name, description }); onClose(); }} className="px-6 py-2 text-xs font-bold rounded-lg text-white hover:opacity-90 transition-transform active:scale-95 shadow-lg" style={{ backgroundColor: settings.accentColor }}>SAVE PIN</button>
            </div>
        </div>
    );
};

const MapBuilder: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { mapLocations, assemblyState: { mapState } } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onSuggestLocations, isGeneratingMap } = useAssemblyAI();
    const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const isPanning = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const map = mapRef.current; if (!map) return;
        const rect = map.getBoundingClientRect();
        const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
        const zoomFactor = 1.1;
        const newZoom = Math.max(0.2, Math.min(5, e.deltaY < 0 ? mapState.zoom * zoomFactor : mapState.zoom / zoomFactor));
        const newPanX = mouseX - (mouseX - mapState.pan.x) * (newZoom / mapState.zoom);
        const newPanY = mouseY - (mouseY - mapState.pan.y) * (newZoom / mapState.zoom);
        dispatch({ type: 'UPDATE_MAP_STATE', payload: { zoom: newZoom, pan: { x: newPanX, y: newPanY } } });
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.pin-editor') || (e.target as HTMLElement).closest('.map-pin')) return;
        isPanning.current = true; lastPos.current = { x: e.clientX, y: e.clientY };
        if (mapRef.current) mapRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastPos.current.x; const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        dispatch({ type: 'UPDATE_MAP_STATE', payload: { pan: { x: mapState.pan.x + dx, y: mapState.pan.y + dy } } });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!mapRef.current || (e.target as HTMLElement).closest('.map-pin')) return;
        const rect = mapRef.current.getBoundingClientRect();
        const mapX = (e.clientX - rect.left - mapState.pan.x) / mapState.zoom;
        const mapY = (e.clientY - rect.top - mapState.pan.y) / mapState.zoom;
        const newPin = { id: generateId(), name: 'New Location', description: '', x: (mapX / 3000) * 100, y: (mapY / 2000) * 100 };
        dispatch({ type: 'ADD_MAP_LOCATION', payload: newPin });
        setSelectedPinId(newPin.id);
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div ref={mapRef} className="w-full h-full cursor-grab" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => { isPanning.current = false; if (mapRef.current) mapRef.current.style.cursor = 'grab'; }} onMouseLeave={() => { isPanning.current = false; }} onDoubleClick={handleDoubleClick} style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: settings.backgroundColor }}>
                <div className="absolute top-0 left-0" style={{ width: '3000px', height: '2000px', transform: `translate(${mapState.pan.x}px, ${mapState.pan.y}px) scale(${mapState.zoom})`, transformOrigin: '0 0' }}>
                    {mapLocations.map(pin => (
                        <div key={pin.id} className="absolute map-pin cursor-pointer" style={{ left: `${(pin.x/100)*3000}px`, top: `${(pin.y/100)*2000}px`, transform: `translate(-50%, -100%) scale(${1/mapState.zoom})`, transformOrigin: 'bottom center' }} onClick={(e) => { e.stopPropagation(); setSelectedPinId(pin.id); }}>
                            <MapPinIcon className="h-10 w-10 drop-shadow-2xl" style={{ color: settings.accentColor }} />
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150%] bg-black/80 text-white text-[10px] font-bold tracking-tighter px-2 py-0.5 rounded-full whitespace-nowrap shadow-xl border border-white/20">{pin.name}</span>
                            {selectedPinId === pin.id && <PinEditor pin={pin} settings={settings} onSave={(id, updates) => dispatch({ type: 'UPDATE_MAP_LOCATION', payload: { id, updates } })} onDelete={(id) => { dispatch({ type: 'DELETE_MAP_LOCATION', payload: id }); setSelectedPinId(null); }} onClose={() => setSelectedPinId(null)} />}
                        </div>
                    ))}
                </div>
            </div>
             <div className="absolute bottom-6 left-6 flex gap-2">
                <button onClick={() => dispatch({ type: 'UPDATE_MAP_STATE', payload: { zoom: Math.min(5, mapState.zoom * 1.2) } })} className="p-3 rounded-xl shadow-xl border border-white/10 hover:opacity-80 transition-all" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor}}><PlusIcon className="h-5 w-5"/></button>
                <button onClick={() => dispatch({ type: 'UPDATE_MAP_STATE', payload: { zoom: Math.max(0.2, mapState.zoom / 1.2) } })} className="p-3 rounded-xl shadow-xl border border-white/10 hover:opacity-80 transition-all" style={{backgroundColor: settings.toolbarButtonBg, color: settings.textColor}}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
            </div>
             <div className="absolute top-6 right-6">
                <button onClick={onSuggestLocations} disabled={isGeneratingMap} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-xl flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95" style={{ backgroundColor: settings.accentColor }}>
                    {isGeneratingMap ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                    {isGeneratingMap ? 'SCANNING STORY...' : 'SUGGEST LOCATIONS'}
                </button>
            </div>
             <div className="absolute bottom-6 right-6 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 bg-black/40 px-4 py-2 rounded-full pointer-events-none" style={{ color: settings.textColor }}>
                Double-click to create &bull; Scroll to zoom &bull; Drag to pan
            </div>
        </div>
    );
};

const WorldItemCard: React.FC<{ item: IWorldItem; settings: EditorSettings; isExpanded: boolean; onToggleExpand: () => void; }> = ({ item, settings, isExpanded, onToggleExpand }) => {
    const dispatch = useNovelDispatch();
    const { onRefineWorldItem, isGeneratingWorldItem } = useAssemblyAI();
    const isGenerating = isGeneratingWorldItem === item.id;
    const [localName, setLocalName] = useState(item.name);
    const [rawNotes, setRawNotes] = useState(item.rawNotes);

    return (
        <div onClick={(e) => { e.stopPropagation(); if (!isExpanded) onToggleExpand(); }} className={`p-5 rounded-2xl shadow-sm w-full transition-all duration-300 border ${isExpanded ? '' : 'cursor-pointer hover:shadow-lg'}`} style={{backgroundColor: settings.toolbarButtonBg, borderColor: isExpanded ? settings.accentColor : settings.toolbarInputBorderColor }}>
            <div className="flex justify-between items-start gap-4">
                 <div className="flex-grow min-w-0">
                    <input type="text" value={localName} onChange={e => setLocalName(e.target.value)} onBlur={() => localName.trim() && dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates: { name: localName.trim() } } })} className="text-lg font-bold bg-transparent border-none p-0 focus:ring-0 w-full truncate" onClick={e => e.stopPropagation()} style={{ color: settings.textColor }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1" style={{ color: settings.textColor }}>{item.type}</p>
                 </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} className="p-2 rounded-full hover:bg-white/10 transition-colors" style={{ color: settings.textColor }}>
                    {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </button>
            </div>
            {!isExpanded && <p className="text-xs opacity-60 line-clamp-2 mt-3 leading-relaxed" style={{ color: settings.textColor }}>{item.summary || 'No summary available.'}</p>}
            
            {isExpanded && (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1" style={{ color: settings.textColor }}>The Crucible (Messy Notes)</label>
                        <textarea value={rawNotes} onChange={e => { setRawNotes(e.target.value); dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates: { rawNotes: e.target.value } } }); }} rows={4} className="w-full p-4 rounded-xl border-0 resize-none text-sm leading-relaxed bg-black/20 focus:ring-1 transition-all" style={{ color: settings.textColor, '--tw-ring-color': settings.accentColor } as any} onClick={e => e.stopPropagation()} placeholder="Jot down history, aesthetic, key figures..." />
                        <div className="flex gap-2">
                            <button onClick={() => onRefineWorldItem(item)} disabled={isGenerating || !rawNotes.trim()} className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl text-white shadow-lg flex items-center gap-2 disabled:opacity-50 transition-transform active:scale-95" style={{backgroundColor: settings.accentColor}}>
                                {isGenerating ? <SpinnerIcon className="h-3 w-3" /> : <SparklesIconOutline className="h-3.5 w-3.5" />}
                                REFIINE INTO CODEX
                            </button>
                             <button onClick={() => dispatch({ type: 'DELETE_WORLD_ITEM', payload: item.id })} className="p-2.5 rounded-xl text-white hover:opacity-80 transition-all ml-auto" style={{backgroundColor: settings.dangerColor}} title="Purge Entry">
                                <TrashIconOutline className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1" style={{ color: settings.textColor }}>The Codex (Distilled Entry)</label>
                        <div className="w-full p-5 rounded-xl border bg-black/10 min-h-[100px]" style={{ borderColor: settings.toolbarInputBorderColor }}>
                           {isGenerating && !item.description ? <div className="flex items-center justify-center p-8"> <SpinnerIcon className="h-8 w-8" style={{ color: settings.textColor }} /> </div> : <MarkdownRenderer source={item.description} settings={settings} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const WorldPanel: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { worldItems, assemblyState } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onDistillWorldNotes, isDistillingWorld, errorMessage, onSetError } = useAssemblyAI();
    const { worldPanelView, worldCrucibleText, expandedWorldItemId } = assemblyState;

    const groupedItems = useMemo(() => {
        const groups: { [key in IWorldItem['type']]?: IWorldItem[] } = {};
        worldItems.forEach(item => { if (!groups[item.type]) groups[item.type] = []; groups[item.type]!.push(item); });
        return groups;
    }, [worldItems]);

    const itemTypes: IWorldItem['type'][] = ['Location', 'Lore', 'Object', 'Organization', 'Concept'];

    return (
        <div className="h-full flex flex-col p-6 gap-6 overflow-hidden" style={{ color: settings.textColor }}>
            <div className="flex-shrink-0 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <GlobeAltIcon className="h-8 w-8 text-yellow-400" /> Universe Codex
                    </h2>
                    <p className="text-sm opacity-60 mt-1" style={{ color: settings.textColor }}>Construct the foundation of your universe and map its geography.</p>
                </div>
                <div className="flex bg-black/10 p-1 rounded-xl border border-white/5 shadow-inner">
                    {[
                        { id: 'crucible', label: 'Crucible', icon: <SparklesIconOutline className="h-4 w-4" /> },
                        { id: 'repository', label: 'Repository', icon: <BookIcon className="h-4 w-4" /> },
                        { id: 'map', label: 'Map Builder', icon: <MapIcon className="h-4 w-4" /> }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldPanelView: tab.id as any } })} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${worldPanelView === tab.id ? 'text-white shadow-xl' : 'opacity-50 hover:opacity-100'}`} style={{ backgroundColor: worldPanelView === tab.id ? settings.accentColor : 'transparent', color: worldPanelView === tab.id ? '#FFFFFF' : settings.textColor }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {worldPanelView === 'crucible' ? (
                <div className="flex-grow min-h-0 flex flex-col gap-6 animate-in fade-in duration-500">
                    <div className="p-8 border rounded-3xl transition-all duration-300 flex-grow flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: `${settings.toolbarButtonBg}40` }}>
                        <textarea value={worldCrucibleText} onChange={e => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { worldCrucibleText: e.target.value } })} placeholder="BRAINDUMP YOUR WORLD NOTES HERE... History, physics, fashion, slang, religion. The more you add, the better the AI can distill it into the Story Bible." className="w-full flex-grow p-0 border-0 resize-none bg-transparent text-2xl leading-relaxed placeholder-opacity-20 focus:ring-0" style={{ color: settings.textColor }} />
                        <div className="flex justify-between items-center mt-8 pt-8 border-t" style={{ borderColor: `${settings.textColor}10` }}>
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-30" style={{ color: settings.textColor }}>ALCHEMIST'S CRUCIBLE V1.0</div>
                            <button onClick={() => onDistillWorldNotes(worldCrucibleText)} disabled={isDistillingWorld || !worldCrucibleText.trim()} className="px-10 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl flex items-center gap-3 disabled:opacity-50 transition-transform active:scale-95" style={{ backgroundColor: settings.accentColor }}>
                                {isDistillingWorld ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIconOutline className="h-5 w-5" />}
                                DISTILL INTO ENTRIES
                            </button>
                        </div>
                    </div>
                    {errorMessage && <div className="max-w-md mx-auto"><AIError message={errorMessage} onDismiss={() => onSetError(null)} /></div>}
                </div>
            ) : worldPanelView === 'map' ? (
                <div className="flex-grow min-h-0 animate-in fade-in duration-500"><MapBuilder settings={settings} /></div>
            ) : (
                <div className="flex-grow min-h-0 overflow-x-auto pb-4 -mb-4 scroll-smooth animate-in fade-in duration-500">
                    <div className="flex gap-6 h-full">
                        {itemTypes.map(type => (
                            <div key={type} className="w-[420px] h-full flex-shrink-0 flex flex-col gap-4 p-5 rounded-3xl bg-black/5 border border-white/5">
                                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-center opacity-30 border-b pb-4" style={{ borderColor: `${settings.textColor}10`, color: settings.textColor }}>{type}S</h3>
                                <div className="flex-grow overflow-y-auto space-y-4 pr-3 -mr-3 scroll-smooth">
                                    {(groupedItems[type] || []).map(item => (
                                        <WorldItemCard key={item.id} item={item} settings={settings} isExpanded={expandedWorldItemId === item.id} onToggleExpand={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedWorldItemId: expandedWorldItemId === item.id ? null : item.id } })} />
                                    ))}
                                    {(!groupedItems[type] || groupedItems[type]?.length === 0) && (
                                        <div className="flex flex-col items-center justify-center opacity-20 py-20 italic text-sm" style={{ color: settings.textColor }}>Empty Sector</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};