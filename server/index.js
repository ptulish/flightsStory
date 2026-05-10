import { createApp } from './app.js';
import { env } from './shared/env.js';
import { logger } from './shared/logger.js';

const app = await createApp();

app.listen(env.PORT, () => {
  logger.info(`SkyHistory API listening on http://localhost:${env.PORT}`);
});
