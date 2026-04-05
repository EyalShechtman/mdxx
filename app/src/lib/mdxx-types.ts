// TypeScript interfaces mirroring the Rust mdxx parser types.
// Rust enums use #[serde(tag = "type")] (internally tagged), so each variant
// serializes as { "type": "VariantName", ...fields }.
// Exception: Alignment does NOT use #[serde(tag = "type")] and serializes as a plain string.

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

export type Alignment = 'Left' | 'Center' | 'Right' | 'None';

// ---------------------------------------------------------------------------
// Inline nodes
// ---------------------------------------------------------------------------

export type InlineNode =
  | { type: 'Text'; text: string }
  | { type: 'Bold'; children: InlineNode[] }
  | { type: 'Italic'; children: InlineNode[] }
  | { type: 'Code'; text: string }
  | { type: 'Link'; text: string; url: string }
  | { type: 'CommentAnchor'; id: string; children: InlineNode[] }
  | { type: 'StyledSpan'; id: string; children: InlineNode[] }
  | { type: 'Strikethrough'; children: InlineNode[] };

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

export interface ListItem {
  children: InlineNode[];
  checked: boolean | null;
}

// ---------------------------------------------------------------------------
// Content nodes
// ---------------------------------------------------------------------------

export type ContentNode =
  | { type: 'Heading'; level: number; text: string; id: string | null; children: InlineNode[] }
  | { type: 'Paragraph'; text: string; id: string | null; children: InlineNode[] }
  | { type: 'Image'; alt: string; src: string; id: string | null }
  | { type: 'List'; ordered: boolean; items: ListItem[]; id: string | null }
  | { type: 'BlockQuote'; children: ContentNode[]; id: string | null }
  | { type: 'CodeBlock'; language: string | null; code: string; id: string | null }
  | { type: 'Table'; headers: string[]; rows: string[][]; alignments: Alignment[]; id: string | null }
  | { type: 'ThematicBreak' }
  | { type: 'PageBreak' }
  | { type: 'Html'; html: string };

// ---------------------------------------------------------------------------
// Style sheet types
// ---------------------------------------------------------------------------

export interface StyleProperty {
  key: string;
  value: string;
}

export interface PageStyle {
  size: string | null;
  orientation: string | null;
  margin: string | null;
  margin_top: string | null;
  margin_bottom: string | null;
  margin_left: string | null;
  margin_right: string | null;
  columns: number | null;
  column_gap: string | null;
}

export interface HeaderFooterStyle {
  content: string | null;
  font_size: string | null;
  color: string | null;
  align: string | null;
  border_bottom: string | null;
  border_top: string | null;
}

export interface DefaultStyles {
  properties: StyleProperty[];
}

export interface ElementStyle {
  id: string;
  inherit: string | null;
  properties: StyleProperty[];
}

export interface AbstractStyle {
  name: string;
  properties: StyleProperty[];
}

export interface ReplyDef {
  id: string;
  author: string | null;
  date: string | null;
  text: string | null;
}

export interface CommentDef {
  id: string;
  author: string | null;
  date: string | null;
  text: string | null;
  resolved: boolean;
  edited_at: string | null;
  replies: ReplyDef[];
}

export interface StyleSheet {
  page: PageStyle | null;
  header: HeaderFooterStyle | null;
  footer: HeaderFooterStyle | null;
  defaults: DefaultStyles | null;
  elements: ElementStyle[];
  abstracts: AbstractStyle[];
  comments: CommentDef[];
}

// ---------------------------------------------------------------------------
// Document and parse output
// ---------------------------------------------------------------------------

export interface MdxxDocument {
  content: ContentNode[];
  styles: StyleSheet;
  agent_instructions: string | null;
}

export interface ParseOutput {
  document: MdxxDocument;
  html: string;
  errors: string[];
}
