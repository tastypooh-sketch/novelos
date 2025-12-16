import React from 'react';
import type { EditorSettings } from '../../types';

const MarkdownRenderer: React.FC<{ source: string, settings: EditorSettings }> = React.memo(({ source, settings }) => {
    const createMarkup = () => {
        if (!source) return { __html: '' };

        const processLine = (line: string) => {
            return line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        };

        let inList = false;
        const html = source
            .split('\n')
            .map(line => {
                let processedLine = line.trim();
                if (!processedLine) return '';

                const headingMatch = processedLine.match(/^(#+)\s(.*)/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const content = processLine(headingMatch[2]);
                    const tag = `h${Math.min(6, level + 2)}`;
                    
                    const classes = "font-semibold mt-4 mb-2";
                    const style = `color:${settings.textColor}; font-size: ${tag === 'h3' ? '1.125rem' : '1rem'};`;

                    if (inList) {
                        inList = false;
                        return `</ul><${tag} class="${classes}" style="${style}">${content}</${tag}>`;
                    }
                    return `<${tag} class="${classes}" style="${style}">${content}</${tag}>`;
                }

                if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
                    const content = processLine(processedLine.substring(2));
                    const listItem = `<li class="ml-5 list-disc mb-1">${content}</li>`;
                    if (!inList) {
                        inList = true;
                        return `<ul>${listItem}`;
                    }
                    return listItem;
                }

                if (inList) {
                    inList = false;
                    return `</ul><p>${processLine(processedLine)}</p>`;
                }
                
                return `<p>${processLine(processedLine)}</p>`;
            })
            .join('');

        return { __html: inList ? html + '</ul>' : html };
    };

    return <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={createMarkup()} />;
});

export default MarkdownRenderer;