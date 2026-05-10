import { google } from 'googleapis';
import { env } from '../shared/env.js';
import { SCAN_STAGES, stagePercent } from '../shared/scanStages.js';
import { sseProgress, sseResult } from '../shared/sse.js';
import { getGoogleTokens, listFlights, saveGoogleTokens } from '../db.js';
import { enqueueParseJobs, parseQueueEvents } from '../queue.js';
import { decodeGmailBody, toMessageHash, toPlainText } from './mailUtils.js';

export async function runGmailScan({ userId, res, req }) {
  let ticketsFound = 0;
  const sourceLabel = 'Gmail';
  const messagesScanned = { value: 0 };
  const parseBatchSize = 40;

  emitStageProgress(res, 0, 0, 1, sourceLabel, messagesScanned.value, ticketsFound);

  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  const stored = await getGoogleTokens(userId);
  if (!stored) throw new Error('Google account is not connected');
  oauth2.setCredentials(stored);
  oauth2.on('tokens', async (tokens) => {
    await saveGoogleTokens(userId, { ...stored, ...tokens });
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  emitStageProgress(res, 1, 1, 1, sourceLabel, messagesScanned.value, ticketsFound);
  const q = 'newer_than:5y (flight OR itinerary OR boarding OR reservation OR ticket)';
  const cap = env.GMAIL_MAX_MESSAGES;
  /** Gmail allows at most 500 ids per list call; we page until cap or no nextPageToken. */
  const pageSize = Math.min(500, cap);
  const items = [];
  let pageToken;
  do {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(pageSize, cap - items.length),
      pageToken: pageToken || undefined,
    });
    const page = listRes.data.messages || [];
    for (const m of page) {
      if (items.length >= cap) break;
      items.push(m);
    }
    pageToken = listRes.data.nextPageToken;
  } while (pageToken && items.length < cap);
  messagesScanned.value = items.length;

  emitStageProgress(res, 2, 1, 1, sourceLabel, messagesScanned.value, ticketsFound);

  const candidates = [];
  let fetchedCount = 0;
  const totalForProgress = Math.max(1, items.length);

  const flushCandidateBatch = async () => {
    if (candidates.length === 0) return;
    const chunk = candidates.splice(0, candidates.length);
    const jobs = await enqueueParseJobs(chunk);

    for (let j = 0; j < jobs.length; j += 1) {
      if (req.destroyed) break;
      const result = await jobs[j].waitUntilFinished(parseQueueEvents, 120000).catch(() => null);
      if (result?.inserted) ticketsFound += 1;
      const extra = {};
      if (result?.parsed) {
        extra.latestDiscovery = {
          airline: result.parsed.airline,
          from_iata: result.parsed.from_iata,
          to_iata: result.parsed.to_iata,
          departure_date: result.parsed.departure_date,
        };
      }
      if (result?.unresolved) {
        extra.latestUnresolved = result.unresolved;
      }
      // Keep progress in "fetch" while batching to avoid regressions in stage percent.
      emitStageProgress(
        res,
        3,
        fetchedCount,
        totalForProgress,
        sourceLabel,
        messagesScanned.value,
        ticketsFound,
        Object.keys(extra).length ? extra : undefined,
      );
    }
  };

  for (let i = 0; i < items.length; i += 1) {
    if (req.destroyed) break;
    const msg = items[i];
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });
    const payload = full.data.payload;
    const headers = Object.fromEntries((payload?.headers || []).map((h) => [h.name, h.value || '']));
    const subject = headers.Subject || '';
    const date = headers.Date || full.data.internalDate || '';
    const internalDateMs = full.data.internalDate ? Number(full.data.internalDate) : null;
    const bodyText = toPlainText(decodeGmailBody(payload));
    const messageHash = toMessageHash('gmail', msg.id, subject, date);

    candidates.push({
      source: 'gmail',
      userId,
      messageId: msg.id,
      messageHash,
      subject,
      bodyText,
      receivedAt: date,
      internalDateMs,
    });

    fetchedCount = i + 1;
    emitStageProgress(
      res,
      3,
      fetchedCount,
      totalForProgress,
      sourceLabel,
      messagesScanned.value,
      ticketsFound,
    );

    if (candidates.length >= parseBatchSize) {
      await flushCandidateBatch();
    }
  }

  await flushCandidateBatch();
  emitStageProgress(res, 4, 1, 1, sourceLabel, messagesScanned.value, ticketsFound);

  emitStageProgress(res, 5, 1, 1, sourceLabel, messagesScanned.value, ticketsFound);
  const flights = await listFlights(userId, 'gmail');
  sseProgress(res, {
    percent: 100,
    stageKey: 'done',
    stageLabel: 'All set!',
    sourceLabel,
    messagesScanned: messagesScanned.value,
    ticketsFound: flights.length,
  });
  sseResult(res, flights);
}

function emitStageProgress(
  res,
  stageIdx,
  step,
  totalSteps,
  sourceLabel,
  messagesScanned,
  ticketsFound,
  extra = undefined,
) {
  const stage = SCAN_STAGES[stageIdx];
  sseProgress(res, {
    percent: stagePercent(stageIdx, step, totalSteps),
    stageKey: stage.key,
    stageLabel: stage.label,
    sourceLabel,
    messagesScanned,
    ticketsFound,
    stageStep: step,
    stageTotalSteps: totalSteps,
    ...(extra || {}),
  });
}
