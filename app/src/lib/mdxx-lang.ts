import { markdown } from '@codemirror/lang-markdown';
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const mdxxSectionDecorations = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = this.build(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = this.build(update.view);
  }
  build(view: EditorView): DecorationSet {
    // Collect all decorations, then sort by position before adding to builder
    const decos: { from: number; to: number; deco: Decoration }[] = [];
    const doc = view.state.doc;

    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);

      // Delimiter lines (40+ dashes) — line decorations are separate
      if (/^-{40,}$/.test(line.text)) {
        decos.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'mdxx-delimiter' }) });
        continue;
      }

      // ~id tags at end of line
      const idMatch = line.text.match(/~([a-z][a-z0-9-]*)\s*$/);
      if (idMatch) {
        const start = line.from + line.text.lastIndexOf('~' + idMatch[1]);
        const end = start + ('~' + idMatch[1]).length;
        decos.push({ from: start, to: end, deco: Decoration.mark({ class: 'mdxx-id-tag' }) });
      }

      // Comment anchors {{id}} and {{/id}}
      const commentRe = /\{\{\/?([a-z][a-z0-9-]*)\}\}/g;
      let commentMatch;
      while ((commentMatch = commentRe.exec(line.text)) !== null) {
        decos.push({
          from: line.from + commentMatch.index,
          to: line.from + commentMatch.index + commentMatch[0].length,
          deco: Decoration.mark({ class: 'mdxx-comment-anchor' }),
        });
      }

      // Inline spans [text]{~id}
      const spanRe = /\[([^\]]+)\]\{~([a-z][a-z0-9-]*)\}/g;
      let spanMatch;
      while ((spanMatch = spanRe.exec(line.text)) !== null) {
        decos.push({
          from: line.from + spanMatch.index,
          to: line.from + spanMatch.index + spanMatch[0].length,
          deco: Decoration.mark({ class: 'mdxx-styled-span' }),
        });
      }
    }

    // Sort by from position (required by RangeSetBuilder)
    decos.sort((a, b) => a.from - b.from || a.to - b.to);

    const builder = new RangeSetBuilder<Decoration>();
    for (const d of decos) {
      try {
        builder.add(d.from, d.to, d.deco);
      } catch {
        // Skip any decoration that causes ordering issues
      }
    }
    return builder.finish();
  }
}, { decorations: v => v.decorations });

export function mdxxLanguage() {
  return [
    markdown(),
    mdxxSectionDecorations,
  ];
}
