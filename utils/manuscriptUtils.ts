

import { Packer, Document, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, ExternalHyperlink } from 'docx';
import JSZip from 'jszip';
import type { IChapter, INovelState, EditorSettings, ICharacter, ISnippet, WritingGoals } from '../types';
import { generateNoveliHTML } from './noveliGenerator';

// --- ZIP PROTOCOL UTILS ---

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const generateTimestampedName = (projectName: string): string => {
    const safeName = projectName.replace(/[^a-z0-9]/gi, '_').substring(0, 40) || 'Untitled';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = MONTH_NAMES[now.getMonth()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    
    // Format: Project_Name_01_Dec_15_56.zip
    return `${safeName}_${dd}_${mmm}_${hh}_${mm}.zip`;
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
    // Regex to match: _DD_MMM_HH_mm.zip
    // Example: The_Book_01_Dec_15_30.zip
    const regex = /_(\d{2})_([A-Za-z]{3})_(\d{2})_(\d{2})\.zip$/;
    const match = filename.match(regex);
    
    if (match) {
        const [_, dd, mmm, hh, mm] = match;
        const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === mmm.toLowerCase());
        
        if (monthIndex !== -1) {
            const now = new Date();
            const date = new Date(now.getFullYear(), monthIndex, parseInt(dd), parseInt(hh), parseInt(mm));
            
            // Handle edge case of year rollover if necessary (simple heuristic: if date is in future, assume previous year)
            if (date > now) {
                date.setFullYear(date.getFullYear() - 1);
            }
            return date;
        }
    }
    return null;
};

const getFaviconBase64 = async (): Promise<string> => {
    try {
        // Try fetching the icon from the public root
        // In Vite dev: /icon.png
        // In Prod (Electron): ./icon.png relative to index.html
        let response = await fetch('./icon.png');
        if (!response.ok) response = await fetch('./icon.ico');
        
        if (response.ok) {
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        }
    } catch (e) {
        console.warn("Failed to load favicon for Noveli export", e);
    }
    return "";
};

export const createProjectZip = async (state: INovelState, settings: EditorSettings): Promise<Blob> => {
    const zip = new JSZip();
    
    // 1. Core Data
    zip.file("project_data.json", JSON.stringify(state, null, 2));
    zip.file("settings.json", JSON.stringify(settings, null, 2));
    
    // 2. Human Readable Backups
    const rtfFolder = zip.folder("rtf");
    if (rtfFolder) {
        state.chapters.forEach(ch => {
            const rtf = generateInitialChapterRtf(ch);
            const safeTitle = ch.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            rtfFolder.file(`${ch.chapterNumber}_${safeTitle}.rtf`, rtf);
        });
    }

    return await zip.generateAsync({ type: "blob" });
};

// --- EXISTING UTILS ---

