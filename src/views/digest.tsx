import type { Digest, DigestRow } from '../digest/types.js';

const dash = '—';

function flagged(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ digest }: { digest: Digest }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
              <th>flag</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={flagged(r) ? 'warn flagged' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
                <td>
                  {r.lastStatus === 'fail' ? <span class="warn">fail</span> : null}
                  {r.lastStatus === 'fail' && r.retries >= 3 ? ' ' : null}
                  {r.retries >= 3 ? <span class="warn">retries</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
