import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './reader.js';
import type { RunStatus } from './types.js';

export type NightCounts = Record<RunStatus, number>;

// Counts valid log lines by status. Unparseable lines are ignored.
export function countLines(text: string): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line !== null) counts[line.status]++;
  }
  return counts;
}

// null when runs/<night>.jsonl cannot be read.
export function countNight(runsDir: string, night: string): NightCounts | null {
  try {
    return countLines(readFileSync(join(runsDir, `${night}.jsonl`), 'utf8'));
  } catch {
    return null;
  }
}
