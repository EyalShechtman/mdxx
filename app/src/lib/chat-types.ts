export interface ClaudeEdit {
  section: 1 | 2;
  search: string;   // text to find ("" = append to section)
  replace: string;  // replacement text
}

export interface ClaudeResponse {
  explanation: string;  // markdown, shown in chat
  edits: ClaudeEdit[];  // search/replace operations
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  author?: string;
  content: string;
  timestamp: string; // ISO date string
  edits?: ClaudeEdit[];
  editsApplied?: boolean;
}

/** Parse Section 4 markdown into ChatMessage array */
export function parseChatHistory(raw: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const blocks = raw.split(/^## \[/m).filter(Boolean);

  for (const block of blocks) {
    const headerMatch = block.match(/^(user|assistant)(?::(\w+))?\]\s+(\S+)\s*\n([\s\S]*)/);
    if (!headerMatch) continue;
    const [, role, author, timestamp, body] = headerMatch;
    const trimmedBody = body.trim();

    // Parse edits from fenced JSON block if present
    let content = trimmedBody;
    let edits: ClaudeEdit[] | undefined;
    let editsApplied: boolean | undefined;
    const editsMatch = trimmedBody.match(/\n```edits\n([\s\S]*?)```$/);
    if (editsMatch) {
      content = trimmedBody.slice(0, editsMatch.index).trim();
      try {
        const parsed = JSON.parse(editsMatch[1]);
        edits = parsed.edits;
        editsApplied = parsed.applied;
      } catch {
        // ignore parse errors
      }
    }

    messages.push({
      role: role as 'user' | 'assistant',
      author: author || undefined,
      content,
      timestamp,
      edits,
      editsApplied,
    });
  }
  return messages;
}

/** Serialize ChatMessage array to Section 4 markdown */
export function serializeChatHistory(messages: ChatMessage[]): string {
  return messages.map(msg => {
    const sender = msg.role === 'user'
      ? `user${msg.author ? ':' + msg.author : ''}`
      : 'assistant';
    let text = `## [${sender}] ${msg.timestamp}\n${msg.content}`;
    if (msg.edits && msg.edits.length > 0) {
      const editsData = JSON.stringify({ edits: msg.edits, applied: msg.editsApplied ?? false });
      text += `\n\n\`\`\`edits\n${editsData}\n\`\`\``;
    }
    return text;
  }).join('\n\n');
}
