/**
 * Convert TipTap HTML output to mdxx markdown format.
 * This is a simplified serializer — handles the core elements.
 */

export interface InlineStyleEntry {
  id: string;
  properties: Record<string, string>;
}

export interface HtmlToMdxxResult {
  markdown: string;
  inlineStyles: InlineStyleEntry[];
}

class SerializationContext {
  private styleMap = new Map<string, string>(); // signature -> id
  styles: InlineStyleEntry[] = [];

  getStyleId(properties: Record<string, string>): string {
    const sig = Object.entries(properties)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');

    let id = this.styleMap.get(sig);
    if (!id) {
      id = `s-${stableHash(sig)}`;
      this.styleMap.set(sig, id);
      this.styles.push({ id, properties });
    }
    return id;
  }
}

/**
 * Walk down through nested spans that only contain style properties,
 * merging all their CSS into one combined set. Stops when we hit a span
 * with non-style children (text nodes, other elements).
 */
function collectSpanStyles(el: HTMLElement): { props: Record<string, string>; innerEl: HTMLElement } {
  const props: Record<string, string> = {};
  let current = el;

  while (true) {
    // Merge inline style props from this span
    Object.assign(props, extractStyleProps(current));

    // If this span has exactly one child and it's a style-only span, descend into it
    const children = current.childNodes;
    if (
      children.length === 1 &&
      children[0].nodeType === Node.ELEMENT_NODE &&
      (children[0] as HTMLElement).tagName?.toLowerCase() === 'span' &&
      !(children[0] as HTMLElement).getAttribute('data-comment-id')
    ) {
      current = children[0] as HTMLElement;
      continue;
    }
    break;
  }

  return { props, innerEl: current };
}

function extractStyleProps(el: HTMLElement): Record<string, string> {
  const props: Record<string, string> = {};
  const fontFamily = el.style.fontFamily?.replace(/['"]/g, '') || '';
  const fontSize = el.style.fontSize || '';
  const color = el.style.color || '';
  if (fontFamily) props['font-family'] = `"${fontFamily}"`;
  if (fontSize) props['font-size'] = fontSize;
  if (color) props['color'] = color;
  return props;
}

function stableHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function htmlToMdxx(html: string): HtmlToMdxxResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const ctx = new SerializationContext();
  const markdown = serializeNodes(doc.body.childNodes, ctx);
  if (ctx.styles.length > 0) {
    console.log('[html-to-mdxx] Extracted styles:', ctx.styles.map(s => `${s.id}: ${JSON.stringify(s.properties)}`));
  }
  return { markdown, inlineStyles: ctx.styles };
}

function serializeNodes(nodes: NodeListOf<ChildNode>, ctx: SerializationContext): string {
  const parts: string[] = [];
  nodes.forEach(node => {
    parts.push(serializeNode(node, ctx));
  });
  return parts.join('');
}

function extractBlockStyleProps(el: HTMLElement): Record<string, string> {
  const props: Record<string, string> = {};
  const textAlign = el.style.textAlign;
  if (textAlign && textAlign !== 'left') props['text-align'] = textAlign;
  return props;
}

function blockIdSuffix(el: HTMLElement, ctx: SerializationContext): string {
  const userBlockId = el.getAttribute('data-block-id');
  if (userBlockId) return ` ~${userBlockId}`;
  const blockProps = extractBlockStyleProps(el);
  if (Object.keys(blockProps).length > 0) {
    const id = ctx.getStyleId(blockProps);
    return ` ~${id}`;
  }
  return '';
}

/**
 * When a block's entire content is a single styled span, merge block-level
 * props (text-align) and inline props (font/size/color) into one block ID.
 * Returns null if the content has multiple children or mixed styles.
 */
function tryMergeBlockInline(el: HTMLElement, ctx: SerializationContext): { text: string; id: string } | null {
  const blockProps = extractBlockStyleProps(el);
  const children = el.childNodes;

  // Only merge when there's exactly one child and it's a styled span
  if (children.length !== 1 || children[0].nodeType !== Node.ELEMENT_NODE) return null;
  const child = children[0] as HTMLElement;
  if (child.tagName?.toLowerCase() !== 'span' || child.getAttribute('data-comment-id')) return null;

  const { props: inlineProps, innerEl } = collectSpanStyles(child);
  const merged = { ...inlineProps, ...blockProps };
  if (Object.keys(merged).length === 0) return null;

  const text = inlineContent(innerEl, ctx);
  const id = ctx.getStyleId(merged);
  return { text, id };
}

function serializeNode(node: ChildNode, ctx: SerializationContext): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': {
      const prefix = '#'.repeat(parseInt(tag[1]));
      const merged = tryMergeBlockInline(el, ctx);
      if (merged) return `${prefix} ${merged.text} ~${merged.id}\n\n`;
      return `${prefix} ${inlineContent(el, ctx)}${blockIdSuffix(el, ctx)}\n\n`;
    }

    case 'p': {
      const merged = tryMergeBlockInline(el, ctx);
      if (merged) {
        if (!merged.text.trim()) return '\n';
        return `${merged.text} ~${merged.id}\n\n`;
      }
      const text = inlineContent(el, ctx);
      if (!text.trim()) return '\n';
      return `${text}${blockIdSuffix(el, ctx)}\n\n`;
    }

    case 'blockquote': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? ` ~${blockId}` : '';
      const inner = serializeNodes(el.childNodes, ctx)
        .trim()
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
      return `${inner}\n${suffix ? suffix.trim() + '\n' : ''}\n`;
    }

    case 'ul': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? `\n~${blockId}` : '';
      if (el.getAttribute('data-type') === 'taskList') {
        const items = Array.from(el.children).map(li => {
          const checked = li.getAttribute('data-checked') === 'true';
          const content = inlineContent(li.querySelector('div, p') ?? li, ctx);
          return `- [${checked ? 'x' : ' '}] ${content}`;
        });
        return items.join('\n') + suffix + '\n\n';
      }
      const items = Array.from(el.children).map(li => {
        return `- ${inlineContent(li.querySelector('p') ?? li, ctx)}`;
      });
      return items.join('\n') + suffix + '\n\n';
    }

    case 'ol': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? `\n~${blockId}` : '';
      const items = Array.from(el.children).map((li, i) => {
        return `${i + 1}. ${inlineContent(li.querySelector('p') ?? li, ctx)}`;
      });
      return items.join('\n') + suffix + '\n\n';
    }

    case 'pre': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? `\n~${blockId}` : '';
      const code = el.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] ?? '';
      const content = code?.textContent ?? el.textContent ?? '';
      return `\`\`\`${lang}\n${content}\n\`\`\`${suffix}\n\n`;
    }

    case 'table': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? `~${blockId}\n` : '';
      return serializeTable(el, ctx) + suffix + '\n';
    }

    case 'img': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? ` ~${blockId}` : '';
      const alt = el.getAttribute('alt') ?? '';
      const src = el.getAttribute('src') ?? '';
      return `![${alt}](${src})${suffix}\n\n`;
    }

    case 'figure': {
      const blockId = el.getAttribute('data-block-id');
      const suffix = blockId ? ` ~${blockId}` : '';
      const img = el.querySelector('img');
      if (img) {
        const alt = img.getAttribute('alt') ?? '';
        const src = img.getAttribute('src') ?? '';
        return `![${alt}](${src})${suffix}\n\n`;
      }
      return '';
    }

    case 'hr': return '***\n\n';

    case 'div': {
      if (el.hasAttribute('data-page-break')) {
        return '{{pagebreak}}\n\n';
      }
      return serializeNodes(el.childNodes, ctx);
    }

    default:
      return serializeNodes(el.childNodes, ctx);
  }
}

