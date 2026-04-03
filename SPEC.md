# mdxx Format Specification v0.1

***

## 1. Overview

mdxx is a plain-text document format that extends Markdown with rich document features -- typography, layout, comments, page control -- while keeping content human-readable.

A single `.mdxx` file contains up to three sections separated by a line of 40 or more consecutive dashes:

```
(Section 1: Content)
----------------------------------------
(Section 2: Styling)
----------------------------------------
(Section 3: Agent Instructions)
```

Only Section 1 is required. Sections 2 and 3 are optional.

***

## 2. Design Principles

1. **Content is king.** Section 1 must be readable as plain Markdown by anyone, anywhere, with no tooling.
2. **IDs are opt-in.** Only tag elements that need custom styling. Untagged elements use defaults.
3. **Styling is out of sight.** Section 2 is for the parser, not the human.
4. **Graceful degradation.** Open an `.mdxx` file in VS Code with no plugin -- Section 1 reads as normal Markdown, Sections 2-3 look like config at the bottom.
5. **One way to do things.** One ID syntax (`~id`), one comment syntax (`{{id}}...{{/id}}`), one section delimiter (`----------------------------------------`).
6. **Agent-friendly.** Minimal special characters in content. Section 3 teaches agents the rules. Errors degrade gracefully, never catastrophically.
7. **Last-wins everywhere.** When duplicates occur (IDs in content, style blocks in styling), the last occurrence takes precedence. This makes it easy for agents to append corrections.

***

## 3. File Structure

### 3.1 Section Delimiter

The section delimiter is a line containing **40 or more consecutive dash characters** (`-`) and nothing else (no leading/trailing whitespace, no other characters).

```
----------------------------------------
```

Standard Markdown thematic breaks (`---`, `***`, `___`) are 3 characters and are **not** section delimiters. You may use `***` or `___` for thematic breaks in content. Avoid `---` in content to prevent visual confusion with the section delimiter.

### 3.2 Section Detection

1. The parser scans the file for lines matching the delimiter pattern.
2. The first delimiter separates Section 1 from Section 2.
3. The second delimiter separates Section 2 from Section 3.
4. If no delimiters exist, the entire file is Section 1.
5. If one delimiter exists, everything after it is Section 2 (no Section 3).
6. **Delimiter detection stops after the second match.** Any 40+ dash lines inside Section 3 are treated as literal text.

***

## 4. Section 1: Content

Section 1 is standard CommonMark Markdown with three additions: **ID tags**, **comment anchors**, and **inline spans**.

### 4.1 Standard Markdown

All CommonMark syntax works as expected: headings, paragraphs, lists, images, links, bold, italic, code, blockquotes, tables (GFM), fenced code blocks, task lists.

```
# Heading

This is a paragraph with **bold** and *italic* text.

- List item one
- List item two

![Alt text](image.png)

[Link text](https://example.com)
```

### 4.2 ID Tags

An ID tag is `~id` appended to an element. It creates a reference point that Section 2 can target for styling. The `~` and the ID are stripped from rendered output.

**Syntax:** `~` followed by a lowercase-kebab-case identifier.

**Rules:**
- IDs must match the regex `[a-z][a-z0-9-]*`
- IDs must be unique within the document
- IDs are always the last token on a line (after all content)
- A malformed `~id` (invalid characters) is treated as literal text

**Headings:**
```
# Welcome to the Report ~title
## Executive Summary ~summary
### Revenue Breakdown ~revenue
```

**Paragraphs:**
```
This is a normal paragraph. ~p1

This paragraph has no ID and renders with defaults.
```

**Images:**
```
![Team photo](team.jpg) ~hero-img
![Chart](revenue.png) ~chart1
```

**Lists:**
```
- First item
- Second item
- Third item
~priorities
```

The ID on the line after the last list item tags the entire list.

**Block Quotes:**
```
> The only way to do great work is to love what you do.
> -- Steve Jobs
~quote1
```

**Code Blocks:**
````
```python
def hello():
    print("hello world")
```
~code1
````

