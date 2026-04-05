import init, { parse_mdxx } from './mdxx-wasm/mdxx_parser.js';
import type { MdxxDocument, ParseOutput } from './mdxx-types';

export type { MdxxDocument, ParseOutput };

let initialized = false;

export async function initWasm() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export function parseMdxx(input: string): ParseOutput {
  return parse_mdxx(input) as unknown as ParseOutput;
}
