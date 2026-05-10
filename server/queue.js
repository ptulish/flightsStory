import crypto from 'node:crypto';
import IORedis from 'ioredis';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { env } from './shared/env.js';
import { logger } from './shared/logger.js';
import { parseFlightFromEmailDetailed } from './parsers/flightParser.js';
import { storeFlight, storeUnresolvedFlight } from './db.js';
import { getJsonCache, setJsonCache } from './cache.js';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const connection = redis.duplicate();

export const parseQueue = new Queue('flight-parse', { connection });
export const parseQueueEvents = new QueueEvents('flight-parse', { connection });

export async function enqueueParseJobs(messages) {
  const jobs = await parseQueue.addBulk(
    messages.map((msg) => ({
      name: 'parse-email',
      data: msg,
      opts: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: 500,
        removeOnFail: 1000,
        jobId: `${msg.source}:${msg.userId}:${msg.messageId || crypto.randomUUID()}`,
      },
    })),
  );
  return jobs;
}

export function createParserWorker() {
  return new Worker(
    'flight-parse',
    async (job) => {
      const parsed = await parseFlightFromEmailDetailed(job.data);
      if (!parsed.flight) {
        if (parsed.unresolved) {
          await storeUnresolvedFlight(
            job.data.userId,
            job.data.source,
            job.data.messageHash,
            parsed.unresolved,
            {
              subject: job.data.subject,
              receivedAt: job.data.receivedAt,
              messageId: job.data.messageId ?? null,
              internalDateMs: job.data.internalDateMs ?? null,
            },
          );
        }
        return {
          inserted: false,
          reason: parsed.reason || 'no-flight',
          unresolved: parsed.unresolved || null,
        };
      }

      const inserted = await storeFlight(
        job.data.userId,
        job.data.source,
        job.data.messageHash,
        parsed.flight,
        {
          subject: job.data.subject,
          receivedAt: job.data.receivedAt,
          messageId: job.data.messageId ?? null,
          internalDateMs: job.data.internalDateMs ?? null,
        },
      );

      return { inserted, parsed: parsed.flight };
    },
    {
      connection,
      concurrency: 4,
      autorun: true,
    },
  );
}

export async function storeIcloudSession(payload) {
  const token = crypto.randomUUID();
  await setJsonCache(`icloud:session:${token}`, payload, 60 * 30);
  return token;
}

export async function readIcloudSession(token) {
  return getJsonCache(`icloud:session:${token}`);
}

export function bindWorkerLogs(worker) {
  worker.on('completed', (job, result) => {
    logger.debug({ jobId: job.id, result }, 'parse job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'parse job failed');
  });
}
