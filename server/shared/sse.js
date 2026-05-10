export function initSse(res) {
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.flushHeaders?.();
}

export function sseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function sseProgress(res, payload) {
  sseEvent(res, 'progress', payload);
}

export function sseError(res, message, details) {
  sseEvent(res, 'error', { message, details });
}

export function sseResult(res, flights) {
  sseEvent(res, 'result', { flights });
}
