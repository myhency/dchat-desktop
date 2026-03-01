import { recordMetrics } from './recorder'
export { recordExtra } from './recorder'

export interface Metrics {
  count: number
  min: number
  max: number
  mean: number
  p50: number
  p95: number
  p99: number
}

export function computeMetrics(samples: number[]): Metrics {
  if (samples.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 }
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round((sum / sorted.length) * 100) / 100,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99)
  }
}

function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return Math.round((sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)) * 100) / 100
}

export function printTable(label: string, metrics: Metrics): void {
  console.log(`\n📊 ${label}`)
  console.table({
    [label]: {
      count: metrics.count,
      'min (ms)': metrics.min,
      'max (ms)': metrics.max,
      'mean (ms)': metrics.mean,
      'p50 (ms)': metrics.p50,
      'p95 (ms)': metrics.p95,
      'p99 (ms)': metrics.p99
    }
  })
  recordMetrics(label, metrics)
}
