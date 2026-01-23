import { createContext, useContext } from 'react';
import type { ICharacter, IChapter, ISnippet, Excerpt, SocialPost, IWorldItem, ChapterPacingInfo } from '../../types';

export type SnippetSuggestion = {
    chapterId: string;
    confidence: 'High' | 'Medium' | 'Low';
    justification: string;
};

export interface AssemblyAIState {
    isGeneratingProfile: string | null; 
    isGeneratingChapter: string | null; 
    isGeneratingWorldItem: string | null; 
    isDistillingWorld: boolean;
    isGeneratingSnippets: boolean;
    isGeneratingMap: boolean;
    errorId: string | null; 
    errorMessage: string | null; 
}

export interface AssemblyAIContextType extends AssemblyAIState {
    onGenerateProfile: (character: ICharacter, rawNotes: string) => Promise<void>;
    onUpdateProfile: (character: ICharacter, manuscriptContent: string) => Promise<void>;
    onGenerateChapterDetails: (chapter: IChapter, rawNotes: string) => Promise<void>;
    onUpdateChapterFromManuscript: (chapter: IChapter) => Promise<void>;
    onAnalyzeSnippets: (rawText: string, characters: ICharacter[]) => Promise<boolean>;
    onSuggestPlacement: (snippet: ISnippet, chapters: IChapter[]) => Promise<SnippetSuggestion[] | string>;
    onGenerateFullAnalysis: () => Promise<void>;
    onGenerateSocialContent: (excerpt: Excerpt) => Promise<void>;
    onRegenerateImage: (imagePrompt: string, moodOnly: boolean, character?: ICharacter) => Promise<string | null>;
    // Added missing social panel functions
    onRegenerateTextAndHashtags: (excerpt: Excerpt, platform: 'instagram' | 'tiktok') => Promise<void>;
    onExtractExcerpts: (chapter: IChapter, characters: ICharacter[]) => Promise<void>;
    onGeneratePostVariations: (post: SocialPost, excerpt: Excerpt, platform: 'instagram' | 'tiktok') => Promise<void>;
    // Added missing synopsis panel functions
    onGenerateFullSynopsis: () => Promise<void>;
    onRegenerateMarketAnalysis: () => Promise<void>;
    onRegeneratePromotionalContent: () => Promise<void>;
    onRegenerateSynopsis: () => Promise<void>;
    onRefineWorldItem: (item: IWorldItem) => Promise<void>;
    onDistillWorldNotes: (crucibleText: string) => Promise<void>;
    onSetError: (message: string | null, id?: string | null) => void;
    onGeneratePacingAnalysis: () => Promise<void>;
    // Added missing world panel functions
    onSuggestLocations: () => Promise<void>;
}

export const AssemblyAIContext = createContext<AssemblyAIContextType | undefined>(undefined);

export const useAssemblyAI = () => {
    const context = useContext(AssemblyAIContext);
    if (!context) {
        throw new Error('useAssemblyAI must be used within an AssemblyAIProvider');
    }
    return context;
};