function parseDuration(value, fallbackMs = 7 * 24 * 60 * 60 * 1000) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallbackMs;

  const match = value.trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factors = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * factors[unit];
}

module.exports = { parseDuration };
