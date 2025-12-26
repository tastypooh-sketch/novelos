


export interface Shortcut {
  id: string;
  key: string;
  value: string;
}

export interface AppUpdate {
    currentVersion: string;
    latestVersion: string;
    releaseNotes: string;
    updateUrl: string;
    isNewer: boolean;
}

export interface IChapter {
  id:string;
  chapterNumber: number;
  title: string; // e.g., "Chapter" or "Prologue"
  content: string; // Stored as a string of HTML
  notes: string;
  wordCount?: number; // Added for performance caching
  // New fields for Assembly Chapter Tiles
  rawNotes: string;
  summary: string;
  outline: string;
  analysis?: string; // AI-generated analysis of story elements
  photo?: string | null;
  imageColor?: string;
  isPhotoLocked?: boolean;
  tagline?: string;
  keywords?: string[];
  location?: string;
  conflict?: string;
  chapterGoal?: string;
  accentStyle?: 'left-top-ingress' | 'outline' | 'corner-diagonal';
  characterIds?: string[]; // Added for character linking
  act?: number; // 1, 2, or 3
  linkedSnippetIds?: string[];
  betaFeedback?: string;
  betaFeedbackSummary?: string;
  previousDetails?: {
    summary: string;
    outline: string;
    analysis?: string;
    tagline?: string;
    keywords?: string[];
  }
}

export interface IWorldItem {
  id: string;
  name: string;
  type: 'Location' | 'Lore' | 'Object' | 'Organization' | 'Concept';
  photo?: string | null;
  rawNotes: string;
  summary: string;
  description: string;
  tagline?: string;
  imageColor?: string;
  keywords?: string[];
  isPhotoLocked?: boolean;
}


export interface VersionHistoryEntry {
  fileName: string;
  timestamp: Date;
  fileHandle: FileSystemFileHandle;
}

export interface ToolbarVisibility {
  stats: boolean;
  notes: boolean;
  findReplace: boolean;
  shortcuts: boolean;
  spellcheck: boolean;
  sound: boolean;
  fullscreen: boolean;
  focus: boolean;
  pageTransition: boolean;
  readAloud: boolean;
  designGallery: boolean;
  history: boolean;
  alignment: boolean;
  lineHeight: boolean;
  userGuide: boolean;
}

export type TileBackgroundStyle = 'solid' | 'diagonal' | 'horizontal';

export type GalleryCategory = 'Backgrounds';

export interface GalleryItem {
  id: string;
  url: string;
  category: GalleryCategory;
}

export interface EditorSettings {
  fontFamily: string;
  fontSize: number; // in em
  lineHeight?: number; // Added line height setting
  backgroundColor: string;
  textColor: string;
  textAlign?: 'left' | 'justify'; // Added alignment setting
  backgroundImage?: string | null;
  backgroundImageOpacity?: number;
  toolbarBg?: string;
  toolbarText?: string;
  toolbarButtonBg?: string;
  toolbarButtonHoverBg?: string;
  toolbarInputBorderColor?: string;
  accentColor?: string;
  accentColorHover?: string;
  successColor?: string;
  successColorHover?: string;
  dangerColor?: string;
  dangerColorHover?: string;
  dropdownBg?: string;
  transitionStyle?: 'scroll' | 'fade';
  toolbarVisibility?: Partial<ToolbarVisibility>;
  assemblyTileStyle?: TileBackgroundStyle;
  assemblyFontFamily?: string;
  narratorVoice?: string;
  ttsAccent?: 'en-US' | 'en-GB';
  ttsSpeed?: number;
  ttsVolume?: number;
  soundVolume?: number; // 0.25, 0.5, 0.75, 1.0
  isSoundEnabled?: boolean; // Added audio toggle persistence
  galleryStartupBehavior?: 'random' | 'fixed';
  showBookSpine?: boolean;
}

export interface Palette {
  name: string;
  backgroundColor: string;
  textColor: string;
  toolbarBg: string;
  toolbarText: string;
  toolbarButtonBg: string;
  toolbarButtonHoverBg: string;
  toolbarInputBorderColor: string;
  accentColor: string;
  accentColorHover: string;
  successColor: string;
  successColorHover: string;
  dangerColor: string;
  dangerColorHover: string;
  dropdownBg: string;
}

export interface WritingGoals {
  manuscriptGoal: number;
  dailyGoal: number;
}

export interface ICharacterRelationship {
  characterId: string;
  description: string;
}

export interface ICharacter {
  id: string;
  name: string;
  photo?: string | null;
  rawNotes: string;
  summary: string;
  profile: string;
  tagline?: string;
  imageColor?: string;
  keywords?: string[];
  accentStyle?: 'left-top-ingress' | 'outline' | 'corner-diagonal';
  isPhotoLocked?: boolean;
  isPrimary?: boolean;
  voice?: string;
  relationships?: ICharacterRelationship[];
  previousProfile?: {
    summary: string;
    profile: string;
    tagline?: string;
    keywords?: string[];
    relationships?: ICharacterRelationship[];
  }
}

export interface ISnippet {
  id: string;
  cleanedText: string;
  type: 'Dialogue' | 'Narrative Description' | 'Internal Monologue' | 'Theme Statement' | 'General Action' | 'World-Building Note' | 'Uncategorized';
  characterIds: string[];
  isUsed: boolean;
}