export const smartQuotes = (text: string): string => {
  return text
    .replace(/(^|[-\u2014\s(\["])'/g, "$1\u2018") // Opening single quote
    .replace(/'/g, "\u2019") // Closing single quote / apostrophe
    .replace(/(^|[-\u2014/\[(\u2018\s])"/g, "$1\u201C") // Opening double quote
    .replace(/"/g, "\u201D") // Closing double quote
    .replace(/--/g, "\u2014"); // Em-dash
};

const escapeRtfText = (text: string): string => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = text.charCodeAt(i);
        if (char === '\\' || char === '{' || char === '}') {
            result += `\\${char}`;
        } else if (code >= 128) {
            result += `\\u${code}?`;
        } else if (code < 32 && char !== '\t') {
            // Ignore most control characters. Let paragraph structure handle line breaks.
        } else {
            result += char;
        }
    }
    return result;
};

const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const processNodeForRtf = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
        return escapeRtfText(node.textContent || '');
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        let childrenRtf = Array.from(element.childNodes).map(processNodeForRtf).join('');
        
        switch (tagName) {
            case 'i': case 'em': return `{\\i ${childrenRtf}}`;
            case 'b': case 'strong': return `{\\b ${childrenRtf}}`;
            case 'br': return '\\line '; // Handle <br> as a line break within a paragraph
            default: return childrenRtf;
        }
    }
    return '';
};

export const generateRtfForChapters = (chapters: IChapter[]): string => {
    const header = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033`;
    const fontTbl = `{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}`;
    const styles = `\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24`; // 12pt Times New Roman

    const rtfChapters = chapters.map(chapter => {
        const chapterTitleText = `${chapter.title} ${chapter.chapterNumber}`;
        const sanitizedTitle = escapeRtfText(chapterTitleText);
        const chapterTitle = `{\\pard\\qc\\b\\fs32 ${sanitizedTitle}\\par\\par}`;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapter.content;

        const paragraphs = Array.from(tempDiv.childNodes).map((node, index) => {
             if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'DIV') {
                const indent = index === 0 ? '{\\pard\\fi0 ' : '{\\pard\\fi360 ';
                const content = Array.from(node.childNodes).map(processNodeForRtf).join('');
                return `${indent}${content}\\par}`;
             }
             return null;
        }).filter(Boolean).join('\n');

        return `${chapterTitle}${paragraphs}`;
    }).join('\\page\n');

    return `${header}\n${fontTbl}\n${styles}\n${rtfChapters}\n}`;
};

export const generateBriefingChapterRtf = (chapter: IChapter, allCharacters: ICharacter[], allSnippets: ISnippet[]): string => {
    const header = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033`;
    const fontTbl = `{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}{\\f1\\fnil\\fcharset0 Courier New;}}`;
    const styles = `\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24`;

    const chapterTitleText = `${chapter.title} ${chapter.chapterNumber}`;
    const sanitizedTitle = escapeRtfText(chapterTitleText);
    const chapterTitle = `{\\pard\\qc\\b\\fs32 ${sanitizedTitle}\\par\\par}`;

    // --- BRIEFING SECTION ---
    let briefingRtf = `{\\pard\\sa100\\fs20\\i [CHAPTER BRIEFING]\\par}`;
    
    // Tagline
    if (chapter.tagline) {
        briefingRtf += `{\\pard\\sa100\\b Tagline: \\b0 ${escapeRtfText(chapter.tagline)}\\par}`;
    }

    // Keywords
    if (chapter.keywords && chapter.keywords.length > 0) {
        briefingRtf += `{\\pard\\sa100\\b Keywords: \\b0 ${escapeRtfText(chapter.keywords.join(', '))}\\par}`;
    }

    // Characters
    const involvedCharacters = (chapter.characterIds || [])
        .map(id => allCharacters.find(c => c.id === id)?.name)
        .filter(Boolean);
    
    if (involvedCharacters.length > 0) {
        briefingRtf += `{\\pard\\sa100\\b Characters: \\b0 ${escapeRtfText(involvedCharacters.join(', '))}\\par}`;
    }

    // Summary
    if (chapter.summary) {
        briefingRtf += `{\\pard\\sa100\\b Summary: \\b0 ${escapeRtfText(chapter.summary)}\\par}`;
    }

    // Snippets
    const involvedSnippets = (chapter.linkedSnippetIds || [])
        .map(id => allSnippets.find(s => s.id === id)?.cleanedText)
        .filter(Boolean);

    if (involvedSnippets.length > 0) {
        briefingRtf += `{\\pard\\sa100\\b Included Snippets: \\b0\\par}`;
        involvedSnippets.forEach(text => {
            briefingRtf += `{\\pard\\li360\\sa100\\f1\\fs20 "${escapeRtfText(text || '')}"\\par}`;
        });
        briefingRtf += `{\\pard\\sa200\\par}`; // Reset indent
    }

    // Separator
    briefingRtf += `{\\pard\\qc\\sa300 * * *\\par}`;

    // --- CONTENT SECTION ---
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapter.content;

    const contentParagraphs = Array.from(tempDiv.childNodes).map((node, index) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'DIV') {
            const indent = index === 0 ? '{\\pard\\fi0 ' : '{\\pard\\fi360 ';
            const content = Array.from(node.childNodes).map(processNodeForRtf).join('');
            return `${indent}${content}\\par}`;
            }
            return null;
    }).filter(Boolean).join('\n');

    return `${header}\n${fontTbl}\n${styles}\n${chapterTitle}\n${briefingRtf}\n${contentParagraphs}\n}`;
};

export const generateBriefingHtml = (chapter: IChapter, allCharacters: ICharacter[], allSnippets: ISnippet[]): string => {
    // Generate simple, editable paragraphs with sanitized content
    let html = `<div><strong>[ CHAPTER BRIEFING ]</strong></div>`;
    
    if (chapter.tagline) {
        html += `<div><strong>Tagline:</strong> ${escapeHtml(chapter.tagline)}</div>`;
    }

    if (chapter.keywords && chapter.keywords.length > 0) {
        const keywords = chapter.keywords.map(escapeHtml).join(', ');
        html += `<div><strong>Keywords:</strong> ${keywords}</div>`;
    }

    const involvedCharacters = (chapter.characterIds || [])
        .map(id => allCharacters.find(c => c.id === id)?.name)
        .filter(Boolean)
        .map(name => escapeHtml(name || ''));
    
    if (involvedCharacters.length > 0) {
        html += `<div><strong>Characters:</strong> ${involvedCharacters.join(', ')}</div>`;
    }

    if (chapter.summary) {
        html += `<div><strong>Summary:</strong> ${escapeHtml(chapter.summary)}</div>`;
    }

    const involvedSnippets = (chapter.linkedSnippetIds || [])
        .map(id => allSnippets.find(s => s.id === id)?.cleanedText)
        .filter(Boolean)
        .map(text => escapeHtml(text || ''));

    if (involvedSnippets.length > 0) {
        html += `<div><strong>Required Snippets:</strong></div>`;
        involvedSnippets.forEach(text => {
            html += `<div>- "${text}"</div>`;
        });
    }

    html += `<div>* * *</div><div><br></div>`;
    
    return html;
};

export const downloadFile = (filename: string, content: string, mimeType: string) => {
    // @ts-ignore
    if (window.electronAPI) {
        // @ts-ignore
        window.electronAPI.saveFile({ name: filename, content: new TextEncoder().encode(content) });
    } else {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const calculateWordCountFromHtml = (html: string): number => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.innerText || '';
    return text.trim().split(/\s+/).filter(Boolean).length;
};


export const generateInitialChapterRtf = (chapter: IChapter): string => {
    return generateRtfForChapters([chapter]);
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const fetchImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
    if (url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        if (!base64) throw new Error('Invalid data URL');
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
};

export const markdownToDocxParagraphs = (markdown: string | undefined): Paragraph[] => {
    if (!markdown) return [new Paragraph("")];

    const paragraphs: Paragraph[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
        if (line.trim() === '') {
            paragraphs.push(new Paragraph({}));
            continue;
        }

        const headingMatch = line.match(/^(#+)\s/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = line.substring(headingMatch[0].length);
            let headingLevel;
            switch (level) {
                case 1: headingLevel = HeadingLevel.HEADING_1; break;
                case 2: headingLevel = HeadingLevel.HEADING_2; break;
                case 3: headingLevel = HeadingLevel.HEADING_3; break;
                case 4: headingLevel = HeadingLevel.HEADING_4; break;
                default: headingLevel = HeadingLevel.HEADING_5; break;
            }
            paragraphs.push(new Paragraph({ text, heading: headingLevel, spacing: { before: 200 } }));
            continue;
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
            const text = line.substring(2);
            const runs = text.split(/(\*\*.*?\*\*)/).filter(part => part).map(part => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return new TextRun({ text: part.slice(2, -2), bold: true });
                }
                return new TextRun(part);
            });
            paragraphs.push(new Paragraph({ children: runs, bullet: { level: 0 } }));
            continue;
        }

        const runs = line.split(/(\*\*.*?\*\*)/).filter(part => part).map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun(part);
        });
        paragraphs.push(new Paragraph({ children: runs }));
    }

    return paragraphs;
};

// --- NOVELI EXPORT UTILS ---

export const exportForNoveli = async (fullState: INovelState, settings: EditorSettings, writingGoals: WritingGoals) => {
    const zip = new JSZip();
    
    // Fetch favicon
    const favicon = await getFaviconBase64();

    // 1. Generate Standalone Application HTML
    const noveliHtml = generateNoveliHTML(fullState, settings, writingGoals, favicon);
    zip.file("Noveli.html", noveliHtml);

    // 2. Add raw data files
    const projectData = zip.folder("Project_Data");
    if (projectData) {
        // We create a backup zip inside the export to act as the "Initial Save" for the portable user
        const initialBackup = await createProjectZip(fullState, settings);
        const name = generateTimestampedName("Novelos_Export"); // Default name, user can rename file
        projectData.file(name, initialBackup);
    }

    // 3. Generate Zip
    const content = await zip.generateAsync({ type: "blob" });
    const filename = generateTimestampedName("Noveli_Portable");
    
    // 4. Save
    // @ts-ignore
    if (window.electronAPI) {
        try {
            const arrayBuffer = await content.arrayBuffer();
            // @ts-ignore
            await window.electronAPI.saveFile({ 
                name: filename, 
                content: new Uint8Array(arrayBuffer) 
            });
            
            // CRITICAL: Set sync flag
            localStorage.setItem('novelos_sync_flag', 'true');
            alert("Export complete. Sync flag set. When you return, Novelos will ask for the latest portable file.");

        } catch (e) {
            console.error("Electron save failed:", e);
            alert("Failed to save via Electron dialog. " + e);
        }
    } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        localStorage.setItem('novelos_sync_flag', 'true');
    }
};

