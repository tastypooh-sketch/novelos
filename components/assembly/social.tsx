
import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { EditorSettings, IChapter, ICharacter, Excerpt, SocialPost } from '../../types';
import { useNovelState, useNovelDispatch } from '../../NovelContext';
import { useAssemblyAI } from './AssemblyAIContext';
// FIX: Removed non-existent PhoneIcon from imports.
import { SpinnerIcon, SparklesIconOutline, RefreshIcon, ShareIcon, CameraIcon, UserCircleIcon } from '../common/Icons';
import AutosizeTextarea from '../common/AutosizeTextarea';
import { PostDisplay } from '../social/PostDisplay';
import { PostVariationsModal } from '../social/PostVariationsModal';
import { useDebouncedCallback } from 'use-debounce';
import { AIError } from '../common/AIError';


const ExcerptItem: React.FC<{ 
    excerpt: Excerpt,
    chapter: IChapter | undefined,
    characters: (ICharacter | undefined)[],
    isSelected: boolean,
    onSelect: () => void,
    settings: EditorSettings 
}> = ({ excerpt, chapter, characters, isSelected, onSelect, settings }) => {
    const novelTitle = 'Novelos';
    
    return (
        <div 
            onClick={onSelect} 
            className="p-3 rounded-lg border-2 cursor-pointer transition-colors" 
            style={{ 
                backgroundColor: settings.toolbarButtonBg, 
                borderColor: isSelected ? settings.accentColor : settings.toolbarInputBorderColor,
                borderStyle: 'solid'
            }}
        >
            <p className="text-sm italic">
                {excerpt.text}
                <span className="opacity-70">
                    &nbsp;&mdash;&nbsp;{novelTitle}, Ch {chapter?.chapterNumber || '?'}.
                </span>
            </p>
            <div className="text-xs opacity-60 mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                    {characters.map(c => c && (
                        <div key={c.id} className="h-4 w-4 rounded-full bg-cover bg-center" style={{backgroundImage: c.photo ? `url(${c.photo})` : undefined, backgroundColor: c.imageColor}} title={c.name} />
                    ))}
                </div>
                 <span>{characters.map(c => c?.name).join(', ')}</span>
            </div>
        </div>
    );
};

const ConfirmNewExcerptModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    settings: EditorSettings;
}> = ({ onConfirm, onCancel, settings }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={modalRef} className="p-6 rounded-lg shadow-xl w-full max-w-md" style={{ backgroundColor: settings.toolbarBg, color: settings.toolbarText }}>
                <h2 className="text-xl font-bold mb-4">Generate New Content?</h2>
                <p className="mb-6">
                    You have already generated content for an excerpt. Starting a new one will replace the current image and posts. Are you sure you want to continue?
                </p>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onCancel} className="rounded px-4 py-2" style={{ backgroundColor: settings.toolbarButtonBg }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}>Cancel</button>
                    <button onClick={onConfirm} className="rounded px-4 py-2 text-white" style={{ backgroundColor: settings.dangerColor }} onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.dangerColorHover || ''} onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.dangerColor || ''}>Continue & Replace</button>
                </div>
            </div>
        </div>
    );
};


