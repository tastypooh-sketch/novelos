
export type DocNode =
  | { type: "title"; content: string }
  | { type: "section"; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export const novelosGuide: DocNode[] = [
  { type: "title", content: "NOVELOS USER GUIDE" },
  { type: "section", content: "PART I: NOVELI" },
  { type: "heading", level: 3, content: "Introduction: Writing unbound and uncompromised" },
  {
    type: "paragraph",
    content:
      "Noveli is an ultra-portable, single-file, horizontally scrolling word processor designed for creative writers, which is completely free to use. Born from the frustration of a novelist who found traditional word processors inefficient, Noveli challenges the norm of vertically scrolling portrait pages on landscape monitors. Those layouts waste valuable screen space and offer poor horizontal pagination, even with page fitting. Noveli solves this with a revolutionary Single-File Application that redefines digital writing platforms by putting absolute control back in the hands of the writer. It combines the instant speed of local software with the essential flexibility of the cloud.",
  },
  { type: "heading", level: 4, content: "What Noveli Delivers" },
  {
    type: "list",
    items: [
      "Horizontally scrolling, landscape-oriented word processor",
      "Absolute portability",
      "Independence from any operating system",
      "Elegant visual aesthetics",
      "Efficient code footprint",
      "Ultra-stable performance",
      "Full online and offline functionality",
      "Seamless integration with Novelos, a licenced AI-powered corkboarding suite",
    ],
  },
  { type: "heading", level: 4, content: "The Hybrid Advantage" },
  {
    type: "paragraph",
    content:
      "Because Noveli is just a single file, you decide where it lives. For maximum security and zero-latency performance, keep it on your hard drive for complete privacy. If you need cloud convenience, save your Noveli file in Google Drive, Dropbox, OneDrive or Box for automatic backup and cross-device accessibility. Either way, Noveli offers Zero-Footprint Writing: carry it on a USB stick and open it on any machine, whether it’s a public library PC, a borrowed MacBook or your own Chromebook, without installation or leaving any software traces behind. Your entire manuscript and the Noveli application code live together in one portable zipped file. You own the file. You own the words. You’re never locked in. Store it on a USB drive, email it or keep it in an offline digital vault. Noveli will always work, requiring only a web browser, such as Chrome, Edge or Safari, to open and edit your work. No servers, subscriptions or licenses required, at all, ever.",
  },
  { type: "heading", level: 4, content: "The Interface: The Infinite Spread—Designed for Novelists" },
  {
    type: "paragraph",
    content:
      "Noveli’s interface maximizes writing space and delivers elegant pagination through a minimalist yet visually striking design. The dual-pane editor spans the full width of your landscape monitor, creating an immersive environment for your text. Unlike traditional word processors that rely on an endless vertical scroll, which often evokes the psychological weight of a bottomless task, Noveli flows horizontally. When a page is filled, the text snaps forward, which produces a rhythmic sense of progress and completion. It feels like turning the pages of a physical book, but without any chance of papercuts.",
  },
  { type: "heading", level: 4, content: "Navigation" },
  {
    type: "paragraph",
    content:
      "Effortlessly move through your manuscript chapter by dragging the horizontal scroll bar, or mouse scroll wheel to scrub quickly, or Page Up and Page Down to flip spreads with precision.",
  },
  { type: "heading", level: 4, content: "Focus Mode" },
  {
    type: "paragraph",
    content:
      "Press the Eye Icon to enter Focus Mode. The interface disappears, leaving only you and your narrative in a clean, distraction-free space. Every pixel, from the frameless window to the Infinite Spread layout, is engineered to reduce cognitive load. Activate the Audio Engine for simulated mechanical keystrokes and a classic carriage-return bell. This auditory feedback triggers a Pavlovian rhythm that accelerates entry into a Flow State, something silent editors rarely achieve.",
  },
  { type: "heading", level: 4, content: "Seamless Integration with the Novelos Suite" },
  {
    type: "paragraph",
    content:
      "Noveli isn’t just a standalone word processor. It integrates seamlessly with Novelos Desktop, the flagship application for novelists offering advanced structural, AI and publishing tools. (See Part II for details.)",
  },
  { type: "heading", level: 4, content: "Aesthetics & Flow" },
  {
    type: "paragraph",
    content:
      "A beautiful environment inspires beautiful writing. Noveli’s design helps induce a creative flow state by harmonizing visuals with your narrative mood.",
  },
  { type: "heading", level: 4, content: "Design Gallery" },
  {
    type: "paragraph",
    content:
      "Click the Pencil Icon to explore themes that match your story’s tone. Midnight or Gothic for horror, Sepia or Paperback for romance, or simply choose what’s easiest on your eyes. Think of it as an expanded light/dark mode with personality.",
  },
  { type: "heading", level: 4, content: "Dynamic Backgrounds" },
  {
    type: "paragraph",
    content:
      "Upload an image or paste a URL into the background field to create a custom theme. Noveli’s engine analyzes the image, extracts dominant colors and recolors the entire interface, including text, buttons and accents, to harmonize with your chosen aesthetic. This visual cue sets the mood for your story world’s chapter, further helping you slip into creative flow.",
  },
  { type: "heading", level: 4, content: "Typewriter Sounds" },
  {
    type: "paragraph",
    content:
      "Click the Speaker Icon to enable mechanical keyboard sounds. These mathematically generated tones are via the Web Audio API rather than mp3s, which keeps Noveli lightweight, while providing rhythmic feedback to keep your fingers moving.",
  },
  { type: "heading", level: 4, content: "The Command Palette (Ctrl+K / Cmd+K) (Novelos)" },
  {
    type: "paragraph",
    content:
      "This is a spotlight-style search bar designed to keep your hands on the keyboard and your mind in the flow. Press Ctrl+K (or Cmd+K on Mac) to open a global search bar. Type the name of any Chapter, Character, or World Item, and the palette filters instantly. Press Enter to jump directly to that asset. It also supports commands like Toggle Focus Mode or Toggle Fullscreen, which eliminates menu diving. Jump from writing Chapter 3 to editing the villain’s backstory in Assembly Mode in seconds—without touching the mouse.",
  },
  { type: "heading", level: 4, content: "Global Search Results" },
  {
    type: "paragraph",
    content:
      "While standard Find navigates matches one by one, Global Results offers a macroscopic view of keyword usage. In the Find & Replace modal, click Find All to generate a clickable list of every occurrence across your manuscript. Each entry shows the Chapter Title, Number, and a context snippet containing the keyword. This is essential for continuity: track every mention of a Smoking Gun to ensure foreshadowing remains consistent throughout your book.",
  },
  { type: "heading", level: 4, content: "Iconography Reference: Decoding Your Workspace" },
  {
    type: "paragraph",
    content:
      "Noveli and Novelos Manuscript mode use a minimalist, symbolic interface designed to be unobtrusive until needed.",
  },
  {
    type: "table",
    headers: ["Icon Name", "Function", "Category"],
    rows: [
      ["Focus Mode", "Hides all toolbars, borders, and elements instantly. Toggle with ESC.", "Navigation & View"],
      ["Fullscreen", "Toggles the browser's full-screen mode. Combined with Focus Mode, this creates a dedicated writing appliance that only contains written text.", "Navigation & View"],
      ["Page Transition", "Toggles between Horizontal Scroll and Fade transitions between spreads. Fade is recommended for e-ink users or those prone to motion sickness.", "Navigation & View"],
      ["Design Gallery", "Opens the visual customization suite. Choose color themes, upload background images via URL, and adjust image opacity.", "Immersion & Atmosphere"],
      ["Cycle Background", "Instantly swaps the current background image to the next one in your Design Gallery.", "Immersion & Atmosphere"],
      ["Sound Toggle", "Enables/Disables Typewriter Mode, adding high-quality mechanical keyboard sounds and a bell 'ding'.", "Immersion & Atmosphere"],
      ["Read Aloud", "(Novelos only) Opens the Text-to-Speech player. Listen to your chapter read back to you to catch rhythm issues.", "Immersion & Atmosphere"],
      ["Stats Dashboard", "Displays your Manuscript Goal and Daily Goal. Visualizes your progress.", "Analysis & Assistance"],
      ["Notes/AI Assist", "Toggles the side panel. Contains Chapter Notes, (In Novelos, it also contains the AI Assist chat interface, and Beta Feedback summary space.", "Analysis & Assistance"],
      ["Alignment Toggle", "Switches the text between Left-Aligned and Justified (classic book print style with automatic hyphenation for improved aesthetics).", "The Writing Engine"],
      ["Spellcheck Toggle", "Toggles the browser's native spell checker on or off.", "The Writing Engine"],
      ["AI Proofreader", "(Novelos only) Scans your chapter for grammar, punctuation and stylistic errors, offering author voice and context-aware corrections.", "The Writing Engine"],
      ["Text Shortcuts", "Opens the Shortcuts Manager. Define custom expansions.", "The Writing Engine"],
      ["Find & Replace", "Opens a search dialog for Find and Replace that operates on the current chapter or entire manuscript.", "The Writing Engine"],
      ["Version History", "(Novelo only) Only active when saved to a Folder. Shows auto-saved snapshots.", "System & Data"],
      ["Cloud Sync", "(Novelos only) Connects Noveli to your Google Drive (or other providers) to back up/restore your file.", "System & Data"],
      ["Customize Toolbar", "(Novelos only) Opens the configuration menu. Location to show/hide buttons.", "System & Data"],
      ["User Guide", "Opens the in-app documentation.", "System & Data"],
      ["Donate/Support", "A link to support the developer.", "System & Data"],
    ],
  },
  { type: "heading", level: 4, content: "Saving" },
  { type: "heading", level: 6, content: "How Saving Works in Noveli" },
  {
    type: "paragraph",
    content:
      "Noveli operates differently from traditional desktop software because it runs entirely inside your web browser via the Noveli.html file. For security reasons, browsers cannot directly overwrite files on your hard drive. To overcome this, Noveli uses a Snapshot & Sync saving method.",
  },
  { type: "heading", level: 4, content: "The Save Action" },
  {
    type: "paragraph",
    content:
      "When you click Export/Save (or press Ctrl+S) inside Noveli, the app does not overwrite the HTML file you’re currently using. Instead, it instantly packages your manuscript, settings, and notes into a timestamped ZIP file: Noveli_Bookname_Day_Month_24Hour-Min.zip. This ZIP file downloads to your chosen location—your computer, a thumb drive, or any secure storage.",
  },
  { type: "heading", level: 4, content: "What’s Inside the ZIP?" },
  {
    type: "list",
    items: [
      "noveli_data.json — The brain of your project. This is what the main Novelos Desktop app uses to sync your progress.",
      "RTF_Backups folder — Standard Rich Text Format copies of every chapter. These files are readable in Word, Google Docs, or Scrivener, ensuring your words are never locked inside Noveli.",
    ],
  },
  { type: "heading", level: 4, content: "Closing the Loop if using Novelos (Syncing)" },
  {
    type: "list",
    ordered: true,
    items: [
      "Open Novelos Desktop.",
      "Click Import from Noveli.",
      "Select the most recent ZIP file you downloaded from Noveli.",
      "Novelos updates your main project file with the new content and warns you if the latest ZIP isn’t selected.",
      "Your entire project transfers instantly, including any design changes, into the full Novelos suite.",
    ],
  },
  {
    type: "paragraph",
    content:
      "From here, you can unlock advanced features like Novelos’ Assembly Mode with dynamic crosslinking and AI-powered tools.",
  },
  { type: "heading", level: 4, content: "Adding Chapters in Noveli" },
  {
    type: "paragraph",
    content:
      "Need to expand your book structure while away from your main Novelos desktop—or using Noveli exclusively? In the toolbar, click the + (Plus) icon next to the Chapter Selector dropdown. This instantly creates a new blank chapter at the end of your list, ready for writing. Important: These new chapters exist only in your current browser session until you Save/Export. Have a wonderful time writing with Noveli!",
  },

  { type: "section", content: "PART II: NOVELOS OVERVIEW" },
  { type: "heading", level: 4, content: "Philosophy" },
  {
    type: "paragraph",
    content:
      "Novelos is a Long-Form Novel Operating System: a desktop platform designed to function like your personal publishing team. It acts as a copy editor, technical editor, beta reader, brainstormer and publicist, all working together to understand your unique author voice and dramatically reduce the time spent on editing, feedback, marketing and promotion. This results in more time for what matters most: creative writing. Writing a novel is more than typing words. It’s a complex management task. Novelos’ Assembly Mode transforms the ideal word processor into a cohesive production environment. For example: A Pacing Heatmap instantly visualizes narrative tension, helping you spot sagging middles before they happen. The Crucible turns chaotic world-building brainstorms into structured encyclopedias. Social Media Studio converts your manuscript into a ready-to-use marketing library that helps authors become their own publicists. The true power of Novelos lies in its bi-directional sync that bridges creativity and structure. You can Forward Generate outlines from rough notes or Reverse Update from the evolving manuscript. This ensures your outline always reflects what you actually wrote, not just what you planned to write.",
  },
  { type: "heading", level: 4, content: "AI That Preserves Your Voice" },
  {
    type: "paragraph",
    content:
      "Many AI writing tools churn out generic prose that feels disconnected from your style. Novelos takes a different approach by analyzing rather than generating. By reading your manuscript, its AI learns your syntax, tone, rhythm and vocabulary. Whether it’s crafting a social media caption or suggesting a beta-reader fix, the output is tailored to your author voice. This solves the biggest friction writers have with AI: keeping the story’s soul intact and unmarred.",
  },
  { type: "heading", level: 4, content: "Noveli vs. Novelos: The Two-Engine Approach" },
  {
    type: "list",
    items: [
      "Noveli: The Satellite — Noveli is a portable, single-file word processor designed for absolute accessibility and portability. It’s a lightweight zipped HTML application you can carry on a USB drive and run on any computer, whether library, café or legacy hardware, without installation or requiring admin rights. It works in any browser, anywhere, ensuring you can write under any circumstances without relying on cloud servers.",
      "Novelos: The Mothership — Novelos is the full Novel OS: a powerful desktop suite for structural and analytical heavy lifting. It integrates an enhanced version of Noveli that imports chapters written on the go. Novelos handles advanced tasks like AI analysis, plot mapping, world-building and marketing.",
    ],
  },
  {
    type: "paragraph",
    content:
      "Together, this two-engine approach offers maximum flexibility: Write anywhere with Noveli, then harness the full power of Novelos for deep structural work and professional-grade publishing tools.",
  },

  { type: "heading", level: 3, content: "SECTION A: MANUSCRIPT MODE" },
  {
    type: "paragraph",
    content:
      "Manuscript Mode is the core writing interface of Novelos. It is designed to provide a distraction-free, immersive environment that mirrors the book-spread layout of the portable Noveli word processor while layering powerful context-aware AI tools on top of your text. Novelos does not write for you. Instead, it analyzes your manuscript as it evolves, learning your tone, vocabulary and rhythm so that every suggestion aligns with your voice.",
  },
  { type: "heading", level: 4, content: "The Editor Interface" },
  { type: "heading", level: 5, content: "Book Spread Layout" },
  {
    type: "paragraph",
    content:
      "The editor calculates screen width and splits text into a two-column book-spread view, mimicking a physical book where text flows horizontally from page to page. This adaptive layout, including scalable font size, is visually pleasing and allows more words per page than vertical orientation.",
  },
  { type: "heading", level: 5, content: "The AI Assist Panel (Sidebar)" },
  {
    type: "paragraph",
    content:
      "Located in the sidebar and toggled via the Notebook icon, this is a voice-aware in-line editorial brain of Novelos. It reads your manuscript to understand your style before offering feedback.",
  },
  {
    type: "list",
    items: [
      "Tab 1: AI Assist (Developmental Editing) — Drag highlighted text into the Drop Zone for targeted feedback:",
      "• Flow and Pacing Check: Analyzes sentence rhythm and flags clunky phrasing or run-ons",
      "• Show, Don’t Tell: Identifies abstract summaries and suggests sensory details for deeper immersion",
      "• Dialogue and Voice Review: Compares dialogue against character profiles for consistency",
      "• Tension Injection: Suggests narrative devices like ticking clocks or subtle threats to raise stakes",
      "Tab 2: Beta Feedback Summarizer — Beta Reader Room personas; Feedback Summarizer structures raw comments into Key Themes, Structural Criticisms, Positive Reactions and Actionable Suggestions",
      "Tab 3: Chapter Notes and Excerpts — A digital scratchpad for manual notes or saving excerpts; notes stay linked to the chapter",
    ],
  },
  { type: "heading", level: 4, content: "Contextual Intelligence Tools" },
  { type: "heading", level: 5, content: "The What If? Engine" },
  {
    type: "paragraph",
    content:
      "Accessed by highlighting text and right-clicking in the editor, it generates 3 plausible alternative outcomes for a highlighted plot point based on the preceding story trajectory. This helps authors explore narrative branches and cures writer’s block.",
  },
  { type: "heading", level: 5, content: "Smart Read Aloud (Neural TTS)" },
  {
    type: "paragraph",
    content:
      "An advanced Text-to-Speech engine where specific neural voices (e.g., 'Kore', 'Fenrir') can be assigned to characters. It allows authors to \"hear\" their dialogue performed to check for naturalism and rhythmic issues.",
  },
  { type: "heading", level: 5, content: "AI Proofreader" },
  {
    type: "paragraph",
    content:
      "Accessed via the Toolbar, it scans the chapter for spelling, grammar and punctuation errors, providing an explanation for each correction. This acts as an additional polish to catch technical errors that standard spellcheckers miss.",
  },
  { type: "heading", level: 4, content: "Toolbar Utilities" },
  { type: "heading", level: 5, content: "Design Gallery" },
  { type: "paragraph", content: "Full customization of the editor's aesthetic, including fonts, background colors (Midnight, Sepia), and background images." },
  { type: "heading", level: 5, content: "Version History" },
  { type: "paragraph", content: "Tracks local saves of the chapter, allowing the user to view previous drafts and restore them. Provides a safety net for editing." },
  { type: "heading", level: 5, content: "Writing Stats & Goals" },
  { type: "paragraph", content: "Tracks Session Word Count versus Total Manuscript Word Count. Users can set Daily Goals to motivate progress." },
  { type: "heading", level: 5, content: "Find & Replace" },
  { type: "paragraph", content: "Standard search with Case Sensitive and Whole Word toggles for the current chapter or entire manuscript." },
  { type: "paragraph", content: "The Typesetter (Typography Controls) — Toggle Serif/Sans-Serif, adjust line spacing and font size." },
  { type: "paragraph", content: "Contextual Brainstorming (Right-Click \"What If?\") — Generate narrative alternatives for selected text directly in context." },

  { type: "heading", level: 4, content: "File Management" },
  { type: "heading", level: 5, content: "Export for Noveli" },
  {
    type: "paragraph",
    content:
      "Packages the entire writing project (Chapters, Settings and selected Assets) into a standalone HTML/Zip file for portable writing anywhere.",
  },
  { type: "heading", level: 5, content: "Save to Folder" },
  {
    type: "paragraph",
    content:
      "Writes the project data to the local file system in a structured format of RTF files for chapters and JSON for metadata.",
  },
  { type: "heading", level: 5, content: "Importing Noveli back to Novelos" },
  {
    type: "list",
    items: [
      "In Noveli: Export/Save to generate Noveli_Projectname_Date_time.zip.",
      "In Novelos Desktop: Import from Noveli to update existing chapters and append new ones by ID.",
      "Switch to Assembly View and use Update from Manuscript to generate summaries and outlines for new chapters.",
    ],
  },
  { type: "heading", level: 5, content: "The Rescue Protocol (Crash Recovery)" },
  {
    type: "paragraph",
    content:
      "If a critical error occurs, a Rescue Mode allows Download Rescue Backup to generate an emergency JSON dump (novelos_rescue_backup_[timestamp].json) so words are never lost.",
  },

  { type: "section", content: "PART II: ASSEMBLY MODE" },
  {
    type: "paragraph",
    content:
      "Assembly Mode is the structural backend of Novelos. It captures, distills and cross-links chapters, characters, world lore, marketing assets and analytical insights into a synchronized database that evolves with the manuscript.",
  },
  { type: "heading", level: 4, content: "1. Chapter Board — Structure & Pacing Command Center" },
  {
    type: "paragraph",
    content:
      "Drag chapters between Act 1, Act 2 and Act 3; numbering auto-updates and underlying chapter RTF files are automatically renumbered. A Pacing Heatmap visualizes tension with scores from −1 (cool blues) to +1 (hot reds). Collapsed chapter cards show thumbnails; expanded cards reveal Summary, Outline and Story Analysis. Two synchronization flows: Update from Manuscript (overwrite summaries/analyses from real prose) and Generate from Notes (turn rough bullets into structured plans). Intelligent linking binds chapters to characters and snippets.",
  },
  { type: "heading", level: 4, content: "2. Character Cast — Dynamic Persona Engine" },
  {
    type: "paragraph",
    content:
      "A living cast list with reorderable visual cards, starring for primaries, and faction coding. Profiles include portraits (generated or uploaded), taglines, summaries, and rich Markdown. Relationship fields create reciprocal links. AI: Generate Profile from notes; Update from Manuscript to reflect actual events. Drag characters onto chapter cards to tag presence and power context-aware analysis.",
  },
  { type: "heading", level: 4, content: "3. Snippet Repository — Idea Scrapyard & Placement Engine" },
  {
    type: "paragraph",
    content:
      "Dump braindumps; processing splits and categorizes into dialogue, description, internal monologue, theme, action, world-building or uncategorized. Auto-tag speakers and mentions; manual tagging supported. Placement suggestions compare content against chapter summaries to propose top homes with confidence ratings; send, revert, and surface linked snippets in chapter dashboards.",
  },
  { type: "heading", level: 4, content: "4. Social Media Studio — Automated Publicist" },
  {
    type: "paragraph",
    content:
      "Send excerpts from Manuscript Mode or let the engine surface high-engagement moments. Generate high-definition images (Mood Only or With Characters). Voice-aware copywriting mimics your tone and optimizes captions per platform with hashtags and scripts. Variation engine supports A/B testing; export PNGs and ready-to-copy text.",
  },
  { type: "heading", level: 4, content: "5. World Building — The Crucible and Living Codex" },
  {
    type: "paragraph",
    content:
      "Distill raw notes into locations, lore, objects, organizations and concepts. Repository cards present taxonomy; refine action rewrites notes into professional codex entries and succinct summaries. Spatial map with pins, pan and zoom; Suggest Locations infers coordinates from context. Integration stabilizes rules and captures spontaneous inventions.",
  },
  { type: "heading", level: 4, content: "6. Plot Brainstorming Suite — Structural Analyst" },
  {
    type: "paragraph",
    content:
      "Generates a plot timeline with major/supporting beats against narrative structures; horizontal visualization surfaces issues. Relationship Dynamics Mapper quantifies emotional distance; opportunity detection suggests twists/callbacks; logical checks catch contradictions; arc stress tests flag out-of-character behavior. Lateral integration keeps insights synchronized with changes.",
  },
  { type: "heading", level: 4, content: "7. Synopsis & Market Mode — Automated Sales Department" },
  {
    type: "paragraph",
    content:
      "Analyzes themes, tropes and tone to position the book with comparable titles, produces BISAC codes and keywords, and generates loglines, taglines and ideal reader profiles. Outputs two synopsis formats (~300-word blurb and ~1000-word spoiler doc) based on Chapter Board summaries. Comparable titles triangulate tone; BISAC codes meet standards; promotional assets include loglines, taglines, vibe checks and ideal reader definitions. Cinematic storyboarding can generate atmospheric images; favorite visuals can be locked; characters may be injected; linked snippets appear on dashboards.",
  },
  { type: "paragraph", content: "The Novelos Team" },
];
