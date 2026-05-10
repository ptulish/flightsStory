import { ensureSchema } from './db.js';
import { bindWorkerLogs, createParserWorker } from './queue.js';
import { logger } from './shared/logger.js';

await ensureSchema();
const worker = createParserWorker();
bindWorkerLogs(worker);

logger.info('SkyHistory parser worker is running');

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
