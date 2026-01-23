import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { EditorSettings, IChapter, ICharacter, Excerpt, SocialPost } from '../../types';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
import { SpinnerIcon, SparklesIconOutline, RefreshIcon, ShareIcon, CameraIcon, UserCircleIcon, ChevronRightIcon, PlusIcon } from '../common/Icons';
import { PostDisplay } from '../social/PostDisplay';
import { PostVariationsModal } from '../social/PostVariationsModal';
import { useDebouncedCallback } from 'use-debounce';
import { AIError } from '../common/AIError';
import { shadeColor } from '../../utils/colorUtils';

const ExcerptItem: React.FC<{ 
    excerpt: Excerpt,
    chapter: IChapter | undefined,
    characters: (ICharacter | undefined)[],
    isSelected: boolean,
    onSelect: () => void,
    settings: EditorSettings 
}> = ({ excerpt, chapter, characters, isSelected, onSelect, settings }) => {
    return (
        <div 
            onClick={onSelect} 
            className="p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden" 
            style={{ 
                backgroundColor: isSelected ? `${settings.accentColor}10` : settings.toolbarButtonBg, 
                borderColor: isSelected ? settings.accentColor : 'transparent',
            }}
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <p className="text-sm italic leading-relaxed" style={{ color: settings.textColor }}>
                        "{excerpt.text}"
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="flex -space-x-1.5">
                            {characters.map(c => c && (
                                <div key={c.id} className="h-5 w-5 rounded-full border border-gray-800 bg-cover bg-center ring-2 ring-transparent group-hover:ring-white/20 transition-all" style={{backgroundImage: c.photo ? `url(${c.photo})` : undefined, backgroundColor: c.imageColor}} title={c.name} />
                            ))}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Ch {chapter?.chapterNumber || '?'} &bull; {characters.map(c => c?.name).join(', ')}</span>
                    </div>
                </div>
                {isSelected && (
                    <div className="flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
                        <ChevronRightIcon className="h-5 w-5" style={{ color: settings.accentColor }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export const SocialMediaPanel: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { chapters, characters, socialMediaState } = useNovelState();
    const dispatch = useNovelDispatch();
    const { onGenerateSocialContent, onRegenerateImage, onRegenerateTextAndHashtags, onExtractExcerpts, onGeneratePostVariations, onSetError } = useAssemblyAI();
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const endOfExcerptsRef = useRef<HTMLDivElement>(null);

    const { isLoading, error, excerpts, selectedExcerptId, generatedImagePrompt, generatedImageUrl, generatedInstagramPost, generatedTiktokPost, selectedChapterId, postVariations, variationPlatform } = socialMediaState;

    const [localImagePrompt, setLocalImagePrompt] = useState(generatedImagePrompt || '');
    
    useEffect(() => { setLocalImagePrompt(generatedImagePrompt || ''); }, [generatedImagePrompt]);

    const debouncedUpdateImagePrompt = useDebouncedCallback((prompt: string) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: prompt } });
    }, 300);

    const handleExcerptSelect = useCallback((excerptId: string) => {
        if (selectedExcerptId === excerptId) return;
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { selectedExcerptId: excerptId, generatedImagePrompt: null, generatedImageUrl: null, generatedInstagramPost: null, generatedTiktokPost: null }});
        const excerpt = excerpts.find(e => e.id === excerptId);
        if (excerpt) onGenerateSocialContent(excerpt);
    }, [dispatch, excerpts, onGenerateSocialContent, selectedExcerptId]);

    const handleRegenImage = useCallback(async (moodOnly: boolean) => {
        if (localImagePrompt) {
            setIsRegeneratingImage(true);
            const selectedExcerpt = excerpts.find(e => e.id === selectedExcerptId);
            const mainCharacter = selectedExcerpt ? characters.find(c => c.id === selectedExcerpt.characterIds[0]) : undefined;
            const newUrl = await onRegenerateImage(localImagePrompt, moodOnly, mainCharacter);
            if (newUrl) dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: newUrl } });
            setIsRegeneratingImage(false);
        }
    }, [localImagePrompt, onRegenerateImage, dispatch, excerpts, selectedExcerptId, characters]);

    const userExcerpts = excerpts.filter(e => e.type === 'user');
    const aiExcerpts = excerpts.filter(e => e.type === 'ai');

    return (
        <div className="w-full h-full flex flex-col p-6 gap-6 overflow-hidden" style={{ color: settings.textColor }}>
            <div className="flex-shrink-0 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <CameraIcon className="h-8 w-8 text-yellow-400" /> Social Media Studio
                    </h2>
                    <p className="text-sm opacity-60 mt-1">Transform your manuscript into visual hooks and promotional posts.</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedChapterId || ''}
                        onChange={(e) => dispatch({ type: 'SET_SOCIAL_CHAPTER', payload: e.target.value })}
                        className="px-4 py-2 rounded-xl text-sm font-medium focus:ring-0 transition-colors"
                        style={{ backgroundColor: settings.toolbarButtonBg, color: settings.textColor, border: `1px solid ${settings.toolbarInputBorderColor}` }}
                    >
                        <option value="">Choose a chapter...</option>
                        {chapters.map(chap => <option key={chap.id} value={chap.id} className="bg-gray-800 text-white">Ch {chap.chapterNumber}: {chap.title}</option>)}
                    </select>
                    <button
                        onClick={() => {
                            const chapter = chapters.find(c => c.id === selectedChapterId);
                            if (chapter) onExtractExcerpts(chapter, characters);
                        }}
                        disabled={!selectedChapterId || isLoading}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: settings.accentColor }}
                    >
                        {isLoading && !generatedImageUrl ? <SpinnerIcon className="h-4 w-4" /> : <SparklesIconOutline className="h-4 w-4" />}
                        Generate Excerpts
                    </button>
                </div>
            </div>

            <div className="flex-grow flex gap-6 min-h-0">
                {/* Selection Panel */}
                <div className="w-1/3 flex flex-col gap-4 min-h-0 bg-black/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Repository</h3>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2 scroll-smooth">
                        {excerpts.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center py-20 opacity-30">
                                <PlusIcon className="h-10 w-10 mb-3" />
                                <p className="text-sm font-medium">No excerpts available.</p>
                                <p className="text-[11px] mt-1">Send them from the manuscript or generate them above.</p>
                            </div>
                        )}
                        {userExcerpts.map(e => <ExcerptItem key={e.id} excerpt={e} chapter={chapters.find(c => c.id === e.chapterId)} characters={e.characterIds.map(id => characters.find(c => c.id === id))} isSelected={selectedExcerptId === e.id} onSelect={() => handleExcerptSelect(e.id)} settings={settings}/>)}
                        {userExcerpts.length > 0 && aiExcerpts.length > 0 && <div className="h-px w-full bg-white/5 my-4" />}
                        {aiExcerpts.map(e => <ExcerptItem key={e.id} excerpt={e} chapter={chapters.find(c => c.id === e.chapterId)} characters={e.characterIds.map(id => characters.find(c => c.id === id))} isSelected={selectedExcerptId === e.id} onSelect={() => handleExcerptSelect(e.id)} settings={settings}/>)}
                    </div>
                </div>

                {/* Preview/Edit Panel */}
                <div className="flex-grow flex gap-6 min-h-0">
                    {selectedExcerptId ? (
                        <>
                            <div className="w-[320px] flex flex-col gap-4 bg-black/5 rounded-2xl p-4 border border-white/5">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Visual Hook</h3>
                                <div className="flex-grow flex flex-col items-center justify-center gap-6">
                                    <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-4" style={{ borderColor: settings.toolbarInputBorderColor, backgroundColor: settings.backgroundColor }}>
                                        {generatedImageUrl ? (
                                            <img src={generatedImageUrl} className={`w-full h-full object-cover transition-opacity duration-500 ${isRegeneratingImage ? 'opacity-30' : 'opacity-100'}`} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                                                <SpinnerIcon className="h-10 w-10" />
                                                <span className="text-[10px] font-bold tracking-widest">RENDER IN PROGRESS</span>
                                            </div>
                                        )}
                                        {isRegeneratingImage && (
                                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40">
                                                <SpinnerIcon className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRegenImage(false)} disabled={isLoading || isRegeneratingImage} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2" style={{ backgroundColor: settings.toolbarButtonBg }}>
                                            <UserCircleIcon className="h-3.5 w-3.5" /> Character
                                        </button>
                                        <button onClick={() => handleRegenImage(true)} disabled={isLoading || isRegeneratingImage} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2" style={{ backgroundColor: settings.toolbarButtonBg }}>
                                            <CameraIcon className="h-3.5 w-3.5" /> Atmosphere
                                        </button>
                                        <button onClick={() => {
                                            const a = document.createElement('a'); a.href = generatedImageUrl!; a.download = 'novelos_hook.png'; a.click();
                                        }} disabled={!generatedImageUrl} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2" style={{ backgroundColor: settings.accentColor, color: 'white' }}>
                                            <ShareIcon className="h-3.5 w-3.5" /> Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow flex flex-col gap-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ml-1">Copywriting</h3>
                                <div className="flex-grow grid grid-rows-2 gap-4">
                                    <PostDisplay platform="Instagram" post={generatedInstagramPost} onTextChange={(text) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: { ...generatedInstagramPost!, text } } })} onHashtagsChange={(hashtags) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: { ...generatedInstagramPost!, hashtags } } })} onRegenerate={() => onRegenerateTextAndHashtags(excerpts.find(e => e.id === selectedExcerptId)!, 'instagram')} onRepurpose={async () => { await onGeneratePostVariations(generatedInstagramPost!, excerpts.find(e => e.id === selectedExcerptId)!, 'instagram'); }} isLoading={isLoading} settings={settings} />
                                    <PostDisplay platform="TikTok" post={generatedTiktokPost} onTextChange={(text) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: { ...generatedTiktokPost!, text } } })} onHashtagsChange={(hashtags) => dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: { ...generatedTiktokPost!, hashtags } } })} onRegenerate={() => onRegenerateTextAndHashtags(excerpts.find(e => e.id === selectedExcerptId)!, 'tiktok')} onRepurpose={async () => { await onGeneratePostVariations(generatedTiktokPost!, excerpts.find(e => e.id === selectedExcerptId)!, 'tiktok'); }} isLoading={isLoading} settings={settings} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center opacity-20">
                            <SparklesIconOutline className="h-24 w-24 mb-6" />
                            <h3 className="text-2xl italic">Select an excerpt to begin crafting.</h3>
                        </div>
                    )}
                </div>
            </div>
            {error && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"><AIError message={error} onDismiss={() => onSetError(null)} /></div>}
            {variationPlatform && <PostVariationsModal isOpen={!!postVariations} onClose={() => dispatch({ type: 'CLEAR_POST_VARIATIONS' })} settings={settings} variations={postVariations} platform={variationPlatform} onSelect={(post) => { dispatch({ type: 'APPLY_POST_VARIATION', payload: post }); }} isLoading={isLoading} />}
        </div>
    );
};