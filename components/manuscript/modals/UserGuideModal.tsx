
import React, { useRef } from 'react';
import { Packer, Document, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } from 'docx';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';
import { DocumentTextIcon } from '../../common/Icons';

interface UserGuideModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ settings, onClose }) => {
    
    const guideContent = [
        {
            level: 1, title: "Getting Started", children: [
                {
                    level: 2, title: "The Command Palette (Quick Navigation)",
                    content: [
                        "<strong>Shortcut:</strong> Ctrl + K (Windows/Linux) or Cmd + K (Mac)",
                        "The Command Palette is a 'power-user' tool designed to keep your hands on the keyboard. It acts as a universal search bar for your entire project.",
                        "• <strong>Instant Navigation:</strong> Type a chapter title (e.g., 'Chapter 5') to jump directly to it in the Manuscript view.",
                        "• <strong>Asset Lookup:</strong> Type a character name (e.g., 'Oscar') or a World Item to instantly switch to Assembly view and expand that specific card.",
                        "• <strong>Action Toggles:</strong> Quickly toggle Focus Mode or Fullscreen without hunting for icons in the toolbar."
                    ]
                },
                {
                    level: 2, title: "The Safety Net (Crash Recovery)",
                    content: [
                        "Modern software is complex, and unexpected errors can occur. Novelos includes a robust 'Safety Net' to prevent data loss.",
                        "• <strong>Behavior:</strong> If the application encounters a critical error that would normally cause a 'white screen' crash, the Safety Net activates immediately.",
                        "• <strong>Rescue Backup:</strong> A calm, dark-themed screen will appear with a 'Download Rescue Backup' button. Clicking this saves a complete JSON snapshot of your project state at the exact moment of the crash.",
                        "• <strong>Recovery:</strong> You can reload the app and use the Import function to restore the rescue file, ensuring you never lose your hard work."
                    ]
                }
            ]
        },
        {
            level: 1, title: "PART I: NOVELI (Portable Word Processor)", children: [
                {
                    level: 2, title: "Introduction: Writing unbound and uncompromised",
                    content: [
                        "Noveli is an ultra-portable, single file, horizontally scrolling word processor for creative writers that is free for everyone to use. It is a portable expression of Novelos, a long-form novel operating system.",
                        "Noveli offers the solution in a revolutionary, Single-File Application that redefines digital writing by putting absolute control back in the hands of the author. It combines the instant speed of local software with the essential flexibility of the cloud."
                    ]
                },
                {
                    level: 2, title: "The Hybrid Advantage",
                    content: [
                        "Because Noveli is just a file, you decide where it lives. For offline security, keep the file on your hard disk for zero-latency performance and total privacy. Alternatively, save your Noveli file in Google Drive, Dropbox, OneDrive or Box folder. This gives you the instant load times of a local app with the automatic backup and cross-device accessibility of the cloud.",
                        "Either way, Noveli has zero-Footprint Writing: Carry Noveli on a USB stick and open it on any machine, such as a library computer or borrowed laptop, without installation or leaving any software traces behind.",
                        "<strong>You Own the File, You Own the Words:</strong> You are never trapped. You can store it on a USB drive, email it, or keep it in an offline digital vault. Moreover, Noveli will function forever, requiring only a web browser to open and edit your work. No servers, subscriptions, or licenses required."
                    ]
                },
                {
                    level: 2, title: "The Interface: The Infinite Spread",
                    content: [
                        "Noveli's design maximizes writing real estate and beautiful pagination through a minimalist yet highly aesthetic interface.",
                        "• <strong>Maximized Real Estate:</strong> The dual-pane editor fills the full width of your landscape monitor to allow complete immersion into your text.",
                        "• <strong>Horizontal Momentum:</strong> Noveli flows horizontally. When you fill a page, the text snaps forward. This creates a satisfying, rhythmic sense of completion and forward momentum.",
                        "• <strong>Navigation:</strong> Use the mouse scroll wheel to rapidly scrub through your work, or PageUp and Down to flip spreads.",
                        "• <strong>Focus Mode:</strong> Press the Eye Icon to enter Focus Mode. The UI vanishes. It is just you and the narrative."
                    ]
                },
                {
                    level: 2, title: "Aesthetics & Flow",
                    content: [
                        "A beautiful environment fosters beautiful writing, inducing a creative writing flow state.",
                        "• <strong>Design Gallery:</strong> Click the Pencil Icon to access themes (Midnight, Gothic, Sepia, Paperback).",
                        "• <strong>Dynamic Backgrounds:</strong> Paste any image URL into the background field. Noveli's engine extracts the dominant colors and automatically recolors the interface to harmonize with your visual inspiration.",
                        "• <strong>Typewriter Sounds:</strong> Click the Speaker icon to enable mechanical keyboard sounds. These are mathematically generated using the Web Audio API to keep the file small."
                    ]
                },
                {
                    level: 2, title: "Iconography Reference",
                    content: [
                        "• <strong>Eye (Focus Mode):</strong> Hides all toolbars and borders. Toggle with ESC.",
                        "• <strong>Arrows (Page Transition):</strong> Toggles between Horizontal Scroll and Fade transitions.",
                        "• <strong>Pencil (Design Gallery):</strong> Visual customization suite.",
                        "• <strong>Speaker (Sound Toggle):</strong> Enables mechanical keyboard sounds.",
                        "• <strong>Chart (Stats):</strong> Displays Manuscript Goal and Daily Goal.",
                        "• <strong>Notebook (Notes):</strong> Toggles the side panel for Chapter Notes.",
                        "• <strong>A| (Alignment):</strong> Switches text between Left-Aligned and Justified.",
                        "• <strong>ABC (Spellcheck):</strong> Toggles browser native spell checker.",
                        "• <strong>Lightning (Shortcuts):</strong> Opens Text Shortcuts Manager.",
                        "• <strong>Magnifier (Find & Replace):</strong> Search dialog for chapter or manuscript.",
                        "• <strong>Clock (History):</strong> Tracks local saves of the chapter.",
                        "• <strong>Cloud (Sync):</strong> Options for cloud backup.",
                        "• <strong>Wrench (Customize):</strong> Show/hide toolbar buttons."
                    ]
                },
                {
                    level: 2, title: "Saving in Noveli",
                    content: [
                        "Noveli operates inside a web browser, so it cannot directly overwrite files on your hard drive for security reasons. Therefore, Noveli uses a 'Snapshot & Sync' saving method.",
                        "<strong>The 'Save' Action (Ctrl+S):</strong> Instantly packages your current manuscript, settings and notes into a Timestamped ZIP File and downloads it.",
                        "<strong>What's Inside the Zip:</strong>",
                        "• <strong>noveli_data.json:</strong> The 'brain' of your project for syncing.",
                        "• <strong>RTF_Backups folder:</strong> Standard Rich Text Format copies of every chapter, readable by Word, Google Docs or Scrivener."
                    ]
                }
            ]
        },
        {
            level: 1, title: "PART II: NOVELOS OVERVIEW (The Full Suite)", pageBreak: true, children: [
                {
                    level: 2, title: "Philosophy: Noveli vs. Novelos",
                    content: [
                        "Novelos is a Long-form Novel Operating System Desktop program. It is designed to act as a specialized publishing team—editor, publicist, and beta reader—that works for the author.",
                        "• <strong>Noveli:</strong> The portable, single-file word-processor on a stick.",
                        "• <strong>Novelos (The Novel OS):</strong> The full novel-writing suite that integrates a more powerful version of Noveli. It imports chapters written in Noveli and applies heavy lifting like AI analysis, plot mapping and world-building."
                    ]
                },
                {
                    level: 2, title: "SECTION A: MANUSCRIPT MODE",
                    content: [
                        "Manuscript Mode is the heart of Novelos. It mirrors the book-spread layout of Noveli while layering context-aware AI agents on top.",
                        "<strong>The Editor Interface:</strong> Automatically calculates screen width and splits text into a two-column 'book spread' view.",
                        "<strong>The AI Assist Panel (Sidebar):</strong>",
                        "• <strong>Tab 1: AI Assist (Developmental Editing):</strong> Highlight text to run Flow & Pacing Checks, 'Show, Don't Tell' analysis, Dialogue Review, or Tension Injection.",
                        "• <strong>Tab 2: Beta Feedback Summarizer:</strong> The Beta Reader Room simulates personas (Cynical Critic, Romance Reader, etc.) to test your manuscript. It also synthesizes raw human feedback into structured actionable themes.",
                        "• <strong>Tab 3: Chapter Notes:</strong> A scratchpad linked to the specific chapter."
                    ]
                },
                {
                    level: 2, title: "Contextual Intelligence Tools",
                    content: [
                        "• <strong>The 'What If?' Engine:</strong> Highlight text and right-click to generate 3 plausible alternative outcomes for a plot point based on preceding story trajectory.",
                        "• <strong>Smart Read Aloud (Neural TTS):</strong> Assign specific neural voices (e.g., 'Kore', 'Fenrir') to characters to hear your dialogue performed.",
                        "• <strong>AI Proofreader:</strong> Scans for spelling, grammar, and punctuation errors with explanations, acting as a final polish."
                    ]
                },
                {
                    level: 2, title: "SECTION B: ASSEMBLY MODE (Overview)",
                    content: [
                        "Assembly Mode is the structural backend. It replaces the traditional 'binder' with an intelligent database using 'Intelligent Linking'.",
                        "<strong>1. The Chapter Board:</strong> A visual Kanban for structure. Features a Pacing Heatmap (Red=Fast, Blue=Slow) to diagnose 'saggy middles'.",
                        "<strong>2. The Character Cast:</strong> A Dynamic Persona Engine. Updates profiles based on manuscript events and maps relationships.",
                        "<strong>3. The Snippet Repository:</strong> An 'Idea Scrapyard'. Dump raw notes, and the AI categorizes and suggests placement in specific chapters.",
                        "<strong>4. Social Media Studio:</strong> An Automated Publicist. Generates voice-aware Instagram/TikTok captions and visual hooks from your text.",
                        "<strong>5. The Crucible (World Building):</strong> Distills messy brainstorming into a structured Codex/Encyclopedia.",
                        "<strong>6. Plot Brainstorming Suite:</strong> A developmental editor that visualizes the narrative arc and detects plot holes.",
                        "<strong>7. Synopsis & Market Mode:</strong> Generates query letters, synopses, and market analysis (Comps, BISAC codes)."
                    ]
                }
            ]
        },
        {
            level: 1, title: "PART III: ASSEMBLY MODE DEEP DIVE", pageBreak: true, children: [
                {
                    level: 2, title: "1. Chapter Management Guide",
                    content: [
                        "<strong>The Chapter Board (Kanban View):</strong> Drag chapters between 'The Pool' and Acts. Renumbering is automatic.",
                        "<strong>Pacing Heatmap:</strong> Analyzes chapter summaries to assign a score (-1 to +1). Visualizes the invisible rhythm of the novel.",
                        "<strong>Expanded Chapter Mode:</strong>",
                        "• <strong>Visual Header:</strong> AI generates cinematic visualization of the scene.",
                        "• <strong>Update from Manuscript (Reverse Sync):</strong> Reads your actual text to overwrite the Outline/Summary to match reality.",
                        "• <strong>Generate from Notes (Forward Sync):</strong> Takes rough bullet points and expands them into a structured beat sheet.",
                        "• <strong>Intelligent Linking:</strong> Drag Character Avatars onto the card to track who is in the scene."
                    ]
                },
                {
                    level: 2, title: "2. Character Management Guide",
                    content: [
                        "<strong>The Character Board:</strong> A 'Living Cast List'.",
                        "• <strong>Dynamic Headshot:</strong> AI generates photorealistic portraits from descriptions. Use the 'Lock' icon to preserve specific images.",
                        "• <strong>Relationships:</strong> Reciprocal Linking means if 'A hates B', the system updates B's profile to say 'Hated by A'.",
                        "• <strong>Update from Manuscript:</strong> The AI reads every chapter the character appears in and updates their profile to reflect their evolution (e.g., injuries, attitude changes)."
                    ]
                },
                {
                    level: 2, title: "3. Snippet Repository Guide",
                    content: [
                        "<strong>The Ingestion Engine:</strong> Paste massive blocks of disorganized text. The AI splits them into individual cards and categorizes them (Dialogue, Description, etc.).",
                        "<strong>Intelligent Tagging:</strong> Automatically detects characters mentioned in the snippet.",
                        "<strong>Placement Suggestion:</strong> The AI reads the snippet and compares it against every chapter outline to suggest the top 3 best locations for it with a 'Confidence Score'.",
                        "<strong>Integration:</strong> 'Send to Chapter' links the snippet to that chapter's dashboard so you don't forget it when drafting."
                    ]
                },
                {
                    level: 2, title: "4. Social Media & Marketing Mode",
                    content: [
                        "<strong>The Concurrent Marketing Engine:</strong> Create assets while you write.",
                        "• <strong>Excerpt Hunter:</strong> The AI scans a chapter to find 3-5 high-engagement hooks (cliffhangers, witty lines).",
                        "• <strong>Visual Engine:</strong> Generates 'Cover Art' quality visuals for the excerpt. 'With Character' mode injects character headshot data; 'Mood Only' focuses on atmosphere.",
                        "• <strong>Copywriting Engine:</strong> Writes Instagram captions and TikTok scripts that mimic the author's voice/tone. Generates relevant hashtag clusters.",
                        "• <strong>Variation Engine:</strong> 'Repurpose' generates Funny, Dramatic, or Mysterious variations of the same post for A/B testing."
                    ]
                },
                {
                    level: 2, title: "5. World Building Guide",
                    content: [
                        "<strong>The Alchemist's Crucible:</strong> Dump raw, messy notes about magic, history, or geography.",
                        "• <strong>Distill Notes:</strong> The AI extracts distinct entities (Locations, Lore, Objects) into structured database cards.",
                        "• <strong>Refine Engine:</strong> Rewrites rough points into professional 'Codex Entry' style descriptions.",
                        "• <strong>Map Builder:</strong> Interactive canvas. 'Suggest Locations' scans the manuscript for mentioned places and adds pins automatically."
                    ]
                },
                {
                    level: 2, title: "6. Plot Brainstorming Guide",
                    content: [
                        "<strong>Pacing & Structure Analysis:</strong> Maps your story against standard arcs (Hero's Journey). Flags 'Pacing Drag' or 'Saggy Middles'.",
                        "<strong>Relationship Dynamics Mapper:</strong> Select two characters to see a line graph of their Sentiment (Hostile vs Allied) across the chapters.",
                        "<strong>Opportunity Detector:</strong> Scans for plot holes, dropped subplots, or continuity errors (e.g., a character appearing in two places at once)."
                    ]
                },
                {
                    level: 2, title: "7. Synopsis & Marketing Guide",
                    content: [
                        "<strong>Market Analyst:</strong> Suggests BISAC codes, keywords, and 'Comps' (comparable titles like 'Gone Girl meets The Martian').",
                        "<strong>Synopsis Generator:</strong> Reads your chapter summaries (not just the full text) to generate a Query Synopsis (300 words) and a Full Synopsis (1000+ words with spoilers).",
                        "<strong>Promotional Assets:</strong> Generates a Logline (elevator pitch) and Ideal Reader Profile."
                    ]
                }
            ]
        },
        {
            level: 1, title: "PART IV: WORKFLOWS & PHILOSOPHY", pageBreak: true, children: [
                {
                    level: 2, title: "Importing & Syncing",
                    content: [
                        "<strong>1. Import Manuscript:</strong> Upload a full .txt file. Novelos uses regex to split chapters and AI to auto-generate the Story Bible.",
                        "<strong>2. Adding Chapters in Noveli:</strong> Use the '+' icon in the portable toolbar.",
                        "<strong>3. Syncing Noveli back to Novelos:</strong> Click 'Export/Save' in Noveli to get a ZIP. In Novelos, click 'Import from Noveli'. The system updates existing chapters and appends new ones seamlessly."
                    ]
                },
                {
                    level: 2, title: "The 'Voice-First' Philosophy",
                    content: [
                        "Most AI tools try to write <em>for</em> you. Novelos is designed to <em>analyze</em>.",
                        "<strong>Voice Fingerprinting:</strong> By reading your manuscript, the AI learns your syntax, tone, and rhythm.",
                        "<strong>Authentic Assistance:</strong> Whether generating a tweet or a beta critique, the output is crafted in your persona, resolving the friction between AI utility and artistic integrity."
                    ]
                },
                {
                    level: 2, title: "Project Management & Operating System",
                    content: [
                        "Writing a book is a complex management task. The Assembly view moves beyond a text editor into a cohesive production environment.",
                        "Every pixel—from the frameless window to the 'Infinite Spread'—is designed to reduce cognitive load. The dedicated Audio Engine (mechanical keystrokes) provides tactile feedback to trigger a Pavlovian 'Flow State' response.",
                        "<strong>The Novelos Team.</strong>"
                    ]
                }
            ]
        }
    ];