**Tables:**
```
| Name    | Role     | Team    |
|---------|----------|---------|
| Alice   | Engineer | Backend |
| Bob     | Designer | Product |
~team-table
```

### 4.3 Comment Anchors

Comment anchors mark a range of text that a comment is attached to. The comment body lives in Section 2.

**Syntax:** `{{id}}text{{/id}}`

```
The {{c1}}enterprise segment{{/c1}} showed the strongest growth.
```

In rendered output, comment anchors are stripped and replaced with comment indicators (highlights, margin notes, etc. depending on the renderer).

**Rules:**
- Comment IDs follow the same naming rules as element IDs
- By convention, comment IDs are sequential: `c1`, `c2`, `c3`
- The text between anchors is still readable as normal prose

### 4.4 Inline Spans

Inline spans let you style a range of text within a paragraph. The styled text is wrapped in brackets, followed by `{~id}`.

**Syntax:** `[text]{~id}`

```
This has [important text]{~highlight} in the middle of a sentence.
```

The `{~id}` tag is stripped from rendered output. The text inside the brackets renders normally, with the styling from Section 2 applied.

**Rules:**
- Uses `{~id}` (with curly braces) to avoid conflict with Markdown link syntax `[text](url)`
- The ID follows the same naming rules as element IDs

### 4.5 Directives

Directives are self-closing commands in the content. They use double curly braces.

**Page Breaks:**
```
{{pagebreak}}
```

Directives are stripped from rendered output and replaced with their effect (e.g., a page break in PDF output).

### 4.6 Thematic Breaks

Use `***` or `___` for thematic breaks in content:

```
Some content above.

***

Some content below.
```

### 4.7 What NOT to Put in Section 1

- No styling information (fonts, colors, sizes)
- No layout directives (margins, columns, alignment)
- No raw HTML (use Section 2 properties instead)
- No metadata or configuration

***

## 5. Section 2: Styling

Everything between the first and second section delimiters. This section is **not meant to be human-readable**. It is consumed by the parser/renderer.

### 5.1 Syntax

Style blocks use `@` followed by an identifier, with properties inside curly braces:

```
@id {
  property: value;
  property: value;
}
```

**Rules:**
- One block per ID
- Properties are `key: value;` pairs (semicolons required)
- Values may be quoted strings, numbers, colors, or keywords
- Unknown properties are silently ignored
- Invalid values fall back to the property default

### 5.2 Block Types

There are three kinds of style blocks:

**Element blocks** (`@id`) target a specific `~id` in Section 1:
```
@title {
  font-size: 32pt;
  font-weight: 700;
}
```

**Abstract blocks** (`@.name`) are reusable style definitions that don't target content directly. They exist only as `inherit` targets:
```
@.heading-base {
  font-family: "Inter";
  font-weight: 700;
  color: #1a1a1a;
}
```

**Reserved blocks** (`@page`, `@header`, `@footer`, `@defaults`) control document-level settings:
```
@page { ... }
@header { ... }
@footer { ... }
@defaults { ... }
```

### 5.3 Document-Level Blocks

**@page** -- controls overall page layout:
```
@page {
  size: letter;
  orientation: portrait;
  margin: 1in;
  margin-top: 1in;
  margin-bottom: 1in;
  margin-left: 1.25in;
  margin-right: 1.25in;
  columns: 1;
  column-gap: 20pt;
}
```

**@header** -- page header (repeated on every page):
```
@header {
  content: "Project Proposal — Confidential";
  font-size: 9pt;
  color: #999999;
  align: right;
  border-bottom: 0.5px solid #e0e0e0;
}
```

**@footer** -- page footer (repeated on every page):
```
@footer {
  content: "Page {{page}} of {{pages}}";
  font-size: 9pt;
  color: #999999;
  align: center;
}
```

`{{page}}` and `{{pages}}` are built-in rendering variables available only in `@header` and `@footer` blocks. They resolve to the current page number and total page count.