function inlineContent(el: Element | ChildNode, ctx: SerializationContext): string {
  const parts: string[] = [];
  el.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(child.textContent ?? '');
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const childEl = child as HTMLElement;
    const tag = childEl.tagName.toLowerCase();

    switch (tag) {
      case 'strong': case 'b':
        parts.push(`**${inlineContent(childEl, ctx)}**`);
        break;
      case 'em': case 'i':
        parts.push(`*${inlineContent(childEl, ctx)}*`);
        break;
      case 'u':
        parts.push(inlineContent(childEl, ctx));
        break;
      case 's': case 'del':
        parts.push(`~~${inlineContent(childEl, ctx)}~~`);
        break;
      case 'code':
        parts.push(`\`${childEl.textContent}\``);
        break;
      case 'a': {
        const href = childEl.getAttribute('href') ?? '';
        parts.push(`[${inlineContent(childEl, ctx)}](${href})`);
        break;
      }
      case 'mark':
        parts.push(inlineContent(childEl, ctx));
        break;
      case 'br':
        parts.push('\n');
        break;
      case 'span': {
        const commentId = childEl.getAttribute('data-comment-id');
        if (commentId) {
          const text = inlineContent(childEl, ctx);
          parts.push(`{{${commentId}}}${text}{{/${commentId}}}`);
        } else {
          // Collect all style props from this span and any nested style-only spans
          const { props, innerEl } = collectSpanStyles(childEl);
          const text = inlineContent(innerEl, ctx);
          if (Object.keys(props).length > 0) {
            const id = ctx.getStyleId(props);
            parts.push(`[${text}]{~${id}}`);
          } else {
            parts.push(text);
          }
        }
        break;
      }
      default:
        parts.push(inlineContent(childEl, ctx));
    }
  });
  return parts.join('');
}

function serializeTable(table: HTMLElement, ctx: SerializationContext): string {
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      cells.push(inlineContent(cell, ctx).trim());
    });
    rows.push(cells);
  });

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    Math.max(3, ...rows.map(r => (r[i] ?? '').length))
  );

  const formatRow = (cells: string[]) =>
    '| ' + cells.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |';

  const separator = '|' + colWidths.map(w => '-'.repeat(w + 2)).join('|') + '|';

  const lines = [formatRow(rows[0]), separator];
  for (let i = 1; i < rows.length; i++) {
    lines.push(formatRow(rows[i]));
  }
  return lines.join('\n') + '\n';
}
