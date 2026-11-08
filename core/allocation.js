// Integer percentage allocation for two to four variants. No visitor state.
export function rebalanceWeights(weights, index, requested) {
  if (weights.length < 2 || weights.length > 4 || !Number.isInteger(index) || index < 0 || index >= weights.length) throw new Error('Choose an existing variant.');
  const value = Number(requested);
  if (!Number.isFinite(value)) return [...weights];
  const selected = Math.min(101 - weights.length, Math.max(1, Math.round(value)));
  const peers = weights.map((weight, i) => ({ i, score: Math.max(0, Number(weight) - 1) })).filter(item => item.i !== index);
  const remaining = 100 - selected - peers.length;
  const total = peers.reduce((sum, item) => sum + item.score, 0);
  const portions = peers.map(item => ({ ...item, raw: remaining * (total ? item.score / total : 1 / peers.length) }));
  const result = weights.map(() => 1);
  result[index] = selected;
  for (const item of portions) result[item.i] += Math.floor(item.raw);
  let rest = 100 - result.reduce((sum, weight) => sum + weight, 0);
  for (const item of [...portions].sort((a, b) => (b.raw % 1) - (a.raw % 1) || a.i - b.i)) if (rest-- > 0) result[item.i]++;
  return result;
}

export function allocationPreset(count, preset) {
  if (![2, 3, 4].includes(count)) throw new Error('Use two to four variants.');
  const equal = Array.from({ length: count }, (_, i) => Math.floor(100 / count) + (i < 100 % count ? 1 : 0));
  if (preset === 'equal') return equal;
  if (!['70-30', '90-10'].includes(preset)) throw new Error('Unknown allocation preset.');
  return rebalanceWeights(equal, 0, preset === '70-30' ? 70 : 90);
}