/**
 * Creates a clean Noveli zip file for distribution (e.g., store upload).
 * It contains an empty project state.
 */
export const exportDistributionNoveli = async (cleanState: INovelState, defaultSettings: EditorSettings) => {
    const zip = new JSZip();
    
    // Fetch favicon
    const favicon = await getFaviconBase64();

    // 1. Generate Clean HTML
    // Default goals for a new user
    const goals: WritingGoals = { manuscriptGoal: 50000, dailyGoal: 1000 };
    const noveliHtml = generateNoveliHTML(cleanState, defaultSettings, goals, favicon);
    
    // 2. Add ONLY the HTML file. No Project_Data folder needed for a fresh start.
    zip.file("Noveli.html", noveliHtml);

    // 3. Generate Zip
    const content = await zip.generateAsync({ type: "blob" });
    const filename = "Noveli_Portable_Distribution.zip";
    
    // 4. Save
    // @ts-ignore
    if (window.electronAPI) {
        try {
            const arrayBuffer = await content.arrayBuffer();
            // @ts-ignore
            await window.electronAPI.saveFile({ 
                name: filename, 
                content: new Uint8Array(arrayBuffer) 
            });
            alert("Distribution copy created successfully!");
        } catch (e) {
            console.error("Electron save failed:", e);
            alert("Failed to save via Electron dialog.");
        }
    } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const parseNoveliSync = async (file: File): Promise<{ state: INovelState, settings?: EditorSettings } | null> => {
    if (file.name.endsWith('.zip')) {
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            
            // Look for project_data.json at root (Novelos/Portable Save)
            let jsonFile = content.file("project_data.json");
            
            // Legacy/Fallback lookups
            if (!jsonFile) jsonFile = content.file("noveli_data.json");
            if (!jsonFile) jsonFile = content.file("Project_Data/project_meta.json");
            
            if (!jsonFile) {
                const anyJson = Object.keys(content.files).find(name => name.endsWith('.json'));
                if (anyJson) jsonFile = content.file(anyJson);
            }

            if (jsonFile) {
                const jsonStr = await jsonFile.async("string");
                const json = JSON.parse(jsonStr);
                
                // Try to find settings too
                let settings = undefined;
                const settingsFile = content.file("settings.json");
                if (settingsFile) {
                    const settingsStr = await settingsFile.async("string");
                    settings = JSON.parse(settingsStr);
                }

                if (json && (json.chapters || json.state?.chapters)) {
                    const state = json.chapters ? json : json.state; // Handle potential wrapping
                    // Cast to unknown first to avoid partial type mismatch during raw load
                    return { state: state as unknown as INovelState, settings };
                }
            }
            throw new Error("No valid project data found in Zip.");
        } catch (err) {
            console.error("Failed to parse Zip:", err);
            throw err;
        }
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    if (json && json.chapters) {
                        const state = json as unknown as INovelState;
                        const settings = json.settings as EditorSettings | undefined;
                        resolve({ state, settings });
                    } else {
                        reject(new Error("Invalid Noveli sync file format."));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
};