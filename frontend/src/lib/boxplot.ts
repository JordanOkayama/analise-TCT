export interface BoxPlotStats {
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
}

// Receives an already sorted, nonempty sequence.
function medianOfSorted(values: number[]): number {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

export function scoreBox(values: readonly number[]): BoxPlotStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = medianOfSorted(sorted);
  // Exclude the central observation for odd samples. A singleton has no halves.
  const q1 = sorted.length === 1 ? median : medianOfSorted(sorted.slice(0, middle));
  const q3 = sorted.length === 1 ? median : medianOfSorted(sorted.slice(Math.ceil(sorted.length / 2)));
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const inliers = sorted.filter((value) => value >= lowerFence && value <= upperFence);
  return {
    q1, median, q3, iqr, lowerFence, upperFence,
    lowerWhisker: inliers[0],
    upperWhisker: inliers[inliers.length - 1],
    outliers: sorted.filter((value) => value < lowerFence || value > upperFence)
  };
}