**@defaults** -- base styles for all untagged elements:
```
@defaults {
  font-family: "Inter";
  font-size: 12pt;
  color: #1a1a1a;
  line-height: 1.6;
  heading-1-size: 28pt;
  heading-2-size: 22pt;
  heading-3-size: 18pt;
  heading-font-family: "Inter";
  heading-color: #000000;
  link-color: #0066cc;
  code-font-family: "Fira Code";
  code-font-size: 11pt;
}
```

### 5.4 Element Styling

Any `~id` in Section 1 can be targeted with an `@id` block in Section 2:

```
@title {
  font-family: "Inter";
  font-size: 32pt;
  font-weight: 700;
  color: #0a0a0a;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.4;
  margin-bottom: 8pt;
}
```

### 5.5 Image Properties

```
@hero-img {
  width: 100%;
  max-width: 800px;
  align: center;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  caption: "The founding team, 2024";
  caption-font-size: 10pt;
  caption-color: #888888;
  shadow: 0 2px 8px rgba(0,0,0,0.1);
  object-fit: cover;
}
```

### 5.6 Table Properties

```
@team-table {
  width: 100%;
  border-style: minimal;
  header-bg: #f5f5f5;
  header-font-weight: 700;
  cell-padding: 8pt;
  stripe: #fafafa;
  font-size: 11pt;
  column-widths: 40% 30% 30%;
}
```

`column-widths` takes space-separated values (percentages, fixed units, or `auto`).

### 5.7 List Properties

```
@priorities {
  list-style: decimal;
  font-size: 12pt;
  color: #2a2a2a;
  indent: 20pt;
  item-spacing: 8pt;
}
```

### 5.8 Code Block Properties

```
@code1 {
  font-family: "Fira Code";
  font-size: 11pt;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  padding: 16pt;
  line-numbers: true;
  highlight-lines: "3-5 8";
  theme: "dark";
}
```

### 5.9 Comment Definitions

Comments are defined with `@comment:id` blocks:

```
@comment:c1 {
  author: "Igor";
  date: "2026-03-29";
  text: "Consider simplifying this phrase. It's too technical for the audience.";
  resolved: false;
}

@comment:c2 {
  author: "Sarah";
  date: "2026-03-30";
  text: "Agreed. Let's rephrase for a general audience.";
  resolved: true;
}
```

Comment IDs correspond to the `{{id}}...{{/id}}` anchors in Section 1.

### 5.10 Style Inheritance

Style blocks can inherit properties from abstract blocks using `inherit`:

```
@.heading-base {
  font-family: "Inter";
  font-weight: 700;
  color: #1a1a1a;
}

@title {
  inherit: .heading-base;
  font-size: 32pt;
}

@subtitle {
  inherit: .heading-base;
  font-size: 20pt;
  color: #555555;
}
```

**Rules:**
- `inherit` must reference a defined `@.name` block (dot-prefixed)
- Inherited properties can be overridden by the inheriting block
- Single-level inheritance only (no chains)
- Circular or missing references are silently ignored

### 5.11 Supported Properties Reference

**Typography**

| Property | Values | Example |
|----------|--------|---------|
| font-family | Quoted font name | `"Inter"` |
| font-size | Number + unit | `12pt`, `1.2em` |
| font-weight | Number or keyword | `700`, `bold` |
| font-style | Keyword | `normal`, `italic` |
| color | Hex, rgb, rgba, keyword | `#1a1a1a`, `red` |
| letter-spacing | Number + unit | `0.02em` |
| line-height | Number or ratio | `1.6`, `24pt` |
| text-align | Keyword | `left`, `center`, `right`, `justify` |
| text-transform | Keyword | `uppercase`, `lowercase`, `capitalize` |
| text-decoration | Keyword | `underline`, `line-through`, `none` |

**Spacing**

| Property | Values | Example |
|----------|--------|---------|
| margin | Shorthand or per-side | `1in`, `24pt 0` |
| margin-top | Number + unit | `24pt` |
| margin-bottom | Number + unit | `16pt` |
| margin-left | Number + unit | `0` |
| margin-right | Number + unit | `0` |
| padding | Shorthand or per-side | `12pt` |
| padding-top | Number + unit | `12pt` |
| padding-bottom | Number + unit | `12pt` |
| padding-left | Number + unit | `16pt` |
| padding-right | Number + unit | `16pt` |

