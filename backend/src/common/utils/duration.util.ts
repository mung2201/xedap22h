const DURATION_PATTERN = /^(\d+)\s*(ms|s|m|h|d|w)$/i;

const UNIT_IN_MILLISECONDS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export const durationToMilliseconds = (value: string): number => {
  const match = DURATION_PATTERN.exec(value.trim());

  if (!match) {
    throw new Error(
      `Invalid duration "${value}". Use a value such as 15m, 7d, or 1h.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = UNIT_IN_MILLISECONDS[unit];

  if (!multiplier) {
    throw new Error(`Unsupported duration unit "${unit}".`);
  }

  return amount * multiplier;
};