    const sectionRefs = useRef<{[key: string]: HTMLHeadingElement | null}>({});

    const handleLinkClick = (title: string) => {
        sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleExport = () => {
        const paragraphs: Paragraph[] = [];
        
        const createRunsFromHtml = (htmlString: string): (TextRun | ExternalHyperlink)[] => {
            const runs: (TextRun | ExternalHyperlink)[] = [];
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;

            function processNode(node: Node, isBold = false) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                    runs.push(new TextRun({ text: node.textContent, bold: isBold }));
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as HTMLElement;
                    const currentBold = isBold || el.tagName.toLowerCase() === 'strong' || el.tagName.toLowerCase() === 'b';

                    if (el.tagName.toLowerCase() === 'a') {
                        const link = el.getAttribute('href');
                        if (link && el.textContent) {
                            runs.push(new ExternalHyperlink({
                                children: [new TextRun({ text: el.textContent, style: "Hyperlink" })],
                                link: link,
                            }));
                        }
                    } else {
                        el.childNodes.forEach(child => processNode(child, currentBold));
                    }
                }
            }
            
            tempDiv.childNodes.forEach(node => processNode(node, false));
            return runs;
        };
        
        paragraphs.push(new Paragraph({ text: "Novelos User Guide", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }));

        guideContent.forEach(section => {
            paragraphs.push(new Paragraph({ 
                text: section.title, 
                heading: HeadingLevel.HEADING_1, 
                pageBreakBefore: (section as any).pageBreak,
                spacing: { before: 400, after: 200 }
            }));

            (section.children as any[]).forEach((child: any) => {
                paragraphs.push(new Paragraph({ text: child.title, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }));
                
                if (child.content) {
                    child.content.forEach((p: string) => paragraphs.push(new Paragraph({ children: createRunsFromHtml(p), spacing: { after: 100 } })));
                }
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs,
            }],
        });
    
