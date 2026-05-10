import { ImapFlow } from 'imapflow';
import { env } from '../shared/env.js';
import { SCAN_STAGES, stagePercent } from '../shared/scanStages.js';
import { sseProgress, sseResult } from '../shared/sse.js';
import { listFlights } from '../db.js';
import { enqueueParseJobs, parseQueueEvents } from '../queue.js';
import { stripRfc822Headers, toMessageHash, toPlainText } from './mailUtils.js';

export async function runIcloudScan({ userId, res, req, session }) {
  let ticketsFound = 0;
  const sourceLabel = 'iCloud';
  let messagesScanned = 0;
  const parseBatchSize = 40;

  const client = new ImapFlow({
    host: session.server || env.IMAP_DEFAULT_HOST,
    port: session.port || env.IMAP_DEFAULT_PORT,
    secure: session.tls ?? env.IMAP_DEFAULT_TLS,
    auth: { user: session.email, pass: session.appPassword },
    logger: false,
  });

  emitStageProgress(res, 0, 0, 1, sourceLabel, messagesScanned, ticketsFound);
  await client.connect();
  await client.mailboxOpen('INBOX');
  emitStageProgress(res, 1, 1, 1, sourceLabel, messagesScanned, ticketsFound);

  const all = await client.search({ all: true });
  const selected = all.slice(-env.ICLOUD_MAX_MESSAGES);
  messagesScanned = selected.length;
  emitStageProgress(res, 2, 1, 1, sourceLabel, messagesScanned, ticketsFound);

  if (selected.length === 0) {
    await client.logout();
    emitStageProgress(res, 5, 1, 1, sourceLabel, messagesScanned, ticketsFound);
    sseProgress(res, {
      percent: 100,
      stageKey: 'done',
      stageLabel: 'All set!',
      sourceLabel,
      messagesScanned,
      ticketsFound: 0,
    });
    sseResult(res, []);
    return;
  }

  const candidates = [];
  let fetchedCount = 0;
  const totalForProgress = Math.max(1, selected.length);

  const flushCandidateBatch = async () => {
    if (candidates.length === 0) return;
    const chunk = candidates.splice(0, candidates.length);
    const jobs = await enqueueParseJobs(chunk);
    for (let j = 0; j < jobs.length; j += 1) {
      if (req.destroyed) break;
      const result = await jobs[j].waitUntilFinished(parseQueueEvents, 120000).catch(() => null);
      if (result?.inserted) ticketsFound += 1;
      emitStageProgress(
        res,
        3,
        fetchedCount,
        totalForProgress,
        sourceLabel,
        messagesScanned,
        ticketsFound,
        result?.parsed
          ? {
              latestDiscovery: {
                airline: result.parsed.airline,
                from_iata: result.parsed.from_iata,
                to_iata: result.parsed.to_iata,
                departure_date: result.parsed.departure_date,
              },
            }
          : undefined,
      );
    }
  };

  for await (const msg of client.fetch(selected, {
    uid: true,
    envelope: true,
    source: true,
    internalDate: true,
  })) {
    if (req.destroyed) break;

    const subject = msg.envelope?.subject || '';
    const rawSource = msg.source?.toString('utf8') || '';
    const bodyText = toPlainText(stripRfc822Headers(rawSource));
    const messageHash = toMessageHash('icloud', String(msg.uid), subject, msg.internalDate?.toISOString());

    candidates.push({
      source: 'icloud',
      userId,
      messageId: String(msg.uid),
      messageHash,
      subject,
      bodyText,
      receivedAt: msg.internalDate?.toISOString() || '',
    });

    fetchedCount += 1;
    emitStageProgress(
      res,
      3,
      fetchedCount,
      totalForProgress,
      sourceLabel,
      messagesScanned,
      ticketsFound,
    );

    if (candidates.length >= parseBatchSize) {
      await flushCandidateBatch();
    }
  }
  await client.logout();

  await flushCandidateBatch();
  emitStageProgress(res, 4, 1, 1, sourceLabel, messagesScanned, ticketsFound);

  emitStageProgress(res, 5, 1, 1, sourceLabel, messagesScanned, ticketsFound);
  const flights = await listFlights(userId, 'icloud');
  sseProgress(res, {
    percent: 100,
    stageKey: 'done',
    stageLabel: 'All set!',
    sourceLabel,
    messagesScanned,
    ticketsFound: flights.length,
  });
  sseResult(res, flights);
}

export async function validateIcloudCredentials({ email, appPassword, server }) {
  const client = new ImapFlow({
    host: server || env.IMAP_DEFAULT_HOST,
    port: env.IMAP_DEFAULT_PORT,
    secure: env.IMAP_DEFAULT_TLS,
    auth: { user: email, pass: appPassword },
    logger: false,
  });
  await client.connect();
  await client.logout();
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
