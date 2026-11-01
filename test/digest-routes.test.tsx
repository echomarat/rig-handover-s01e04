import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Digest } from '../src/digest/types.js';

const tmpDirs: string[] = [];
function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  tmpDirs.push(dir);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return createApp({ ...loadConfig(), runsDir: dir });
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

async function json(res: Response): Promise<Digest> {
  return (await res.json()) as Digest;
}

// First cell of each body row, in page order.
function pageJobs(html: string): string[] {
  const body = html.split('<tbody>')[1] ?? '';
  return [...body.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((m) => m[1] ?? '');
}

const good = '{"at":"2026-01-01T23:00:00+01:00","job":"a/one","status":"ok","owner":"rook"}\n';

describe('digest routes', () => {
  const app = createApp(loadConfig());

  it('serves 2026-10-28 as page and JSON', async () => {
    const page = await app.request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<table>');
    const api = await app.request('/api/digest/2026-10-28');
    expect(api.status).toBe(200);
    expect((await json(api)).night).toBe('2026-10-28');
  });

  it('404s for a night with no file and for a malformed night', async () => {
    for (const path of ['/digest/2026-01-01', '/digest/nope', '/api/digest/2026-01-01', '/api/digest/nope']) {
      expect((await app.request(path)).status, path).toBe(404);
    }
  });

  it('empty night: "nothing ran" on the page, rows [] in JSON', async () => {
    const a = appWith({ '2026-01-01.jsonl': '' });
    const page = await a.request('/digest/2026-01-01');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const d = await json(await a.request('/api/digest/2026-01-01'));
    expect(d.rows).toEqual([]);
  });

  it('bad line: page still renders, JSON counts it', async () => {
    const a = appWith({ '2026-01-01.jsonl': `${good}not json\n` });
    const page = await a.request('/digest/2026-01-01');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('a/one');
    const d = await json(await a.request('/api/digest/2026-01-01'));
    expect(d.badLines).toBeGreaterThanOrEqual(1);
    expect(d.rows).toHaveLength(1);
  });

  it('page and JSON list the same jobs in the same order (ADR 0001)', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const d = await json(await app.request('/api/digest/2026-10-28'));
    expect(d.rows.length).toBeGreaterThan(0);
    expect(pageJobs(html)).toEqual(d.rows.map((r) => r.job));
  });
});
