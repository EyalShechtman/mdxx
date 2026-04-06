import { initWasm, parseMdxx } from './wasm';
import type { ContentNode, InlineNode, Alignment, CommentDef, ReplyDef } from './mdxx-types';
import type { CommentData } from '@/extensions/comment-mark';

// ---------------------------------------------------------------------------
// HTML entity escaping
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Inline node rendering
// ---------------------------------------------------------------------------

function renderInlineNodes(nodes: InlineNode[], styleMap: Map<string, Record<string, string>>): string {
  return nodes.map(node => renderInlineNode(node, styleMap)).join('');
}

function renderInlineNode(node: InlineNode, styleMap: Map<string, Record<string, string>>): string {
  switch (node.type) {
    case 'Text':
      return escapeHtml(node.text);
    case 'Bold':
      return `<strong>${renderInlineNodes(node.children, styleMap)}</strong>`;
    case 'Italic':
      return `<em>${renderInlineNodes(node.children, styleMap)}</em>`;
    case 'Code':
      return `<code>${escapeHtml(node.text)}</code>`;
    case 'Link':
      return `<a href="${escapeHtml(node.url)}">${escapeHtml(node.text)}</a>`;
    case 'CommentAnchor':
      return `<span data-comment-id="${escapeHtml(node.id)}">${renderInlineNodes(node.children, styleMap)}</span>`;
    case 'StyledSpan': {
      // Flatten double-nested styled spans with the same ID
      let children = node.children;
      if (
        children.length === 1 &&
        children[0].type === 'StyledSpan' &&
        children[0].id === node.id
      ) {
        children = children[0].children;
      }
      const props = styleMap.get(node.id);
      if (props) {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(props)) {
          if (value) parts.push(`${key}: ${value}`);
        }
        if (parts.length > 0) {
          return `<span style="${parts.join('; ')}">${renderInlineNodes(children, styleMap)}</span>`;
        }
      }
      // No style properties found — render children without a wrapper
      return renderInlineNodes(children, styleMap);
    }
    case 'Strikethrough':
      return `<s>${renderInlineNodes(node.children, styleMap)}</s>`;
  }
}

// ---------------------------------------------------------------------------
// Alignment helper
// ---------------------------------------------------------------------------

function alignmentToStyle(alignment: Alignment): string {
  switch (alignment) {
    case 'Left':
      return 'left';
    case 'Center':
      return 'center';
    case 'Right':
      return 'right';
    case 'None':
      return '';
  }
}

// ---------------------------------------------------------------------------
// Content node rendering
// ---------------------------------------------------------------------------

function renderContentNode(node: ContentNode, styleMap: Map<string, Record<string, string>>): string {
  switch (node.type) {
    case 'Heading': {
      const tag = `h${node.level}`;
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      const inner = renderInlineNodes(node.children, styleMap);
      return `<${tag}${idAttr}>${inner}</${tag}>`;
    }

    case 'Paragraph': {
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      const inner = renderInlineNodes(node.children, styleMap);
      return `<p${idAttr}>${inner}</p>`;
    }

    case 'Image': {
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      return `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}"${idAttr}>`;
    }

    case 'List': {
      const isTask = node.items.some((item) => item.checked != null);

      if (isTask) {
        const items = node.items
          .map((item) => {
            const checked = item.checked === true ? 'true' : 'false';
            const inner = renderInlineNodes(item.children, styleMap);
            return `<li data-type="taskItem" data-checked="${checked}">${inner}</li>`;
          })
          .join('');
        const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
        return `<ul data-type="taskList"${idAttr}>${items}</ul>`;
      }

      const tag = node.ordered ? 'ol' : 'ul';
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      const items = node.items
        .map((item) => `<li>${renderInlineNodes(item.children, styleMap)}</li>`)
        .join('');
      return `<${tag}${idAttr}>${items}</${tag}>`;
    }

    case 'BlockQuote': {
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      const inner = renderContentNodes(node.children, styleMap);
      return `<blockquote${idAttr}>${inner}</blockquote>`;
    }

    case 'CodeBlock': {
      const langClass = node.language ? ` class="language-${escapeHtml(node.language)}"` : '';
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';
      return `<pre${idAttr}><code${langClass}>${escapeHtml(node.code)}</code></pre>`;
    }

    case 'Table': {
      const idAttr = node.id != null ? ` data-block-id="${escapeHtml(node.id)}"` : '';

      const headerCells = node.headers
        .map((header, i) => {
          const align = node.alignments[i];
          const style =
            align != null ? alignmentToStyle(align) : '';
          const styleAttr = style ? ` style="text-align: ${style}"` : '';
          return `<th${styleAttr}>${escapeHtml(header)}</th>`;
        })
        .join('');
      const thead = `<thead><tr>${headerCells}</tr></thead>`;

      const bodyRows = node.rows
        .map((row) => {
          const cells = row
            .map((cell, i) => {
              const align = node.alignments[i];
              const style =
                align != null ? alignmentToStyle(align) : '';
              const styleAttr = style ? ` style="text-align: ${style}"` : '';
              return `<td${styleAttr}>${escapeHtml(cell)}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      const tbody = bodyRows.length > 0 ? `<tbody>${bodyRows}</tbody>` : '';

      return `<table${idAttr}>${thead}${tbody}</table>`;
    }

    case 'ThematicBreak':
      return '<hr>';

    case 'PageBreak':
      return '<div data-page-break="true"></div>';

    case 'Html':
      return node.html;
  }
}

function renderContentNodes(nodes: ContentNode[], styleMap: Map<string, Record<string, string>>): string {
  return nodes.map(n => renderContentNode(n, styleMap)).join('');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function mdxxToTiptap(
  raw: string,
): Promise<{ html: string; comments: CommentData[]; elementStyles: Record<string, Record<string, string>>; agentInstructions: string | null; chatHistory: string | null }> {
  await initWasm();
  const output = parseMdxx(raw);

  const styleMap = new Map<string, Record<string, string>>();
  for (const elem of output.document.styles.elements) {
    const props: Record<string, string> = {};
    for (const p of elem.properties) {
      props[p.key] = p.value;
    }
    if (Object.keys(props).length > 0) {
      styleMap.set(elem.id, props);
    }
  }

  if (styleMap.size > 0) {
    console.log('[mdxx-to-tiptap] Loaded styles from Section 2:', Object.fromEntries(styleMap));
  }

  const html = renderContentNodes(output.document.content, styleMap);

  const comments: CommentData[] = (output.document.styles.comments || []).map((c: CommentDef) => ({
    id: c.id,
    author: c.author || '',
    text: c.text || '',
    date: c.date || '',
    resolved: c.resolved,
    editedAt: c.edited_at || undefined,
    replies: (c.replies || []).map((r: ReplyDef) => ({
      id: r.id,
      author: r.author || '',
      text: r.text || '',
      date: r.date || '',
    })),
  }));

  // Convert styleMap to plain object for the caller
  const elementStyles: Record<string, Record<string, string>> = {};
  for (const [id, props] of styleMap) {
    elementStyles[id] = props;
  }

  return {
    html,
    comments,
    elementStyles,
    agentInstructions: output.document.agent_instructions ?? null,
    chatHistory: output.document.chat_history ?? null,
  };
}
