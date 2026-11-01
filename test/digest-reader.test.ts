import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const tmpDirs: string[] = [];
function nightIn(lines: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-reader-'));
  tmpDirs.push(dir);
  writeFileSync(join(dir, '2026-01-01.jsonl'), lines);
  return dir;
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line, sorted by job', () => {
    const d = readNight('runs', '2026-10-28');
    expect(d).not.toBeNull();
    if (d === null) return;
    expect(d.night).toBe('2026-10-28');
    expect(d.badLines).toBe(1);
    expect(d.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const refresh = d.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const backup = d.rows.find((r) => r.job === 'notes/backup');
    expect(backup?.lastStatus).toBe('fail');
    expect(backup?.lastError).toBe('quota exceeded');
    const rotate = d.rows.find((r) => r.job === 'rig/rotate-logs');
    expect(rotate?.lastError).toBeNull();
    expect(rotate?.firstAt).toBe('2026-10-28T23:00:02+01:00');
  });

  it('keeps a row whose owner is null', () => {
    const d = readNight('runs', '2026-10-28');
    const render = d?.rows.find((r) => r.job === 'digest/render');
    expect(render).toBeDefined();
    expect(render?.owner).toBeNull();
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    expect(readNight(nightIn(''), '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts invalid shapes as bad lines without throwing', () => {
    const dir = nightIn(
      [
        '{"at":"2026-01-01T01:00:00+02:00","job":"a","status":"ok","owner":null}',
        '{"at":"2026-01-01T01:00:00+02:00","job":"a","status":"maybe","owner":null}',
        '{"job":"a","status":"ok","owner":null}',
        '[1,2]',
        'null',
        'not json',
        '',
      ].join('\n'),
    );
    const d = readNight(dir, '2026-01-01');
    expect(d?.badLines).toBe(5);
    expect(d?.rows).toHaveLength(1);
    expect(d?.rows[0]?.firstAt).toBe('2026-01-01T01:00:00+02:00');
  });
});
