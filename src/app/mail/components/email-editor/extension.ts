import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import GhostText from './ghost-text'

export default Node.create({
    name: 'ghostText',

    // content: 'inline*',

    group: 'inline',
    inline: true,
    selectable: false,
    atom: true,



    addAttributes() {
        return {
            content: {
                default: '',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'ghost-text',
            },
        ]
    },


    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'ghost-text' }), 0]
    },


    addNodeView() {
        return ReactNodeViewRenderer(GhostText)
    },
})
