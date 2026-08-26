export const SPARKLINE_X_POSITIONS = [10, 58, 106, 154, 202, 250, 298];

export function buildSparklinePoints(counts: number[]): string {
  const maxValue = Math.max(...counts, 1);
  return counts
    .map((count, i) => {
      const y = 90 - (count / maxValue) * 70;
      return `${SPARKLINE_X_POSITIONS[i]},${y.toFixed(1)}`;
    })
    .join(" ");
}
