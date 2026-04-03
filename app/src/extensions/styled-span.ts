import { Mark, mergeAttributes } from '@tiptap/react';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    styledSpan: {
      setStyledSpan: (styleId: string) => ReturnType;
      unsetStyledSpan: () => ReturnType;
    };
  }
}

export const StyledSpan = Mark.create({
  name: 'styledSpan',

  addAttributes() {
    return {
      styleId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-style-id'),
        renderHTML: (attributes: Record<string, string>) => ({
          'data-style-id': attributes.styleId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-style-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'mdxx-styled-span',
    }), 0];
  },

  addCommands() {
    return {
      setStyledSpan: (styleId: string) => ({ commands }) => {
        return commands.setMark(this.name, { styleId });
      },
      unsetStyledSpan: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
