import { Mark, mergeAttributes } from '@tiptap/react';

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface CommentData {
  id: string;
  author: string;
  text: string;
  date: string;
  resolved: boolean;
  replies: CommentReply[];
  editedAt?: string;
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes: Record<string, string>) => ({
          'data-comment-id': attributes.commentId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: 'mdxx-comment-highlight',
    }), 0];
  },

  addCommands() {
    return {
      setComment: (commentId: string) => ({ commands }) => {
        return commands.setMark(this.name, { commentId });
      },
      unsetComment: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});
