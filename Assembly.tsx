
import React, { useState, useRef, useCallback, useEffect, useMemo, useContext } from 'react';
import { produce } from 'immer';
import { Type } from "@google/genai";
import type { EditorSettings, ICharacter, IChapter, TileBackgroundStyle, ISnippet, AssemblyPanel, Excerpt, SocialPost, AssemblyViewState, PlotBrainstormState, SynopsisState, IWorldItem, ChapterPacingInfo, Theme, RelationshipDataPoint, PlotPoint, ChekhovsGun, ICharacterRelationship, IMapLocation } from './types';
import { useNovelDispatch, useNovelState } from './NovelContext';
import { AssemblyAIContext, AssemblyAIState, SnippetSuggestion } from './components/assembly/AssemblyAIContext';
import { getAI, hasAPIKey, API_KEY_ERROR } from './utils/ai';

import { CharactersPanel } from './components/assembly/characters';
import { ChaptersPanel } from './components/assembly/chapters';
import { SnippetsPanel } from './components/assembly/snippets';
import { SocialMediaPanel } from './components/assembly/social';
import { PlotBrainstormPanel } from './components/assembly/plot';
import { SynopsisPanel } from './components/assembly/synopsis';
import { WorldPanel } from './components/assembly/world';
import { PlusIcon, DocumentTextIcon, TileBackgroundIcon, ImportIcon } from './components/common/Icons';
import { generateId, extractJson } from './utils/common';
import { generateInitialChapterRtf } from './utils/manuscriptUtils';
import { Modal } from './components/manuscript/modals/Modal';
import { ImportNovelModal } from './components/assembly/modals/ImportNovelModal';

interface DeleteCharacterModalProps {
    character: ICharacter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteCharacterModal: React.FC<DeleteCharacterModalProps> = React.memo(({ character, onConfirm, onCancel, settings }) => {
    const footerContent = (
        <>
            <button onClick={onCancel} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }}>Cancel</button>
            <button onClick={onConfirm} className="rounded px-4 py-2 text-white" style={{ backgroundColor: settings.dangerColor }}>Delete Character</button>
        </>
    );

    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>Are you sure you want to permanently delete the character "{character.name}"? This action cannot be undone.</p>
        </Modal>
    );
});

interface DeleteChapterModalProps {
    chapter: IChapter;
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}

const DeleteChapterModal: React.FC<DeleteChapterModalProps> = React.memo(({ chapter, onConfirm, onCancel, settings }) => {
    const footerContent = (
         <>
            <button onClick={onCancel} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }}>Cancel</button>
            <button onClick={onConfirm} className="rounded px-4 py-2 text-white" style={{ backgroundColor: settings.dangerColor }}>Delete Chapter</button>
        </>
    );
    
    return (
        <Modal onClose={onCancel} settings={settings} title="Confirm Deletion" className="max-w-md" footer={footerContent}>
            <p>Are you sure you want to permanently delete "{chapter.title} {chapter.chapterNumber}"? This action cannot be undone.</p>
        </Modal>
    );
});

interface AssemblyHeaderProps {
    settings: EditorSettings;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
    onAdd: () => void;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    onExport: () => void;
    onImport: () => void;
}

