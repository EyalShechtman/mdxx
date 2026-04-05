/**
 * Lightweight markdown-to-HTML converter for importing .md files.
 * Handles common markdown features without external dependencies.
 */
export function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  const inlineFormat = (text: string): string => {
    // Images (before links so ![alt](src) isn't caught by link regex)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code${codeBlockLang ? ` class="language-${codeBlockLang}"` : ''}>${codeLines.join('\n')}</code></pre>`);
        inCodeBlock = false;
        codeLines = [];
        codeBlockLang = '';
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^(\*\*\*|---|___)(\s*)$/.test(line.trim())) {
      flushList();
      html.push('<hr />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      html.push(`<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        flushList();
        html.push('<ul>');
        inList = 'ul';
      }
      // Task list
      const taskMatch = ulMatch[1].match(/^\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        const checked = taskMatch[1] !== ' ' ? ' checked' : '';
        html.push(`<li><input type="checkbox"${checked} disabled /> ${inlineFormat(taskMatch[2])}</li>`);
      } else {
        html.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      }
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        flushList();
        html.push('<ol>');
        inList = 'ol';
      }
      html.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  flushList();
  if (inCodeBlock) {
    html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
  }

  return html.join('\n');
}
