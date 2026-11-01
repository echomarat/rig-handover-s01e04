export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Digest = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Rows sorted by job. Returns null when runs/<night>.jsonl does not exist.
// A line that does not parse is counted in badLines, never thrown.
export type ReadNight = (runsDir: string, night: string) => Digest | null;