const AssemblyHeader: React.FC<AssemblyHeaderProps> = ({ settings, activePanel, onPanelChange, onAdd, onSettingsChange, onExport, onImport }) => {
    const handleCycleBackground = () => {
        const styles: TileBackgroundStyle[] = ['solid', 'diagonal', 'horizontal'];
        const currentStyle = settings.assemblyTileStyle || 'solid';
        const currentIndex = styles.indexOf(currentStyle);
        const nextStyle = styles[(currentIndex + 1) % styles.length];
        onSettingsChange({ assemblyTileStyle: nextStyle });
    };

    const tabBaseClasses = "px-4 py-2 text-sm font-medium transition-colors focus:outline-none border-t border-l border-r rounded-t-lg";
    const inactiveTabHoverStyle = { backgroundColor: settings.toolbarButtonHoverBg || '' };
    const sansSerifFonts = ['Inter', 'Roboto', 'Open Sans', 'Arial'];

    const tabLabels: Record<AssemblyPanel, string> = {
        chapters: 'Chapters',
        characters: 'Characters',
        snippets: 'Snippets',
        world: 'World',
        plot: 'Plot Brainstorm',
        synopsis: 'Synopsis',
        social: 'Social Media',
    };
    const tabs: AssemblyPanel[] = ['chapters', 'characters', 'snippets', 'social', 'world', 'plot', 'synopsis'];
    const canAdd = ['characters', 'chapters', 'snippets', 'world'].includes(activePanel);

    const getAddItemLabel = () => {
        switch(activePanel) {
            case 'characters': return 'Character';
            case 'chapters': return 'Chapter';
            case 'snippets': return 'Snippet';
            case 'world': return 'World Item';
            default: return '';
        }
    };

    const showTileControls = ['characters', 'chapters'].includes(activePanel);

    return (
        <div className="px-3 pt-3 border-b flex flex-wrap justify-between items-end" style={{ backgroundColor: settings.toolbarBg, borderColor: settings.toolbarInputBorderColor }}>
            <div className="flex items-end gap-2 flex-wrap">
                {tabs.map(panel => (
                     <button
                        key={panel}
                        onClick={() => onPanelChange(panel)}
                        className={tabBaseClasses}
                        style={{
                            backgroundColor: activePanel === panel ? 'transparent' : settings.toolbarButtonBg,
                            borderColor: settings.toolbarInputBorderColor,
                            borderBottomColor: activePanel === panel ? 'transparent' : settings.toolbarInputBorderColor,
                            marginBottom: activePanel === panel ? '-1px' : '0px',
                            color: settings.toolbarText
                        }}
                        onMouseEnter={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = inactiveTabHoverStyle.backgroundColor }}
                        onMouseLeave={e => { if (activePanel !== panel) e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || '' }}
                    >
                        {tabLabels[panel]}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3 pb-1">
                 <select
                    id="assemblyFontSelect"
                    aria-label="Assembly View Font"
                    value={settings.assemblyFontFamily || 'Inter'}
                    onChange={(e) => onSettingsChange({ assemblyFontFamily: e.target.value })}
                    className="px-2 py-1.5 rounded-md text-sm border-0 focus:ring-2 focus:ring-offset-2"
                    style={{ 
                        backgroundColor: settings.toolbarButtonBg, 
                        color: settings.toolbarText,
                        borderColor: settings.toolbarInputBorderColor,
                        outline: 'none'
                     } as any}
                 >
                    {sansSerifFonts.map(font => <option key={font} value={font} style={{fontFamily: font}}>{font}</option>)}
                 </select>
                 {showTileControls && (
                    <button
                        onClick={handleCycleBackground}
                        className="p-1.5 rounded-md"
                        style={{ backgroundColor: settings.toolbarButtonBg }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                        title="Cycle tile background style"
                    >
                        <TileBackgroundIcon style={{ color: settings.toolbarText }} />
                    </button>
                 )}
                 <div className="w-px h-6 bg-gray-600 opacity-30 mx-1"></div>
                 {activePanel === 'chapters' && (
                    <button
                        onClick={onImport}
                        className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.toolbarText }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    >
                        <ImportIcon className="h-4 w-4" />
                        Import Manuscript
                    </button>
                 )}
                 {canAdd && (
                    <button
                        onClick={onAdd}
                        className="px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 text-white"
                        style={{ backgroundColor: settings.accentColor }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add {getAddItemLabel()}
                    </button>
                 )}
            </div>
        </div>
    );
};

const AssemblyAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { chapters, characters, snippets, worldItems, socialMediaState, assemblyState, plotBrainstormState, synopsisState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [aiState, setAiState] = useState<AssemblyAIState>({
        isGeneratingProfile: null,
        isGeneratingChapter: null,
        isGeneratingWorldItem: null,
        isDistillingWorld: false,
        isGeneratingSnippets: false,
        isGeneratingMap: false,
        errorId: null,
        errorMessage: null,
    });

    const onSetError = (message: string | null, id: string | null = null) => {
        setAiState(prev => ({ ...prev, errorMessage: message, errorId: id }));
    };

    const onGenerateProfile = async (character: ICharacter, rawNotes: string) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, character.id);
        setAiState(prev => ({ ...prev, isGeneratingProfile: character.id, errorMessage: null }));
        try {
            const prompt = `Based on these notes, generate a detailed character profile for "${character.name}".
            Notes: ${rawNotes}
            Return JSON: { "summary": "brief summary", "tagline": "short hook", "profile": "full markdown profile", "keywords": ["kw1", "kw2"] }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates: { ...data, previousProfile: character.summary ? { summary: character.summary, profile: character.profile, tagline: character.tagline, keywords: character.keywords } : undefined } } });
        } catch (e) { onSetError("Failed to generate profile.", character.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingProfile: null })); }
    };

    const onUpdateProfile = async (character: ICharacter, manuscriptContent: string) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, character.id);
        setAiState(prev => ({ ...prev, isGeneratingProfile: character.id, errorMessage: null }));
        try {
            const prompt = `Analyze the manuscript to update the profile for "${character.name}".
            Manuscript: ${manuscriptContent.substring(0, 30000)}
            Return JSON: { "summary": "updated summary", "tagline": "updated tagline", "profile": "updated markdown profile", "keywords": ["kw1", "kw2"] }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'UPDATE_CHARACTER', payload: { id: character.id, updates: { ...data, previousProfile: { summary: character.summary, profile: character.profile, tagline: character.tagline, keywords: character.keywords } } } });
        } catch (e) { onSetError("Failed to update profile.", character.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingProfile: null })); }
    };

    const onGenerateChapterDetails = async (chapter: IChapter, rawNotes: string) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, chapter.id);
        setAiState(prev => ({ ...prev, isGeneratingChapter: chapter.id, errorMessage: null }));
        try {
            const prompt = `Generate details for Chapter ${chapter.chapterNumber}: ${chapter.title}.
            Notes: ${rawNotes}
            Return JSON: { "summary": "brief summary", "outline": "markdown beat list", "analysis": "markdown conflict analysis", "keywords": ["kw1", "kw2"] }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapter.id, updates: { ...data, previousDetails: chapter.summary ? { summary: chapter.summary, outline: chapter.outline, analysis: chapter.analysis, keywords: chapter.keywords } : undefined } } });
        } catch (e) { onSetError("Failed to generate details.", chapter.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingChapter: null })); }
    };

    const onUpdateChapterFromManuscript = async (chapter: IChapter) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, chapter.id);
        setAiState(prev => ({ ...prev, isGeneratingChapter: chapter.id, errorMessage: null }));
        try {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = chapter.content;
            const prompt = `Analyze this chapter text to update summary and outline.
            Text: ${tempDiv.innerText.substring(0, 15000)}
            Return JSON: { "summary": "updated summary", "outline": "updated outline beats", "analysis": "updated conflict analysis", "keywords": ["kw1", "kw2"] }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'UPDATE_CHAPTER', payload: { id: chapter.id, updates: { ...data, previousDetails: { summary: chapter.summary, outline: chapter.outline, analysis: chapter.analysis, keywords: chapter.keywords } } } });
        } catch (e) { onSetError("Failed to update chapter.", chapter.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingChapter: null })); }
    };

    const onAnalyzeSnippets = async (rawText: string, characters: ICharacter[]) => {
        if (!hasAPIKey()) { onSetError(API_KEY_ERROR, 'snippets'); return false; }
        setAiState(prev => ({ ...prev, isGeneratingSnippets: true, errorMessage: null }));
        try {
            const prompt = `Split this text into distinct snippet items. Identify type and character IDs.
            Characters: ${characters.map(c => `[ID: ${c.id}] Name: ${c.name}`).join(', ')}
            Text: ${rawText}
            Return JSON array: [{ "cleanedText": "...", "type": "Dialogue|...", "characterIds": ["..."] }]`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const items = extractJson<any[]>(response.text || '');
            if (items) dispatch({ type: 'ADD_SNIPPETS', payload: items.map(i => ({ ...i, id: generateId(), isUsed: false })) });
            return true;
        } catch (e) { onSetError("Failed to analyze snippets.", 'snippets'); return false; }
        finally { setAiState(prev => ({ ...prev, isGeneratingSnippets: false })); }
    };

    const onSuggestPlacement = async (snippet: ISnippet, chapters: IChapter[]) => {
        if (!hasAPIKey()) return API_KEY_ERROR;
        try {
            const prompt = `Where should this snippet go?
            Snippet: ${snippet.cleanedText}
            Chapters: ${chapters.map(c => `[ID: ${c.id}] Ch ${c.chapterNumber}: ${c.summary}`).join('\n')}
            Return top 3 JSON: [{ "chapterId": "...", "confidence": "High", "justification": "..." }]`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            return extractJson<SnippetSuggestion[]>(response.text || '') || "No suggestions found.";
        } catch (e) { return "Error finding placement."; }
    };

    const onGenerateFullAnalysis = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'plot');
        dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: true, isGeneratingCharacters: true, isGeneratingOpportunities: true } });
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Analyze novel plot structure and characters.
            Story: ${chapText}
            Return JSON: { "pacing": { "summary": "...", "points": [{ "chapterNumber": 1, "title": "...", "description": "...", "type": "Inciting Incident" }] }, "characterAnalysis": "markdown", "opportunityAnalysis": "markdown" }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { pacingAndStructureAnalysis: { summary: data.pacing.summary, plotPoints: data.pacing.points.map(p => ({ ...p, id: generateId() })) }, characterAnalysis: data.characterAnalysis, opportunityAnalysis: data.opportunityAnalysis } });
        } catch (e) { onSetError("Analysis failed.", 'plot'); }
        finally { dispatch({ type: 'SET_PLOT_BRAINSTORM_STATE', payload: { isGeneratingPacingAndStructure: false, isGeneratingCharacters: false, isGeneratingOpportunities: false } }); }
    };

    const onGenerateSocialContent = async (excerpt: Excerpt) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const char = excerpt.characterIds[0] ? characters.find(c => c.id === excerpt.characterIds[0]) : null;
            const prompt = `Create social media content for: "${excerpt.text}"
            Character: ${char ? char.name + ' - ' + char.summary : 'None'}
            Return JSON: { "imagePrompt": "...", "instagram": { "text": "...", "hashtags": ["..."] }, "tiktok": { "text": "...", "hashtags": ["..."] } }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: data.imagePrompt, generatedInstagramPost: data.instagram, generatedTiktokPost: data.tiktok } });
                const imgRes = await getAI().models.generateContent({ model: 'gemini-2.5-flash-image', contents: data.imagePrompt });
                for (const part of imgRes.candidates[0].content.parts) if (part.inlineData) dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: `data:image/png;base64,${part.inlineData.data}` } });
            }
        } catch (e) { onSetError("Social generation failed.", 'social'); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onRefineWorldItem = async (item: IWorldItem) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, item.id);
        setAiState(prev => ({ ...prev, isGeneratingWorldItem: item.id }));
        try {
            const prompt = `Refine this world-building entry: ${item.name}. Notes: ${item.rawNotes}. Return JSON: { "summary": "one line", "description": "full markdown codex entry" }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'UPDATE_WORLD_ITEM', payload: { id: item.id, updates: data } });
        } catch (e) { onSetError("World refinement failed.", item.id); }
        finally { setAiState(prev => ({ ...prev, isGeneratingWorldItem: null })); }
    };

    const onDistillWorldNotes = async (text: string) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'distill');
        setAiState(prev => ({ ...prev, isDistillingWorld: true }));
        try {
            const prompt = `Distill world items from these notes. Return JSON array: [{ "name": "...", "type": "Location|Lore|Object|Organization|Concept", "rawNotes": "...", "summary": "..." }]
            Notes: ${text}`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const items = extractJson<any[]>(response.text || '');
            if (items) dispatch({ type: 'ADD_WORLD_ITEMS', payload: items.map(i => ({ ...i, id: generateId(), description: '' })) });
        } catch (e) { onSetError("Distillation failed.", 'distill'); }
        finally { setAiState(prev => ({ ...prev, isDistillingWorld: false })); }
    };

    // --- ADDED MISSING AI IMPLEMENTATIONS ---
    
    const onRegenerateTextAndHashtags = async (excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const prompt = `Generate a new caption and hashtags for this ${platform} post based on the excerpt: "${excerpt.text}".
            Return JSON: { "text": "...", "hashtags": ["..."] }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) {
                if (platform === 'instagram') dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: data } });
                else dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: data } });
            }
        } catch (e) { onSetError(`Failed to regenerate ${platform} content.`, 'social'); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onExtractExcerpts = async (chapter: IChapter, characters: ICharacter[]) => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = chapter.content;
            const prompt = `Extract 3-5 punchy excerpts or dialogue lines from this chapter suitable for social media hooks. Identify which characters are involved in each.
            Characters: ${characters.map(c => `[ID: ${c.id}] Name: ${c.name}`).join(', ')}
            Text: ${tempDiv.innerText.substring(0, 15000)}
            Return JSON array: [{ "text": "...", "characterIds": ["..."] }]`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any[]>(response.text || '');
            if (data) dispatch({ type: 'ADD_AI_EXCERPTS', payload: data.map(e => ({ ...e, chapterId: chapter.id })) });
        } catch (e) { onSetError("Failed to extract excerpts.", 'social'); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onGeneratePostVariations = async (post: SocialPost, excerpt: Excerpt, platform: 'instagram' | 'tiktok') => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'social');
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: true } });
        try {
            const prompt = `Generate 3 distinct variations of this ${platform} post for the excerpt: "${excerpt.text}".
            Current caption: ${post.text}
            Return JSON array: [{ "text": "...", "hashtags": ["..."] }]`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<SocialPost[]>(response.text || '');
            if (data) dispatch({ type: 'SET_POST_VARIATIONS', payload: { variations: data, platform } });
        } catch (e) { onSetError("Failed to generate variations.", 'social'); }
        finally { dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { isLoading: false } }); }
    };

    const onGenerateFullSynopsis = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: true, isGeneratingPromotionalContent: true, isGeneratingSynopsis: true } });
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Create a comprehensive industry package for this novel.
            Story: ${chapText}
            Return JSON: {
                "market": "markdown (tropes, comp titles, BISAC codes, keywords)",
                "promo": "markdown (tagline, logline, elevator pitch, reader persona)",
                "synopsis": "markdown (complete narrative overview from inciting incident to climax)"
            }`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any>(response.text || '');
            if (data) dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { marketAnalysis: data.market, promotionalContent: data.promo, synopsis: data.synopsis } });
        } catch (e) { onSetError("Failed to generate synopsis package.", 'synopsis'); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: false, isGeneratingPromotionalContent: false, isGeneratingSynopsis: false } }); }
    };

    const onRegenerateMarketAnalysis = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: true } });
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate the market analysis (tropes, comps, BISAC) for this novel. Story: ${chapText}. Return Markdown.`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { marketAnalysis: response.text } });
        } catch (e) { onSetError("Market analysis failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingMarketAnalysis: false } }); }
    };

    const onRegeneratePromotionalContent = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: true } });
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate promotional content (taglines, logline, pitches) for this novel. Story: ${chapText}. Return Markdown.`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { promotionalContent: response.text } });
        } catch (e) { onSetError("Promo content failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingPromotionalContent: false } }); }
    };

    const onRegenerateSynopsis = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'synopsis');
        dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: true } });
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Regenerate the complete story synopsis for this novel. Story: ${chapText}. Return Markdown.`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { synopsis: response.text } });
        } catch (e) { onSetError("Synopsis regeneration failed."); }
        finally { dispatch({ type: 'SET_SYNOPSIS_STATE', payload: { isGeneratingSynopsis: false } }); }
    };

    const onSuggestLocations = async () => {
        if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'map');
        setAiState(prev => ({ ...prev, isGeneratingMap: true }));
        try {
            const chapText = chapters.map(c => `Ch ${c.chapterNumber}: ${c.summary}`).join('\n');
            const prompt = `Based on these chapter summaries, identify 3-5 distinct map locations. For each, provide a name, a 1-sentence description, and suggested X and Y coordinates as percentages (0-100).
            Story: ${chapText}
            Return JSON array: [{ "name": "...", "description": "...", "x": 50, "y": 50 }]`;
            const response = await getAI().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
            const data = extractJson<any[]>(response.text || '');
            if (data) data.forEach(loc => dispatch({ type: 'ADD_MAP_LOCATION', payload: { ...loc, id: generateId() } }));
        } catch (e) { onSetError("Location suggestion failed.", 'map'); }
        finally { setAiState(prev => ({ ...prev, isGeneratingMap: false })); }
    };

    const onRegenerateImage = async (imagePrompt: string, moodOnly: boolean, character?: ICharacter) => {
        if (!hasAPIKey()) { onSetError(API_KEY_ERROR, 'social'); return null; }
        try {
            let prompt = imagePrompt;
            if (moodOnly) {
                prompt = `Atmospheric conceptual art based on: ${imagePrompt}. Highly cinematic, moody lighting, evocative.`;
            } else if (character) {
                prompt = `Full body cinematic portrait of ${character.name}. ${character.summary}. Style: ${imagePrompt}.`;
            }
            const imgRes = await getAI().models.generateContent({ model: 'gemini-2.5-flash-image', contents: prompt });
            for (const part of imgRes.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        } catch (e) { onSetError("Image regeneration failed.", 'social'); }
        return null;
    };

    const contextValue: any = {
        ...aiState, onGenerateProfile, onUpdateProfile, onGenerateChapterDetails, onUpdateChapterFromManuscript, onAnalyzeSnippets, onSuggestPlacement, onGenerateFullAnalysis,
        onGenerateSocialContent, onRefineWorldItem, onDistillWorldNotes, onSetError,
        onRegenerateTextAndHashtags, onExtractExcerpts, onGeneratePostVariations,
        onGenerateFullSynopsis, onRegenerateMarketAnalysis, onRegeneratePromotionalContent, onRegenerateSynopsis,
        onSuggestLocations, onRegenerateImage,
        onGeneratePacingAnalysis: async () => {
             if (!hasAPIKey()) return onSetError(API_KEY_ERROR, 'pacing');
             dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: true } });
             try {
                 const prompt = `Analyze chapter pacing (-1 to 1). Return JSON array: [{ "chapterId": "...", "chapterNumber": 1, "title": "...", "pacingScore": 0.5, "justification": "..." }]
                 Data: ${chapters.map(c => `[ID: ${c.id}] Ch ${c.chapterNumber}: ${c.summary}`).join('\n')}`;
                 const res = await getAI().models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: 'application/json' } });
                 const data = extractJson<ChapterPacingInfo[]>(res.text || '');
                 if (data) dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { pacingAnalysis: data } });
             } catch (e) { onSetError("Pacing analysis failed."); }
             finally { dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isGeneratingPacingAnalysis: false } }); }
        }
    };

    return <AssemblyAIContext.Provider value={contextValue}>{children}</AssemblyAIContext.Provider>;
};

interface AssemblyProps {
    settings: EditorSettings;
    onSettingsChange: (newSettings: Partial<EditorSettings>) => void;
    directoryHandle: FileSystemDirectoryHandle | null;
    onDirectoryHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
    activePanel: AssemblyPanel;
    onPanelChange: (panel: AssemblyPanel) => void;
}

export const Assembly: React.FC<AssemblyProps> = ({ settings, onSettingsChange, directoryHandle, onDirectoryHandleChange, activePanel, onPanelChange }) => {
    const { chapters, characters, snippets, worldItems, assemblyState, plotBrainstormState, synopsisState } = useNovelState();
    const dispatch = useNovelDispatch();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteCharacterTarget, setDeleteCharacterTarget] = useState<ICharacter | null>(null);
    const [deleteChapterTarget, setDeleteChapterTarget] = useState<IChapter | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleSelect = useCallback((id: string, e: React.MouseEvent) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (e.ctrlKey || e.metaKey) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else {
                next.clear();
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleAdd = () => {
        switch(activePanel) {
            case 'characters': dispatch({ type: 'ADD_CHARACTER', payload: {} }); break;
            case 'chapters': dispatch({ type: 'ADD_CHAPTER', payload: {} }); break;
            case 'snippets': dispatch({ type: 'SET_SNIPPETS', payload: [...snippets, { id: generateId(), cleanedText: '', type: 'Uncategorized', characterIds: [], isUsed: false }] }); break;
            case 'world': dispatch({ type: 'ADD_WORLD_ITEM', payload: {} }); break;
        }
    };

    return (
        <AssemblyAIProvider>
            <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: settings.assemblyFontFamily }}>
                <AssemblyHeader 
                    settings={settings} activePanel={activePanel} onPanelChange={onPanelChange} onAdd={handleAdd} 
                    onSettingsChange={onSettingsChange} onExport={() => {}} onImport={() => setIsImportModalOpen(true)}
                />
                <div className="flex-grow min-h-0">
                    {activePanel === 'chapters' && (
                        <ChaptersPanel 
                            chapters={chapters} characters={characters} snippets={snippets} settings={settings} 
                            tileBackgroundStyle={settings.assemblyTileStyle || 'solid'} selectedIds={selectedIds} onSelect={handleSelect} 
                            onUpdateChapter={(id, updates) => dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } })} 
                            onDeleteRequest={setDeleteChapterTarget} onSetChapters={(c) => dispatch({ type: 'SET_CHAPTERS', payload: c })} 
                            directoryHandle={directoryHandle} isLinkPanelOpen={assemblyState.isChapterLinkPanelOpen} 
                            onToggleLinkPanel={() => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { isChapterLinkPanelOpen: !assemblyState.isChapterLinkPanelOpen } })} 
                            expandedChapterId={assemblyState.expandedChapterId} setExpandedCharacterId={(id) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedChapterId: id } })} 
                            pacingAnalysis={assemblyState.pacingAnalysis} isGeneratingPacingAnalysis={assemblyState.isGeneratingPacingAnalysis}
                        />
                    )}
                    {activePanel === 'characters' && (
                        <CharactersPanel 
                            characters={characters} settings={settings} tileBackgroundStyle={settings.assemblyTileStyle || 'solid'} 
                            selectedIds={selectedIds} onSelect={handleSelect} onUpdate={(id, updates) => dispatch({ type: 'UPDATE_CHARACTER', payload: { id, updates } })} 
                            onDeleteRequest={setDeleteCharacterTarget} onSetCharacters={(c) => dispatch({ type: 'SET_CHARACTERS', payload: c })} 
                            expandedCharacterId={assemblyState.expandedCharacterId} setExpandedCharacterId={(id) => dispatch({ type: 'UPDATE_ASSEMBLY_VIEW_STATE', payload: { expandedCharacterId: id } })}
                        />
                    )}
                    {activePanel === 'snippets' && <SnippetsPanel settings={settings} />}
                    {activePanel === 'social' && <SocialMediaPanel settings={settings} />}
                    {activePanel === 'plot' && <PlotBrainstormPanel settings={settings} plotState={plotBrainstormState} />}
                    {activePanel === 'synopsis' && <SynopsisPanel settings={settings} synopsisState={synopsisState} />}
                    {activePanel === 'world' && <WorldPanel settings={settings} />}
                </div>

                {deleteCharacterTarget && (
                    <DeleteCharacterModal 
                        character={deleteCharacterTarget} settings={settings} onCancel={() => setDeleteCharacterTarget(null)} 
                        onConfirm={() => { dispatch({ type: 'DELETE_CHARACTER', payload: deleteCharacterTarget.id }); setDeleteCharacterTarget(null); }} 
                    />
                )}
                {deleteChapterTarget && (
                    <DeleteChapterModal 
                        chapter={deleteChapterTarget} settings={settings} onCancel={() => setDeleteChapterTarget(null)} 
                        onConfirm={() => { dispatch({ type: 'DELETE_CHAPTER', payload: deleteChapterTarget.id }); setDeleteChapterTarget(null); }} 
                    />
                )}
                {isImportModalOpen && (
                    <ImportNovelModal 
                        settings={settings} onClose={() => setIsImportModalOpen(false)} directoryHandle={directoryHandle} 
                    />
                )}
            </div>
        </AssemblyAIProvider>
    );
};
