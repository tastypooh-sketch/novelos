
export class NoveFormatter {
    private static muscleMemory: Record<string, string> = {
        'teh': 'the',
        'adn': 'and',
        'taht': 'that',
        'hvea': 'have',
        'form': 'from',
        'recieve': 'receive',
        'beleive': 'believe',
        'wierd': 'weird',
        'decieve': 'deceive',
        "don;t": "don't",
        "won;t": "won't",
        "can;t": "can't",
        "it;s": "it's"
    };

    private static getCaretCharacterOffsetWithin(element: HTMLElement) {
        let caretOffset = 0;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
        return caretOffset;
    }

    private static setCaretPosition(element: HTMLElement, offset: number) {
        const range = document.createRange();
        const sel = window.getSelection();
        let charCount = 0;
        let found = false;

        const traverseNodes = (node: Node) => {
            if (found) return;
            if (node.nodeType === 3) { // Text node
                const nextCharCount = charCount + (node.textContent?.length || 0);
                if (!found && offset <= nextCharCount) {
                    range.setStart(node, offset - charCount);
                    range.collapse(true);
                    found = true;
                }
                charCount = nextCharCount;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverseNodes(node.childNodes[i]);
                }
            }
        };

        traverseNodes(element);
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    public static polish(text: string): string {
        let p = text;

        // 1. Muscle Memory & Semicolon Slips
        Object.entries(this.muscleMemory).forEach(([typo, fix]) => {
            const regex = new RegExp(`\\b${typo}\\b`, 'g');
            p = p.replace(regex, fix);
        });

        // 2. Typographic Polish
        p = p.replace(/--/g, '—'); // Em-dash
        p = p.replace(/\.\.\.\.?/g, '…'); // Ellipsis
        p = p.replace(/\(c\)/gi, '©');
        p = p.replace(/\b1\/2\b/g, '½');
        p = p.replace(/\b1\/4\b/g, '¼');
        p = p.replace(/\b3\/4\b/g, '¾');

        // 3. Spacing Logic
        p = p.replace(/\s+([.,!?:;])/g, '$1'); // No space before punctuation
        p = p.replace(/([.!?])([A-Z])/g, '$1 $2'); // Ensure space after period
        p = p.replace(/ {2,}/g, ' '); // Collapse double spaces

        // 4. Capitalization
        // Pronoun i
        p = p.replace(/\bi\b/g, 'I');
        p = p.replace(/\bi'([a-z]+)\b/g, (m, p1) => `I'${p1}`);
        
        // Sentence start
        p = p.replace(/(^|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
        
        // Sticky Shift (THis -> This)
        p = p.replace(/\b([A-Z]{2})([a-z]+)\b/g, (m, p1, p2) => p1.charAt(0) + p1.charAt(1).toLowerCase() + p2);

        // 5. Fiction Specifics
        // Dialogue Tag fix: ." said -> ," said
        p = p.replace(/\."(\s+)(said|asked|whispered|shouted|replied|shook|nodded|gasped|cried)/gi, '," $2');

        return p;
    }

    /**
     * Attaches the formatter to a ContentEditable element.
     */
    public static init(element: HTMLElement, onUpdate: (newHtml: string) => void) {
        let timeout: ReturnType<typeof setTimeout>;

        element.addEventListener('input', (e: Event) => {
            const inputEvent = e as InputEvent;
            // Don't format while the user is actively deleting or during composition
            if (inputEvent.inputType?.includes('delete') || inputEvent.isComposing) return;

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const offset = this.getCaretCharacterOffsetWithin(element);
                const currentHtml = element.innerHTML;
                
                // We process text content but need to preserve the basic structure
                // Simple heuristic: if we contain actual complex HTML (tags other than div/br/b/i), we skip deep polish to avoid breaking nodes.
                // For a novel editor, we usually only have divs, brs, bs, and is.
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentHtml;
                
                let changed = false;
                const processNode = (node: Node) => {
                    if (node.nodeType === 3) { // Text node
                        const original = node.textContent || '';
                        const polished = this.polish(original);
                        if (original !== polished) {
                            node.textContent = polished;
                            changed = true;
                        }
                    } else {
                        node.childNodes.forEach(processNode);
                    }
                };

                processNode(tempDiv);

                if (changed) {
                    const newHtml = tempDiv.innerHTML;
                    element.innerHTML = newHtml;
                    onUpdate(newHtml);
                    // Restore caret position
                    this.setCaretPosition(element, offset);
                }
            }, 700); // 700ms debounce for natural writing flow
        });
    }
}
