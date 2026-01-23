
import React from 'react';
import { Modal } from './Modal';
import type { EditorSettings } from '../../../types';

interface UserGuideModalProps {
    settings: EditorSettings;
    onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ settings, onClose }) => {
    const guideContent = [
        {
            level: 1, 
            title: "PART I: NOVE (PORTABLE)", 
            children: [
                {
                    level: 2, 
                    title: "Introduction",
                    content: [
                        "Nove is an ultra-portable, single-file, horizontally scrolling word processor designed for creative writers. It challenges the norm of vertically scrolling portrait pages on landscape monitors, maximizing your screen real estate.",
                        "It is designed to be absolute portable, system-independent, and seamless in its integration with Novelos (the full Desktop suite)."
                    ]
                },
                {
                    level: 2, 
                    title: "The Interface: The Infinite Spread",
                    content: [
                        "Nove's interface maximizes writing space through a minimalist design. The dual-pane editor flows horizontally. When a spread is filled, the text snaps forward, mimicking the page-turning rhythm of a physical book.",
                        "Navigation is simple: use your mouse wheel, drag the scrollbar, or use Page Up/Page Down keys to flip spreads instantly."
                    ]
                },
                {
                    level: 2, 
                    title: "Iconography Reference",
                    content: [
                        "• <strong>Focus Mode:</strong> Hides all UI elements instantly. Toggle with ESC.",
                        "• <strong>Page Transition:</strong> Toggles between Horizontal Scroll and Fade transitions.",
                        "• <strong>Design Gallery:</strong> Customizes themes and background images.",
                        "• <strong>Typewriter Sounds:</strong> Provides rhythmic auditory feedback for mechanical keystrokes.",
                        "• <strong>Stats Dashboard:</strong> Tracks your manuscript and daily goals.",
                        "• <strong>Find & Replace:</strong> Operates on current chapter or entire manuscript."
                    ]
                }
            ]
        },
        {
            level: 1, 
            title: "PART II: NOVELOS (ASSEMBLY MODE)", 
            children: [
                {
                    level: 2, 
                    title: "Structural Engineering",
                    content: [
                        "While Nove is for drafting, Assembly Mode is for structural engineering. Use the following panels to manage your story's DNA:",
                        "• <strong>Chapters:</strong> Outline your book using the Act system (1, 2, and 3). Drag and drop chapters to reorganize them.",
                        "• <strong>Characters:</strong> Build deep profiles. Link characters to specific chapters to track their presence.",
                        "• <strong>World:</strong> Use the Crucible to distill messy notes into a structured Story Bible. Map locations on a visual Map Builder.",
                        "• <strong>Snippets:</strong> A repository for loose ideas. Let AI suggest where in your manuscript they should be placed."
                    ]
                },
                {
                    level: 2, 
                    title: "Advanced AI Analysis",
                    content: [
                        "• <strong>Pacing Heatmap:</strong> Visualizes the tension and speed of your narrative across all chapters.",
                        "• <strong>Plot Brainstorm:</strong> Detects plot holes, suggests twists, and analyzes character arc consistency.",
                        "• <strong>Social Media Studio:</strong> Automatically generates promotional images and captions for Instagram and TikTok based on your actual manuscript content."
                    ]
                }
            ]
        }
    ];

    return (
        <Modal onClose={onClose} settings={settings} title="Novelos User Guide" className="max-w-4xl">
            <div className="space-y-8 py-2">
                {guideContent.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-6">
                        <h2 className="text-2xl font-serif font-bold tracking-tight border-b pb-2" style={{ borderColor: settings.toolbarInputBorderColor, color: settings.accentColor }}>
                            {section.title}
                        </h2>
                        <div className="space-y-8 pl-2">
                            {section.children.map((child, cIdx) => (
                                <div key={cIdx} className="space-y-3">
                                    <h3 className="text-lg font-bold opacity-90">{child.title}</h3>
                                    <div className="space-y-4 text-sm leading-relaxed opacity-80">
                                        {child.content.map((paragraph, pIdx) => (
                                            <p key={pIdx} dangerouslySetInnerHTML={{ __html: paragraph }} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="pt-8 text-center border-t opacity-40 text-xs" style={{ borderColor: settings.toolbarInputBorderColor }}>
                    <p>Novelos v7.3.9 &mdash; Thomas Corfield</p>
                </div>
            </div>
        </Modal>
    );
};
