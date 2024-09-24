import Quill from 'quill';

const Embed = Quill.import('blots/embed');

export class CopilotSuggestion extends Embed {
    static blotName = 'copilot-suggestion';
    static tagName = 'span';

    static create(value: string) {
        const node = super.create(value);
        node.setAttribute('data-copilot-suggestion', value);
        node.classList.add('copilot-suggestion');
        return node;
    }

    static value(node: HTMLElement) {
        return node.getAttribute('data-copilot-suggestion');
    }
}

Quill.register(CopilotSuggestion);

export default class QuillCopilot {
    quill: Quill;
    options: any;
    suggestFn: (text: string) => Promise<string>;

    constructor(quill: Quill, options: any) {
        this.quill = quill;
        this.options = options;
        this.suggestFn = options.suggestFn || ((text: string) => Promise.resolve(''));
        this.attachTextChangeHandler();
    }

    attachTextChangeHandler() {
        this.quill.on('text-change', async (delta, oldDelta, source) => {
            if (source === 'user') {

                const text = this.quill.getText();
                const suggestion = await this.suggestFn(text);
                if (suggestion) {
                    this.showSuggestion(text.length, suggestion);
                }
            }
        });

        this.quill.root.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                const range = this.quill.getSelection();
                if (range) {
                    const [line] = this.quill.getLine(range.index);
                    const formats = this.quill.getFormat(range);
                    if (formats['copilot-suggestion']) {
                        event.preventDefault();
                        this.acceptSuggestion(range.index);
                    }
                }
            }
        });
    }

    showSuggestion(index: number, suggestion: string) {
        this.quill.deleteText(index, this.quill.getText().length - index);
        this.quill.insertEmbed(index, 'copilot-suggestion', suggestion, 'user');
    }

    acceptSuggestion(index: number) {
        const suggestionNode = this.quill.root.querySelector('.copilot-suggestion');
        if (suggestionNode) {
            const suggestion = suggestionNode.getAttribute('data-copilot-suggestion');
            this.quill.deleteText(index, suggestionNode.textContent!.length);
            this.quill.insertText(index, suggestion!, 'user');
            this.quill.setSelection(index + suggestion!.length);
        }
    }
}