export type AssemblyPanel = 'chapters' | 'characters' | 'snippets' | 'social' | 'world' | 'plot' | 'synopsis';

export interface Excerpt {
    id: string;
    text: string;
    chapterId: string;
    characterIds: string[];
    type: 'user' | 'ai';
}

export interface SocialPost {
    text: string;
    hashtags: string[];
}

export interface SocialMediaState {
    isLoading: boolean;
    error: string | null;
    
    // Step 1: Selection
    selectedChapterId: string | null;
    excerpts: Excerpt[];
    selectedExcerptId: string | null;

    // Step 2: Review
    generatedImagePrompt: string | null;
    generatedImageUrl: string | null;
    generatedInstagramPost: SocialPost | null;
    generatedTiktokPost: SocialPost | null;

    // Step 5: Variations
    postVariations: SocialPost[] | null;
    variationPlatform: 'instagram' | 'tiktok' | null;
}

export interface BrainstormHistory {
    prompt: string;
    response: string;
}

export interface RelationshipDataPoint {
    chapterNumber: number;
    sentiment: number; // -1 (Hostile) to 1 (Allied)
    summary: string;
    excerpt: string;
}

export interface ThemeMention {
    type: 'chapter' | 'character' | 'world';
    id: string;
    excerpt: string;
}

export interface Theme {
    name: string;
    description: string;
    mentions: ThemeMention[];
}

export interface ChekhovsGun {
    id: string;
    item: string;
    chapterIntroduced: number;
    significance: string;
    isResolved: boolean;
}

export interface PlotPoint {
    id: string;
    chapterNumber: number;
    title: string;
    description: string;
    type: 'Inciting Incident' | 'Rising Action' | 'Climax' | 'Falling Action' | 'Resolution' | 'Subplot' | 'Key Scene';
}

export interface PlotBrainstormState {
    pacingAndStructureAnalysis: {
        summary: string;
        plotPoints: PlotPoint[];
    } | null;
    characterAnalysis: string | null;
    opportunityAnalysis: string | null;
    isGeneratingPacingAndStructure: boolean;
    isGeneratingCharacters: boolean;
    isGeneratingOpportunities: boolean;
    error: string | null;
    // Relationship Mapper
    selectedCharacter1IdForRelationship: string | null;
    selectedCharacter2IdForRelationship: string | null;
    isGeneratingRelationshipAnalysis: boolean;
    relationshipAnalysis: {
        character1Id: string;
        character2Id: string;
        analysisText: string;
        dataPoints: RelationshipDataPoint[];
    } | null;
    // Thematic Tracker
    isGeneratingThemes: boolean;
    thematicAnalysis: {
        summary: string;
        themes: Theme[];
    } | null;
    selectedTheme: string | null; // theme name
    // Chekhov's Gun
    isGeneratingChekhovsGuns: boolean;
    chekhovsGuns: ChekhovsGun[] | null;
    // Arc Stress Test
    selectedCharacterIdForArcTest: string | null;
    isGeneratingArcTest: boolean;
    arcTestResult: string | null;
}

export interface SynopsisState {
    marketAnalysis: string | null;
    promotionalContent: string | null;
    synopsis: string | null;
    isGeneratingMarketAnalysis: boolean;
    isGeneratingPromotionalContent: boolean;
    isGeneratingSynopsis: boolean;
    error: string | null;
}

export interface ChapterPacingInfo {
    chapterId: string;
    chapterNumber: number;
    title: string;
    pacingScore: number; // -1 (slow) to 1 (fast)
    justification: string;
}

export interface IMapLocation {
  id: string;
  name: string;
  description: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
}

export interface AssemblyViewState {
    selectedCharacterIds: string[];
    selectedChapterIds: string[];
    expandedCharacterId: string | null;
    expandedChapterId: string | null;
    isChapterLinkPanelOpen: boolean;
    // World Panel State
    worldPanelView: 'crucible' | 'repository' | 'map';
    worldCrucibleText: string;
    expandedWorldItemId: string | null;
    // Pacing Heatmap
    pacingAnalysis: ChapterPacingInfo[] | null;
    isGeneratingPacingAnalysis: boolean;
    // Map State
    mapState: {
        pan: { x: number; y: number };
        zoom: number;
    };
}

export interface WhatIfState {
    isOpen: boolean;
    isLoading: boolean;
    originalText: string | null;
    suggestions: string[] | null;
    error: string | null;
    position: { top: number; left: number } | null;
}

export interface SearchResult {
    id: string;
    chapterId: string;
    chapterName: string;
    index: number; // Index in innerText
    length: number;
    context: string;
}

export interface INovelState {
    characters: ICharacter[];
    chapters: IChapter[];
    snippets: ISnippet[];
    worldItems: IWorldItem[];
    mapLocations: IMapLocation[];
    globalNotes: string;
    socialMediaState: SocialMediaState;
    activeAssemblyPanel: AssemblyPanel;
    assemblyState: AssemblyViewState;
    plotBrainstormState: PlotBrainstormState;
    synopsisState: SynopsisState;
    whatIfState: WhatIfState;
}
