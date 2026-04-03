/**
 * Convert TipTap HTML output to mdxx markdown format.
 * This is a simplified serializer — handles the core elements.
 */
export function htmlToMdxx(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return serializeNodes(doc.body.childNodes);
}

function serializeNodes(nodes: NodeListOf<ChildNode>): string {
  const parts: string[] = [];
  nodes.forEach(node => {
    parts.push(serializeNode(node));
  });
  return parts.join('');
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const blockId = el.getAttribute('data-block-id');
  const idSuffix = blockId ? ` ~${blockId}` : '';

  switch (tag) {
    case 'h1': return `# ${inlineContent(el)}${idSuffix}\n\n`;
    case 'h2': return `## ${inlineContent(el)}${idSuffix}\n\n`;
    case 'h3': return `### ${inlineContent(el)}${idSuffix}\n\n`;
    case 'h4': return `#### ${inlineContent(el)}${idSuffix}\n\n`;

    case 'p': {
      const text = inlineContent(el);
      if (!text.trim()) return '\n';
      return `${text}${idSuffix}\n\n`;
    }

    case 'blockquote': {
      const inner = serializeNodes(el.childNodes)
        .trim()
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
      return `${inner}\n${idSuffix ? idSuffix.trim() + '\n' : ''}\n`;
    }

    case 'ul': {
      if (el.getAttribute('data-type') === 'taskList') {
        const items = Array.from(el.children).map(li => {
          const checked = li.getAttribute('data-checked') === 'true';
          const content = inlineContent(li.querySelector('div, p') ?? li);
          return `- [${checked ? 'x' : ' '}] ${content}`;
        });
        return items.join('\n') + (idSuffix ? `\n${idSuffix.trim()}` : '') + '\n\n';
      }
      const items = Array.from(el.children).map(li => {
        return `- ${inlineContent(li.querySelector('p') ?? li)}`;
      });
      return items.join('\n') + (idSuffix ? `\n${idSuffix.trim()}` : '') + '\n\n';
    }

    case 'ol': {
      const items = Array.from(el.children).map((li, i) => {
        return `${i + 1}. ${inlineContent(li.querySelector('p') ?? li)}`;
      });
      return items.join('\n') + (idSuffix ? `\n${idSuffix.trim()}` : '') + '\n\n';
    }

    case 'pre': {
      const code = el.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] ?? '';
      const content = code?.textContent ?? el.textContent ?? '';
      return `\`\`\`${lang}\n${content}\n\`\`\`${idSuffix ? `\n${idSuffix.trim()}` : ''}\n\n`;
    }

    case 'table': {
      return serializeTable(el) + (idSuffix ? `${idSuffix.trim()}\n` : '') + '\n';
    }

    case 'img': {
      const alt = el.getAttribute('alt') ?? '';
      const src = el.getAttribute('src') ?? '';
      return `![${alt}](${src})${idSuffix}\n\n`;
    }

    case 'figure': {
      const img = el.querySelector('img');
      if (img) {
        const alt = img.getAttribute('alt') ?? '';
        const src = img.getAttribute('src') ?? '';
        return `![${alt}](${src})${idSuffix}\n\n`;
      }
      return '';
    }

    case 'hr': return '***\n\n';

    case 'div': {
      if (el.hasAttribute('data-page-break')) {
        return '{{pagebreak}}\n\n';
      }
      return serializeNodes(el.childNodes);
    }

    default:
      return serializeNodes(el.childNodes);
  }
}

function inlineContent(el: Element | ChildNode): string {
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
        parts.push(`**${inlineContent(childEl)}**`);
        break;
      case 'em': case 'i':
        parts.push(`*${inlineContent(childEl)}*`);
        break;
      case 'u':
        parts.push(inlineContent(childEl));
        break;
      case 's': case 'del':
        parts.push(`~~${inlineContent(childEl)}~~`);
        break;
      case 'code':
        parts.push(`\`${childEl.textContent}\``);
        break;
      case 'a': {
        const href = childEl.getAttribute('href') ?? '';
        parts.push(`[${inlineContent(childEl)}](${href})`);
        break;
      }
      case 'mark':
        parts.push(inlineContent(childEl));
        break;
      case 'br':
        parts.push('\n');
        break;
      case 'span': {
        const commentId = childEl.getAttribute('data-comment-id');
        const styleId = childEl.getAttribute('data-style-id');
        const text = inlineContent(childEl);
        if (commentId) {
          parts.push(`{{${commentId}}}${text}{{/${commentId}}}`);
        } else if (styleId) {
          parts.push(`[${text}]{~${styleId}}`);
        } else {
          parts.push(text);
        }
        break;
      }
      default:
        parts.push(inlineContent(childEl));
    }
  });
  return parts.join('');
}

function serializeTable(table: HTMLElement): string {
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach(tr => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      cells.push(inlineContent(cell).trim());
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