**Background & Border**

| Property | Values | Example |
|----------|--------|---------|
| background | Color value | `#f5f5f5` |
| border | Shorthand | `1px solid #e0e0e0` |
| border-top | Shorthand | `0.5px solid #ccc` |
| border-bottom | Shorthand | `2px solid #0066cc` |
| border-left | Shorthand | `3px solid #cccccc` |
| border-right | Shorthand | `1px solid #eee` |
| border-radius | Number + unit | `8px` |
| shadow | CSS box-shadow value | `0 2px 8px rgba(0,0,0,0.1)` |

**Image-Specific**

| Property | Values | Example |
|----------|--------|---------|
| width | Percentage or fixed | `80%`, `400px` |
| max-width | Percentage or fixed | `800px` |
| height | Percentage or fixed | `300px`, `auto` |
| align | Keyword | `left`, `center`, `right` |
| caption | Quoted string | `"Fig 1. Overview"` |
| caption-font-size | Number + unit | `9pt` |
| caption-color | Color value | `#888888` |
| object-fit | Keyword | `cover`, `contain`, `fill` |

**Table-Specific**

| Property | Values | Example |
|----------|--------|---------|
| border-style | Keyword | `minimal`, `full`, `none` |
| header-bg | Color value | `#f5f5f5` |
| header-font-weight | Number or keyword | `700` |
| cell-padding | Number + unit | `8pt` |
| stripe | Color value or `none` | `#fafafa` |
| column-widths | Space-separated values | `40% 30% 30%` |

**List-Specific**

| Property | Values | Example |
|----------|--------|---------|
| list-style | Keyword | `disc`, `decimal`, `none` |
| indent | Number + unit | `20pt` |
| item-spacing | Number + unit | `8pt` |

**Code-Specific**

| Property | Values | Example |
|----------|--------|---------|
| line-numbers | Boolean | `true`, `false` |
| highlight-lines | Quoted ranges | `"3-5 8"` |
| theme | Keyword | `"dark"`, `"light"` |

**Page-Level** (used in `@page`)

| Property | Values | Example |
|----------|--------|---------|
| size | Keyword | `letter`, `a4`, `a5` |
| orientation | Keyword | `portrait`, `landscape` |
| columns | Number | `1`, `2`, `3` |
| column-gap | Number + unit | `20pt` |

**Header/Footer** (used in `@header`, `@footer`)

| Property | Values | Example |
|----------|--------|---------|
| content | Quoted string | `"Page {{page}} of {{pages}}"` |

**Comment-Specific** (used in `@comment:id`)

| Property | Values | Example |
|----------|--------|---------|
| author | Quoted string | `"Igor"` |
| date | ISO date string | `"2026-03-29"` |
| text | Quoted string | `"Consider rewording."` |
| resolved | Boolean | `true`, `false` |

***

## 6. Section 3: Agent Instructions

Everything after the second section delimiter. This section is **advisory only** -- the renderer ignores it entirely. It is consumed by LLMs and other agents that read or write mdxx files.

### 6.1 Purpose

Section 3 teaches agents how to write valid mdxx for this specific document. It can include:
- Rules for this document's conventions
- ID naming patterns
- Available style properties
- Constraints (e.g., "do not modify the header")
- A minimal example

### 6.2 Format

Free-form Markdown. There is no required structure. Example:

```
# mdxx Agent Guide

## Rules
- Section 1 is standard Markdown. Keep it human-readable.
- Only add ~id tags to elements that need custom styling.
- Use lowercase-kebab-case for all IDs: ~hero-img, ~main-title
- Comment anchors: {{id}}...{{/id}}
- Inline spans: [text]{~id}
- Never put styling in Section 1. Never put content in Section 2.

## ID Naming Conventions
- Headings: ~title, ~subtitle, ~section-name
- Paragraphs: ~p-intro, ~p-conclusion
- Images/Charts: ~chart1, ~hero-img
- Tables: ~metrics-table, ~team-table
- Inline spans: ~highlight, ~emphasis, ~brand-name
- Comments: c1, c2, c3 (sequential)

## Constraints
- This is a quarterly report. Maintain professional tone.
- Do not remove existing comment anchors.
- New sections should follow the existing heading hierarchy.
```

