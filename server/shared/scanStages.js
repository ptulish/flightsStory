export const SCAN_STAGES = [
  { key: 'connect', label: 'Securely connecting...', weight: 6 },
  { key: 'index', label: 'Indexing your inbox...', weight: 18 },
  { key: 'filter', label: 'Filtering for tickets, itineraries and confirmations...', weight: 18 },
  { key: 'fetch', label: 'Downloading message bodies...', weight: 22 },
  { key: 'parse', label: 'Asking the AI to read your boarding passes...', weight: 26 },
  { key: 'save', label: 'Saving your flight history...', weight: 10 },
];

export function stagePercent(stageIdx, step, totalSteps) {
  const totalWeight = SCAN_STAGES.reduce((sum, stage) => sum + stage.weight, 0);
  const stageOffset = SCAN_STAGES.slice(0, stageIdx).reduce((sum, stage) => sum + stage.weight, 0);
  const stageWeight = SCAN_STAGES[stageIdx]?.weight || 0;
  const t = totalSteps <= 0 ? 1 : Math.min(1, Math.max(0, step / totalSteps));
  return Math.round(((stageOffset + stageWeight * t) / totalWeight) * 100);
}
