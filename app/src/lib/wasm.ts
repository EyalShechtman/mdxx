import init, { parse_mdxx } from './mdxx-wasm/mdxx_parser.js';

let initialized = false;

export async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export interface ParseOutput {
  document: unknown;
  html: string;
  errors: string[];
}

export function parseMdxx(input: string): ParseOutput {
  return parse_mdxx(input) as unknown as ParseOutput;
}