### 6.3 Rules

- Section 3 is never required. A valid mdxx file may have zero, one, or two section delimiters.
- A document with no Section 3 is fully valid.
- Renderers must ignore Section 3 completely.
- Agents should read Section 3 before modifying the document.

***

## 7. Parsing Rules

1. The section delimiter is a line containing **40 or more consecutive dash characters** (`-`) and nothing else.
2. The first delimiter separates Section 1 from Section 2.
3. The second delimiter separates Section 2 from Section 3.
4. Delimiter detection **stops after the second match**. Any 40+ dash lines inside Section 3 are treated as literal text.
5. If no delimiters exist, the entire file is Section 1.
6. If one delimiter exists, everything after it is Section 2 (no Section 3).
7. ID tags (`~id`) are stripped from rendered content and replaced with nothing.
8. Comment anchors (`{{id}}...{{/id}}`) are stripped from rendered content and replaced with comment indicators.
9. Inline spans (`[text]{~id}`) render the text with the applied style; the `{~id}` tag is stripped.
10. Directives (`{{pagebreak}}`) are stripped and replaced with their effect.
11. Section 3 is never processed by the renderer.

***

## 8. Error Handling & Graceful Degradation

### 8.1 Error Handling

The parser follows a **permissive** model. Errors never prevent rendering.

| Error | Parser Behavior |
|-------|-----------------|
| Malformed `~id` (invalid chars) | Treat as literal text, do not strip |
| Malformed `@id {}` block (missing brace) | Skip the block, continue parsing |
| Unknown property name | Silently ignore the property |
| Invalid property value | Use the default for that property |
| Orphaned style ID (in Section 2 but not Section 1) | Silently ignore the block |
| Orphaned abstract block (never inherited) | Silently ignore |
| Duplicate `~id` in Section 1 | Last occurrence wins |
| Duplicate `@id` blocks in Section 2 | Merge blocks; later properties override |
| Missing section delimiter | Entire file is Section 1 |
| Third+ delimiter in Section 3 | Treated as literal text |
| Circular `inherit` reference | Silently ignore the `inherit` property |
| Missing `inherit` target | Silently ignore the `inherit` property |

### 8.2 Graceful Degradation

An `.mdxx` file should be useful at three levels:

**In a plain text editor (no rendering):**
All three sections are visible. Section 1 reads as natural prose with `~id` suffixes visible but non-disruptive. Sections 2 and 3 are clearly separated config at the bottom of the file.

**In a standard Markdown renderer (GitHub, VS Code preview):**
- Section 1 renders as normal Markdown
- `~id` tags appear as trailing text on elements (e.g., a heading renders as "Welcome to the Report ~title")
- `{{c1}}text{{/c1}}` renders as literal text with the comment markers visible
- `[text]{~id}` renders as `text` followed by `{~id}` -- not ideal but readable
- The section delimiter renders as a horizontal rule
- Section 2 appears as text/code blocks
- Section 3 appears as Markdown content

**In an mdxx-aware renderer:**
- Section 1 renders with full styling applied from Section 2
- ID tags are stripped, invisible to the reader
- Comment anchors become highlights with linked comment annotations
- Inline spans render with their applied styles
- Page layout, headers, footers, and print control are active
- Section 3 is hidden from the rendered output

***

## 9. Complete Example

