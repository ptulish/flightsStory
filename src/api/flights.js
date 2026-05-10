// Data source abstraction. The dashboard never knows whether flights came from
// Gmail, IMAP, or a demo fixture — only this module does.
//
// To wire a real backend in MVP 1+:
//   • Replace fetchDemo / fetchGmail / fetchIcloud with calls to your server,
//     keeping the same return shape: an array of Flight rows compatible with
//     `enrichFlight` in utils/stats.js.
//   • The progress channel (onProgress) already supports the granular stages
//     described in the spec (connect → list → fetch → parse → save).

import { DEMO_FLIGHTS } from '../data/demoFlights';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const SCAN_STAGES = [
  { key: 'connect', label: 'Securely connecting…', weight: 6 },
  { key: 'index', label: 'Indexing your inbox…', weight: 18 },
  { key: 'filter', label: 'Filtering for tickets, itineraries and confirmations…', weight: 18 },
  { key: 'fetch', label: 'Downloading message bodies…', weight: 22 },
  { key: 'parse', label: 'Asking the AI to read your boarding passes…', weight: 26 },
  { key: 'save', label: 'Saving your flight history…', weight: 10 },
];

export async function fetchDemo({ onProgress, signal } = {}) {
  return runScan({
    onProgress,
    signal,
    flights: DEMO_FLIGHTS,
    sourceLabel: 'Demo data',
    fakeMessages: 4216,
  });
}

export async function fetchGmail({ onProgress, signal, account } = {}) {
  return fetchScanSse('/api/gmail/scan', {
    onProgress,
    signal,
    scanToken: account?.scanToken,
  });
}

export async function fetchIcloud({ onProgress, signal, account } = {}) {
  return fetchScanSse('/api/icloud/scan', {
    onProgress,
    signal,
    scanToken: account?.scanToken,
  });
}

async function runScan({ onProgress, signal, flights, sourceLabel, fakeMessages }) {
  const total = SCAN_STAGES.reduce((s, st) => s + st.weight, 0);
  let cumulative = 0;

  const found = [];
  const targetCount = flights.length;

  for (let i = 0; i < SCAN_STAGES.length; i++) {
    const stage = SCAN_STAGES[i];
    const stageStart = cumulative;
    const stageSteps = 12;

    for (let s = 0; s < stageSteps; s++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const t = (s + 1) / stageSteps;
      const percent = Math.round(((stageStart + stage.weight * t) / total) * 100);

      // Reveal flights gradually during fetch+parse stages.
      let counter = found.length;
      if (stage.key === 'parse' || stage.key === 'fetch') {
        const wantSoFar = Math.round(targetCount * Math.min(1, (i - 2 + t) / 2.2));
        while (found.length < Math.max(0, Math.min(targetCount, wantSoFar))) {
          found.push(flights[found.length]);
        }
        counter = found.length;
      }

      onProgress?.({
        percent,
        stageKey: stage.key,
        stageLabel: stage.label,
        sourceLabel,
        messagesScanned: Math.round(fakeMessages * (percent / 100)),
        ticketsFound: counter,
        stageStep: s + 1,
        stageTotalSteps: stageSteps,
      });

      await sleep(60 + Math.random() * 60);
    }

    cumulative += stage.weight;
  }

  // Reveal any remainder.
  while (found.length < targetCount) found.push(flights[found.length]);

  onProgress?.({
    percent: 100,
    stageKey: 'done',
    stageLabel: 'All set!',
    sourceLabel,
    messagesScanned: fakeMessages,
    ticketsFound: found.length,
    stageStep: 1,
    stageTotalSteps: 1,
  });

  return found;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchScanSse(endpoint, { onProgress, signal, scanToken } = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(scanToken ? { Authorization: `Bearer ${scanToken}` } : {}),
    },
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Scan request failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let flights = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const parsed = parseSseChunk(chunk);
      if (!parsed) continue;

      if (parsed.event === 'progress') {
        onProgress?.(parsed.data);
      } else if (parsed.event === 'result') {
        flights = parsed.data?.flights ?? null;
      } else if (parsed.event === 'error') {
        throw new Error(parsed.data?.message || 'Scan stream failed');
      }
    }
  }

  if (!Array.isArray(flights)) {
    throw new Error('Scan stream finished without flights payload');
  }

  return flights;
}

export async function startIcloudSession(payload) {
  const res = await fetch(`${API_BASE}/api/icloud/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to connect to iCloud');
  }
  return res.json();
}

function parseSseChunk(chunk) {
  if (!chunk.trim()) return null;
  let event = 'message';
  const dataLines = [];

  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) return null;

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}