export const SocialMediaPanel: React.FC<{ settings: EditorSettings }> = ({ settings }) => {
    const { chapters, characters, socialMediaState } = useNovelState();
    const dispatch = useNovelDispatch();
    const {
        onGenerateSocialContent,
        onRegenerateImage,
        onRegenerateTextAndHashtags,
        onExtractExcerpts,
        onGeneratePostVariations,
    } = useAssemblyAI();
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const endOfExcerptsRef = useRef<HTMLDivElement>(null);

    // State for confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingExcerptId, setPendingExcerptId] = useState<string | null>(null);
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);


    const {
        isLoading, error, excerpts, selectedExcerptId,
        generatedImagePrompt, generatedImageUrl, generatedInstagramPost, generatedTiktokPost, selectedChapterId,
        postVariations, variationPlatform,
    } = socialMediaState;

    const [localImagePrompt, setLocalImagePrompt] = useState(generatedImagePrompt || '');
    
    useEffect(() => {
        setLocalImagePrompt(generatedImagePrompt || '');
    }, [generatedImagePrompt]);

    const debouncedUpdateImagePrompt = useDebouncedCallback((prompt: string) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImagePrompt: prompt } });
    }, 300);

    const handleImagePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalImagePrompt(e.target.value);
        debouncedUpdateImagePrompt(e.target.value);
    };
    
    useEffect(() => {
        endOfExcerptsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [excerpts]);

    // This is the core logic for selecting an excerpt and generating content
    const proceedWithExcerptSelection = useCallback((excerptId: string) => {
        dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: {
            selectedExcerptId: excerptId,
            generatedImagePrompt: null,
            generatedImageUrl: null,
            generatedInstagramPost: null,
            generatedTiktokPost: null
        }});
        const excerpt = excerpts.find(e => e.id === excerptId);
        if (excerpt) {
            onGenerateSocialContent(excerpt);
        }
    }, [dispatch, excerpts, onGenerateSocialContent]);

    // This is the user-facing handler that checks for existing content first
    const handleExcerptSelect = useCallback((excerptId: string) => {
        if (generatedImageUrl && selectedExcerptId !== excerptId) {
            setPendingExcerptId(excerptId);
            setShowConfirmModal(true);
        } else if (selectedExcerptId !== excerptId) {
            proceedWithExcerptSelection(excerptId);
        }
    }, [generatedImageUrl, selectedExcerptId, proceedWithExcerptSelection]);

    // Handlers for the confirmation modal
    const handleConfirmNewExcerpt = () => {
        if (pendingExcerptId) {
            proceedWithExcerptSelection(pendingExcerptId);
        }
        setShowConfirmModal(false);
        setPendingExcerptId(null);
    };

    const handleCancelNewExcerpt = () => {
        setShowConfirmModal(false);
        setPendingExcerptId(null);
    };
    
    const handleChapterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const chapterId = e.target.value;
        dispatch({ type: 'SET_SOCIAL_CHAPTER', payload: chapterId });
    };

    const handleGenerateAiExcerpts = () => {
        if (selectedChapterId) {
            const chapter = chapters.find(c => c.id === selectedChapterId);
            if (chapter) {
                onExtractExcerpts(chapter, characters);
            }
        }
    };

    const handleRegenImage = useCallback(async (moodOnly: boolean) => {
        if (localImagePrompt) {
            setIsRegeneratingImage(true);
            const selectedExcerpt = excerpts.find(e => e.id === selectedExcerptId);
            const mainCharacter = selectedExcerpt ? characters.find(c => c.id === selectedExcerpt.characterIds[0]) : undefined;
            const newUrl = await onRegenerateImage(localImagePrompt, moodOnly, mainCharacter);
            if (newUrl) {
                dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedImageUrl: newUrl } });
            }
            setIsRegeneratingImage(false);
        }
    }, [localImagePrompt, onRegenerateImage, dispatch, excerpts, selectedExcerptId, characters]);

    const handleRegenText = useCallback(async (platform: 'instagram' | 'tiktok') => {
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (excerpt) {
            onRegenerateTextAndHashtags(excerpt, platform);
        }
    }, [excerpts, selectedExcerptId, onRegenerateTextAndHashtags]);
    
    const handleInstaTextChange = (text: string) => {
        if(generatedInstagramPost){
            const newPost = {...generatedInstagramPost, text};
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: newPost } });
        }
    };
    
    const handleTiktokTextChange = (text: string) => {
        if(generatedTiktokPost){
            const newPost = {...generatedTiktokPost, text};
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: newPost } });
        }
    };

    const handleInstaHashtagsChange = (hashtags: string[]) => {
        if (generatedInstagramPost) {
            const newPost = { ...generatedInstagramPost, hashtags };
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedInstagramPost: newPost } });
        }
    };

    const handleTiktokHashtagsChange = (hashtags: string[]) => {
        if (generatedTiktokPost) {
            const newPost = { ...generatedTiktokPost, hashtags };
            dispatch({ type: 'UPDATE_SOCIAL_MEDIA_STATE', payload: { generatedTiktokPost: newPost } });
        }
    };

    const handleExportImage = useCallback(() => {
        if (!generatedImageUrl) return;
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        const chapter = excerpt ? chapters.find(c => c.id === excerpt.chapterId) : null;

        const a = document.createElement('a');
        a.href = generatedImageUrl;
        const fileName = `novelos_image_ch${chapter?.chapterNumber || 'X'}_${excerpt?.text.substring(0, 15).replace(/\s/g, '_') || 'export'}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [generatedImageUrl, selectedExcerptId, excerpts, chapters]);

    const handleRepurpose = useCallback(async (platform: 'instagram' | 'tiktok') => {
        const post = platform === 'instagram' ? generatedInstagramPost : generatedTiktokPost;
        const excerpt = excerpts.find(e => e.id === selectedExcerptId);
        if (post && excerpt) {
            await onGeneratePostVariations(post, excerpt, platform);
            setIsVariationModalOpen(true);
        }
    }, [generatedInstagramPost, generatedTiktokPost, excerpts, selectedExcerptId, onGeneratePostVariations]);

    const handleSelectVariation = (post: SocialPost) => {
        dispatch({ type: 'APPLY_POST_VARIATION', payload: post });
        setIsVariationModalOpen(false);
    };

    const userExcerpts = excerpts.filter(e => e.type === 'user');
    const aiExcerpts = excerpts.filter(e => e.type === 'ai');

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4 overflow-y-auto" style={{ backgroundColor: `${settings.toolbarButtonBg}60`}}>
            {/* Column 1: Selection */}
            <div className="flex flex-col gap-4 min-h-0 md:flex-[5]">
                <div className="flex-shrink-0">
                    <h3 className="font-semibold mb-2">1. Select an Excerpt</h3>
                    <p className="text-xs opacity-70 mb-2">Send an excerpt from the Manuscript notes panel, or use the AI to generate suggestions from a chapter below.</p>
                    <div className="space-y-2">
                        <select
                            value={selectedChapterId || ''}
                            onChange={handleChapterSelectChange}
                            className="w-full p-2 rounded border text-sm"
                            style={{ backgroundColor: settings.backgroundColor, borderColor: settings.toolbarInputBorderColor, color: settings.textColor }}
                        >
                            <option value="">Select a chapter to generate excerpts...</option>
                            {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.title} {chap.chapterNumber}</option>)}
                        </select>
                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerateAiExcerpts}
                                disabled={!selectedChapterId || isLoading}
                                className="px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: settings.accentColor, color: '#FFFFFF' }}
                            >
                                {isLoading && !generatedImageUrl ? <SpinnerIcon /> : <SparklesIconOutline className="h-4 w-4" />}
                                Generate AI Excerpts
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col min-h-0">
                     <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                        {excerpts.length === 0 && (
                             <div className="text-center text-sm opacity-60 pt-10">
                                Your user-sent excerpts and AI-generated suggestions will appear here.
                            </div>
                        )}
                        {userExcerpts.map(excerpt => {
                            const chapter = chapters.find(c => c.id === excerpt.chapterId);
                            const excerptChars = excerpt.characterIds.map(id => characters.find(c => c.id === id));
                            return <ExcerptItem key={excerpt.id} excerpt={excerpt} chapter={chapter} characters={excerptChars} isSelected={selectedExcerptId === excerpt.id} onSelect={() => handleExcerptSelect(excerpt.id)} settings={settings}/>
                        })}
                        {userExcerpts.length > 0 && aiExcerpts.length > 0 && (
                             <div className="flex items-center gap-2 py-2">
                                <div className="flex-grow border-t" style={{borderColor: settings.toolbarInputBorderColor}}></div>
                                <span className="text-xs opacity-60">AI Suggestions</span>
                                <div className="flex-grow border-t" style={{borderColor: settings.toolbarInputBorderColor}}></div>
                            </div>
                        )}
                        {aiExcerpts.map(excerpt => {
                            const chapter = chapters.find(c => c.id === excerpt.chapterId);
                            const excerptChars = excerpt.characterIds.map(id => characters.find(c => c.id === id));
                            return <ExcerptItem key={excerpt.id} excerpt={excerpt} chapter={chapter} characters={excerptChars} isSelected={selectedExcerptId === excerpt.id} onSelect={() => handleExcerptSelect(excerpt.id)} settings={settings}/>
                        })}
                        <div ref={endOfExcerptsRef} />
                    </div>
                </div>
            </div>
            
            {/* Column 2 & 3: Review */}
            {selectedExcerptId ? (
                <>
                    {/* Column 2: Image */}
                    <div className="flex flex-col gap-4 min-h-0 md:flex-[4]">
                        <h3 className="font-semibold">2. Social Media Preview</h3>
                         <div className="p-4 rounded-lg flex-grow flex flex-col" style={{backgroundColor: settings.toolbarButtonBg}}>
                             <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-semibold text-sm">Generated Image</h4>
                                 <button onClick={handleExportImage} disabled={!generatedImageUrl || isLoading || isRegeneratingImage} className="text-xs px-2 py-1 rounded flex items-center justify-center gap-1 disabled:opacity-50" style={{ backgroundColor: settings.toolbarBg }}>
                                    <ShareIcon className="h-3 w-3" /> Export
                                </button>
                            </div>
                            <div className="flex-grow flex items-center justify-center">
                                <div 
                                    className="relative w-full max-w-[250px] aspect-[9/19.5] border-4 rounded-3xl p-1.5 shadow-lg"
                                    style={{ borderColor: settings.toolbarInputBorderColor }}
                                >
                                    <div 
                                        className="w-full h-full rounded-[1.1rem] overflow-hidden relative flex items-center justify-center"
                                        style={{ backgroundColor: settings.backgroundColor }}
                                    >
                                        {(isLoading && !generatedImageUrl) && <SpinnerIcon className="h-8 w-8" />}
                                        {isRegeneratingImage && (
                                            <div className="image-reloading-overlay absolute inset-0 flex items-center justify-center z-10">
                                                <SpinnerIcon className="h-8 w-8" />
                                            </div>
                                        )}
                                        {generatedImageUrl && (
                                           <img 
                                               key={generatedImageUrl}
                                               src={generatedImageUrl} 
                                               alt={generatedImagePrompt || ''} 
                                               className={`w-full h-full object-cover transition-opacity duration-300 ${isRegeneratingImage ? 'opacity-30' : 'opacity-100'}`}
                                           />
                                        )}
                                    </div>
                                </div>
                            </div>
                            {generatedImagePrompt && (
                                <div className="mt-3 text-center">
                                    <div className="flex justify-center gap-2 mt-2">
                                        <button onClick={() => handleRegenImage(false)} disabled={isLoading || isRegeneratingImage} className="text-xs px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50" style={{backgroundColor: settings.toolbarBg}}><UserCircleIcon className="h-3 w-3" /> With Character</button>
                                        <button onClick={() => handleRegenImage(true)} disabled={isLoading || isRegeneratingImage} className="text-xs px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50" style={{backgroundColor: settings.toolbarBg}}><CameraIcon className="h-3 w-3"/> Mood Only</button>
                                    </div>
                                </div>
                            )}
                         </div>
                    </div>
                    
                    {/* Column 3: Posts */}
                    <div className="flex flex-col gap-4 min-h-0 md:flex-[5]">
                         <div className="flex-grow flex flex-col min-h-0">
                             <PostDisplay platform="Instagram" post={generatedInstagramPost} onTextChange={handleInstaTextChange} onHashtagsChange={handleInstaHashtagsChange} onRegenerate={() => handleRegenText('instagram')} onRepurpose={() => handleRepurpose('instagram')} isLoading={isLoading} settings={settings} />
                         </div>
                         <div className="flex-grow flex flex-col min-h-0">
                             <PostDisplay platform="TikTok" post={generatedTiktokPost} onTextChange={handleTiktokTextChange} onHashtagsChange={handleTiktokHashtagsChange} onRegenerate={() => handleRegenText('tiktok')} onRepurpose={() => handleRepurpose('tiktok')} isLoading={isLoading} settings={settings} />
                         </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center text-center p-8 rounded-lg md:flex-[9]" style={{ backgroundColor: `${settings.toolbarButtonBg}80`, color: `${settings.textColor}99` }}>
                     <div>
                        <SparklesIconOutline className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold">Social Media Content Generator</h3>
                        <p className="mt-2 text-sm max-w-md">
                            Select an excerpt to automatically generate a promotional image and posts for Instagram and TikTok.
                        </p>
                    </div>
                </div>
            )}
             {showConfirmModal && (
                <ConfirmNewExcerptModal 
                    onConfirm={handleConfirmNewExcerpt} 
                    onCancel={handleCancelNewExcerpt} 
                    settings={settings}
                />
            )}
            {isVariationModalOpen && (
                <PostVariationsModal
                    isOpen={isVariationModalOpen}
                    onClose={() => {
                        setIsVariationModalOpen(false);
                        dispatch({ type: 'CLEAR_POST_VARIATIONS' });
                    }}
                    settings={settings}
                    variations={postVariations}
                    platform={variationPlatform}
                    onSelect={handleSelectVariation}
                    isLoading={isLoading}
                />
            )}
            {error && <AIError message={error} className="mt-4" />}
        </div>
    );
};