```mdxx
# Q4 2025 Revenue Report ~title

## Executive Summary ~summary

Revenue grew 23% year-over-year, driven primarily by enterprise
expansion. ~p-intro

![Revenue chart](revenue-q4.png) ~chart1

## Key Metrics ~metrics-heading

| Metric       | Q3 2025 | Q4 2025 | Change |
|--------------|---------|---------|--------|
| ARR          | $42M    | $51M    | +21%   |
| Net Revenue  | $12.5M  | $15.4M  | +23%   |
| Customers    | 340     | 412     | +21%   |
~metrics-table

The {{c1}}enterprise segment{{/c1}} showed the strongest growth,
contributing 67% of new ARR. ~p-enterprise

We are [on track to exceed]{~highlight} our annual target by 15%.

> We're seeing unprecedented demand in the mid-market segment.
> -- Sarah Chen, VP Sales
~pull-quote

***

## Outlook

We expect continued growth through H1 2026, with particular
strength in healthcare and financial services verticals.

{{pagebreak}}

## Appendix

Detailed breakdown by vertical available in the supplementary data.

----------------------------------------

@page {
  size: letter;
  margin: 1in;
}

@header {
  content: "Q4 2025 Revenue Report — Confidential";
  font-size: 8pt;
  color: #999999;
  align: right;
}

@footer {
  content: "Page {{page}} of {{pages}}";
  font-size: 8pt;
  color: #999999;
  align: center;
}

@.heading-base {
  font-family: "Inter";
  font-weight: 700;
  color: #1a1a1a;
}

@defaults {
  font-family: "Inter";
  font-size: 11pt;
  color: #1a1a1a;
  line-height: 1.6;
  heading-font-family: "Inter";
  heading-1-size: 26pt;
  heading-2-size: 20pt;
}

@title {
  inherit: .heading-base;
  font-size: 32pt;
  color: #0a0a0a;
  text-align: center;
  margin-bottom: 8pt;
}

@summary {
  inherit: .heading-base;
  font-size: 16pt;
  font-weight: 600;
  color: #333333;
  border-bottom: 2px solid #0066cc;
  padding-bottom: 8pt;
}

@metrics-heading {
  inherit: .heading-base;
  font-size: 20pt;
}

@p-intro {
  font-size: 13pt;
  color: #444444;
  line-height: 1.7;
}

@p-enterprise {
  font-size: 11pt;
}

@highlight {
  color: #0066cc;
  font-weight: 700;
  background: #e6f0ff;
}

@chart1 {
  width: 90%;
  align: center;
  caption: "Fig 1. Revenue growth Q3-Q4 2025";
  caption-font-size: 9pt;
  caption-color: #888888;
  margin: 24pt 0;
}

@metrics-table {
  width: 100%;
  border-style: minimal;
  header-bg: #f0f4f8;
  header-font-weight: 700;
  cell-padding: 10pt;
  stripe: #f9fafb;
  font-size: 11pt;
  column-widths: 25% 25% 25% 25%;
}

@pull-quote {
  font-family: "Georgia";
  font-style: italic;
  font-size: 14pt;
  color: #555555;
  border-left: 3px solid #0066cc;
  padding-left: 16pt;
  margin: 32pt 0;
}

@comment:c1 {
  author: "Igor";
  date: "2026-03-29";
  text: "Can we break this down by sub-segment? Mid-market vs large enterprise.";
  resolved: false;
}

----------------------------------------

# mdxx Agent Guide

## Rules
- Section 1 is standard Markdown. Keep it human-readable.
- Only add ~id tags to elements that need custom styling.
- Use lowercase-kebab-case for IDs.
- Comment anchors: {{id}}...{{/id}}
- Inline spans: [text]{~id}
- Never put styling in Section 1. Never put content in Section 2.

## ID Conventions
- Headings: descriptive (~title, ~summary, ~metrics-heading)
- Paragraphs: ~p-descriptive-name
- Images/Charts: ~chart1, ~hero-img
- Tables: ~metrics-table, ~team-table
- Inline spans: ~highlight, ~emphasis
- Comments: c1, c2, c3 (sequential)

## Constraints
- This is a quarterly revenue report.
- Maintain professional, data-driven tone.
- Do not remove existing comment anchors.
- New sections should follow the existing heading hierarchy (H2 for main sections, H3 for subsections).
```

***

## 10. File Extension & MIME Type

| Property | Value |
|----------|-------|
| File extension | `.mdxx` |
| MIME type | `text/mdxx` (provisional) |
| Encoding | UTF-8 (required) |
| Line endings | LF or CRLF (normalized to LF by parser) |
