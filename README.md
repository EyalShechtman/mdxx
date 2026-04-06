# mdxx

A plain-text document format that extends Markdown with styling, layout, and AI agent instructions — all in one file.

Built as a cross-platform desktop editor with Tauri, Next.js, and a Rust WASM parser.

## Why mdxx?

Markdown is great for content, but styling lives somewhere else — a CSS file, a YAML frontmatter block, a separate template. And when AI agents edit your documents, there's no standard way to tell them the rules.

mdxx solves this by keeping everything in a single `.mdxx` file with three distinct sections:

| Section | Purpose | Example |
|---------|---------|---------|
| **Content** | Standard Markdown with optional ID tags | `# My Title ~title` |
| **Styling** | CSS-like rules targeting those IDs | `@title { font-size: 28pt; }` |
| **Agent Instructions** | Guidelines for LLMs editing the doc | `Use formal tone. Don't touch Section 2.` |

Sections are separated by a line of 40+ dashes. Only Section 1 is required.

## Quick Example

```mdxx
# Quarterly Report ~title

Sales grew 23% in Q1, driven by {{c1}}enterprise adoption{{/c1}}.

Key metrics are [highlighted]{~accent} below.

----------------------------------------

@page { size: letter; margin: 1in; }
@defaults { font-family: "Inter"; font-size: 11pt; }
@title { font-size: 28pt; font-weight: 700; text-align: center; }
@accent { color: #0066cc; font-weight: 700; background: #e6f0ff; }

@comment:c1 {
  author: "Sarah";
  date: "2026-04-01";
  text: "Can we add the exact number here?";
  resolved: false;
}

----------------------------------------

# Agent Instructions
- Keep the tone professional and concise.
- Do not modify styling unless asked.
```

## Features

- **Rich text editing** — TipTap-based editor with formatting toolbar (headings, fonts, colors, alignment, lists, tables, images, code blocks)
- **Inline styling** — Tag any element with `~id` and style it from Section 2. No CSS files, no frontmatter hacks
- **Comments and review** — Attach comments to text ranges with `{{id}}...{{/id}}` anchors. Track author, date, replies, and resolution status
- **Dual-pane editing** — Switch between the visual editor and raw Markdown/mdxx source
- **Rust WASM parser** — Content parsing happens in WebAssembly for speed and correctness
- **Cross-platform** — macOS (Apple Silicon) and Windows builds via Tauri
- **Auto-updates** — Built-in updater checks GitHub Releases for new versions
- **File associations** — Double-click `.mdxx` or `.md` files to open them directly

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| Rust | stable | [rustup.rs](https://rustup.rs) |
| wasm-pack | latest | `cargo install wasm-pack` |
| Xcode CLI Tools | latest | `xcode-select --install` (macOS only) |

### Install and Run

```bash
# Clone the repo
git clone https://github.com/EyalShechtman/mdxx.git
cd mdxx

# Build the WASM parser (required on first run)
cd crates/mdxx-parser
wasm-pack build --target web --out-dir ../../app/src/lib/mdxx-wasm

# Install dependencies and start the web dev server
cd ../../app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the editor in your browser.

To run the full desktop app with native file dialogs and auto-update:

```bash
cd app
npm run tauri:dev
```

### Build for Production

```bash
cd app
npm run tauri:build
```

The packaged app will be in `app/src-tauri/target/release/bundle/`.

### Validate Before Committing

Run the preflight script to catch issues early:

```bash
./scripts/preflight.sh
```

This runs the same checks as CI: WASM build, `npm ci`, TypeScript type check, and Next.js production build.

## Project Structure

```
mdxx/
├── app/                        # Next.js + Tauri desktop application
│   ├── src/
│   │   ├── app/                # Next.js pages and layout
│   │   ├── components/         # React components (Editor, Toolbar, Sidebar, etc.)
│   │   ├── extensions/         # TipTap plugins (block IDs, comments, styled spans, page breaks)
│   │   ├── lib/                # Parsing, conversion, file context, WASM bindings
│   │   └── styles/             # Tailwind CSS
│   ├── src-tauri/              # Rust backend (file I/O, dialogs, updater)
│   └── package.json
├── crates/
│   └── mdxx-parser/            # Rust WASM parser (pulldown-cmark + custom extensions)
├── examples/
│   └── report.mdxx             # Annotated example showing all three sections
└── scripts/
    └── preflight.sh            # Full build validation (same as CI)
```

## The mdxx Format in Detail

### Section 1: Content

Standard Markdown with three extensions:

- **Block IDs** — Append `~id` to any block element to make it styleable:
  ```
  ## Introduction ~intro
  ```
- **Comment anchors** — Wrap text in `{{id}}...{{/id}}` to attach a comment:
  ```
  The results were {{c1}}surprisingly positive{{/c1}}.
  ```
- **Inline spans** — Style a range of text within a paragraph:
  ```
  This is [important]{~highlight} information.
  ```

### Section 2: Styling

CSS-like `@id { ... }` blocks. Special targets include:

| Target | Purpose |
|--------|---------|
| `@page` | Page size and margins |
| `@defaults` | Base font, size, color, line-height |
| `@id` | Style a tagged block or span |
| `@comment:id` | Define a comment (author, date, text, resolved) |

### Section 3: Agent Instructions

Free-form Markdown that tells AI agents how to edit the document. The renderer ignores this section entirely. Use it for tone guidelines, naming conventions, constraints, or anything else an agent should know.

### Rules

- Content stays in Section 1. Styling stays in Section 2. Don't mix them.
- IDs use `lowercase-kebab-case`: `~title`, `~p-intro`, `~chart-1`
- Only tag elements that need custom styling — most content needs no IDs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://v2.tauri.app) |
| Frontend | [Next.js 16](https://nextjs.org) + React 19 |
| Rich text editor | [TipTap 3](https://tiptap.dev) (ProseMirror) |
| Code editor | [CodeMirror 6](https://codemirror.net) |
| Parser | Rust + [pulldown-cmark](https://github.com/pulldown-cmark/pulldown-cmark) compiled to WASM |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| CI/CD | GitHub Actions → GitHub Releases |

## CI/CD and Releases

Pushing a tag matching `v*` triggers the [release workflow](.github/workflows/release.yml), which:

1. Builds the WASM parser
2. Installs frontend dependencies
3. Builds the Tauri app for macOS (aarch64) and Windows (x86_64)
4. Publishes signed artifacts to GitHub Releases
5. Generates an updater manifest so existing installs auto-update

## Contributing

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `./scripts/preflight.sh` to validate the build
4. Open a pull request

There is no automated test suite yet — test changes manually by running the app.

## License

This project does not currently have a license. All rights reserved.
