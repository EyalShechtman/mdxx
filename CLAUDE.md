# mdxx

A plain-text document format that extends Markdown with styling, layout, and agent instructions. Built as a Tauri + Next.js desktop app with a Rust WASM parser.

## Project Structure

```
raleigh/
├── app/                    # Next.js + Tauri application
│   ├── src/                # React/TypeScript frontend
│   ├── src-tauri/          # Tauri Rust backend
│   └── package.json
├── crates/
│   └── mdxx-parser/        # Rust WASM parser (compiled via wasm-pack)
├── examples/
│   └── report.mdxx         # Example mdxx file showing all three sections
└── scripts/
    └── preflight.sh        # Full build validation script
```

## Local Development

### Prerequisites

- Node.js 22
- Rust stable toolchain
- wasm-pack (`cargo install wasm-pack`)
- Xcode Command Line Tools (macOS)

### Running the App

**Web dev server (fastest iteration):**
```bash
cd app
npm run dev        # http://localhost:3000
```

**Desktop app with live reload:**
```bash
cd app
npm run tauri:dev
```

### Building the WASM Parser

Required after any changes to `crates/mdxx-parser/`:
```bash
cd crates/mdxx-parser
wasm-pack build --target web --out-dir ../../app/src/lib/mdxx-wasm
```

### Full Build Validation

Run `scripts/preflight.sh` to execute the same checks CI runs before a release:

1. Builds the WASM parser
2. Installs frontend deps (`npm ci`)
3. TypeScript type check (`tsc --noEmit`)
4. Next.js production build

```bash
./scripts/preflight.sh
```

### Testing

There is no automated test suite yet. Test functionality manually by running the app (`npm run dev` or `npm run tauri:dev`) and interacting with the editor.

The only automated validation is TypeScript type checking, which runs as part of `preflight.sh`.

## The mdxx Format

An `.mdxx` file has up to three sections separated by a line of 40+ dashes (`----------------------------------------`):

- **Section 1 (Content):** Standard Markdown with optional `~id` tags, `{{id}}...{{/id}}` comment anchors, and `[text]{~id}` inline spans
- **Section 2 (Styling):** `@id { property: value; }` blocks that target tagged elements — fonts, colors, layout, page setup, comments
- **Section 3 (Agent Instructions):** Free-form Markdown consumed by LLMs/agents, ignored by the renderer

Only Section 1 is required. See `examples/report.mdxx` for a working example.

## Key Rules

- Never put styling in Section 1; never put content in Section 2
- ID tags use lowercase-kebab-case: `~title`, `~p-intro`, `~chart1`
- The `@` prefix in Section 2 is used for Next.js — read `app/AGENTS.md` before modifying frontend code
