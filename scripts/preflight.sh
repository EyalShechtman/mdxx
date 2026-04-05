#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1/4 Building WASM parser ==="
cd "$ROOT/crates/mdxx-parser"
wasm-pack build --target web --out-dir ../../app/src/lib/mdxx-wasm

echo "=== 2/4 Installing frontend deps ==="
cd "$ROOT/app"
npm ci

echo "=== 3/4 TypeScript check ==="
npx tsc --noEmit

echo "=== 4/4 Next.js build ==="
npm run build

echo ""
echo "=== All checks passed. Safe to tag and release. ==="
