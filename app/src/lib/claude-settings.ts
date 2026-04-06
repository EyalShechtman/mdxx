import { readAppData, writeAppData } from './tauri-bridge';
import { DEFAULT_MODEL, type ClaudeConfig } from './claude-api';

const SETTINGS_KEY = 'claude-settings';

export async function loadClaudeSettings(): Promise<ClaudeConfig | null> {
  try {
    const raw = await readAppData(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey || '',
      model: parsed.model || DEFAULT_MODEL,
    };
  } catch {
    return null;
  }
}

export async function saveClaudeSettings(config: ClaudeConfig): Promise<void> {
  await writeAppData(SETTINGS_KEY, JSON.stringify(config));
}