        Packer.toBlob(doc).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "novelos_user_guide.docx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    };

    return (
        <Modal onClose={onClose} settings={settings} title="Novelos User Guide" className="max-w-4xl">
            <div className="space-y-8 text-sm opacity-90 leading-relaxed">
                {/* Table of Contents */}
                <div>
                    <h2 className="text-2xl font-bold mb-4" style={{color: settings.textColor}}>Contents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        {guideContent.map(section => (
                            <div key={section.title} className="mb-4">
                                <h3 className="font-semibold text-base mb-2">
                                    <a onClick={() => handleLinkClick(section.title)} className="cursor-pointer hover:underline" style={{color: settings.accentColor}}>{section.title}</a>
                                </h3>
                                <ul className="space-y-1 pl-2">
                                    {(section.children as any[]).map(child => (
                                        <li key={child.title}>
                                            <a onClick={() => handleLinkClick(child.title)} className="cursor-pointer hover:underline text-xs">{child.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="my-8" style={{borderColor: settings.toolbarInputBorderColor}} />

                {/* Guide Content */}
                {guideContent.map(section => (
                    <div key={section.title}>
                        <h3 ref={el => { sectionRefs.current[section.title] = el; }} className="text-2xl font-semibold mb-4 scroll-mt-4 border-b pb-2" style={{color: settings.textColor, borderColor: settings.toolbarInputBorderColor}}>{section.title}</h3>
                        <div className="space-y-8">
                            {(section.children as any[]).map(child => (
                                <div key={child.title}>
                                    <h4 ref={el => { sectionRefs.current[child.title] = el; }} className="text-xl font-semibold mb-3 scroll-mt-4" style={{color: settings.textColor}}>{child.title}</h4>
                                    <div className="space-y-3">
                                        {child.content?.map((p: string, i: number) => <p key={i} dangerouslySetInnerHTML={{__html: p}} className="leading-relaxed" />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="h-8"></div>
                    </div>
                ))}
            </div>

             <div className="mt-6 pt-4 border-t flex justify-end" style={{ borderColor: settings.toolbarInputBorderColor }}>
                <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center"
                    style={{ backgroundColor: settings.toolbarButtonBg }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonHoverBg || ''}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.toolbarButtonBg || ''}
                    title="Export User Guide as DOCX"
                >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Export as DOCX
                </button>
            </div>
        </Modal>
    );
};
