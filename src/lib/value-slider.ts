/** Slider bounds for owner-only value adjustment. */
export function computeValueSliderBounds(
  userValue: number,
  aiMin: number | null | undefined,
  aiMax: number | null | undefined
): { min: number; max: number; step: number } {
  const uv = Number.isFinite(userValue) && userValue > 0 ? userValue : 1000;

  const hasRange =
    aiMin != null &&
    aiMax != null &&
    Number.isFinite(aiMin) &&
    Number.isFinite(aiMax) &&
    aiMin > 0 &&
    aiMax >= aiMin;

  let min: number;
  let max: number;

  if (hasRange) {
    min = Math.max(0, Math.floor(aiMin! * 0.5));
    max = Math.ceil(aiMax! * 1.5);
  } else {
    min = Math.max(0, Math.floor(uv * 0.5));
    max = Math.ceil(uv * 1.5);
  }

  if (max <= min) {
    max = min + Math.max(500, Math.round(uv));
  }

  const span = max - min;
  const step = span > 50_000 ? 500 : span > 10_000 ? 200 : span > 2_000 ? 100 : 50;

  return { min, max, step };
}

export function clampSliderValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function isValidOwnerValue(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
