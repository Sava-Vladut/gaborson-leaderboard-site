import type { DebugLogsResponse } from '../types';

export async function fetchDebugLogs(): Promise<DebugLogsResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/logs', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    return await res.json() as DebugLogsResponse;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
