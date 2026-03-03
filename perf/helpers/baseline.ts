import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { NDJSON_PATH } from './recorder'
import type { Metrics } from './metrics'

const BASELINE_PATH = path.resolve(__dirname, '../baseline.json')

export { BASELINE_PATH }

export interface Baseline {
  version: 1
  updatedAt: string
  thresholds: Record<string, { p95: number; tolerance: number }>
}

export interface CompareResult {
  status: 'pass' | 'warn' | 'fail' | 'new'
  baselineP95: number | null
  delta: number | null
}

export function loadBaseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
  } catch {
    return null
  }
}

export function saveBaseline(tolerance = 0.5): void {
  if (!existsSync(NDJSON_PATH)) {
    console.error('No perf-data.ndjson found. Run tests first: npm run test:perf')
    process.exit(1)
  }

  const lines = readFileSync(NDJSON_PATH, 'utf-8').trim().split('\n').filter(Boolean)
  const thresholds: Baseline['thresholds'] = {}

  for (const line of lines) {
    const record = JSON.parse(line)
    if (record.type === 'metrics') {
      thresholds[record.label] = {
        p95: record.data.p95,
        tolerance
      }
    }
  }

  const baseline: Baseline = {
    version: 1,
    updatedAt: new Date().toISOString(),
    thresholds
  }

  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n')
}

// If the absolute P95 difference is below this threshold (ms),
// always PASS regardless of percentage — prevents GC jitter noise
// from triggering FAIL on sub-millisecond baselines.
const MIN_ABS_DELTA_MS = 50

export function compareToBaseline(label: string, currentP95: number, baseline: Baseline | null): CompareResult {
  if (!baseline || !baseline.thresholds[label]) {
    return { status: 'new', baselineP95: null, delta: null }
  }

  const { p95: baseP95, tolerance } = baseline.thresholds[label]
  const delta = Math.round(((currentP95 - baseP95) / baseP95) * 100)

  if (currentP95 - baseP95 < MIN_ABS_DELTA_MS) {
    return { status: 'pass', baselineP95: baseP95, delta }
  }
  if (currentP95 <= baseP95 * (1 + tolerance)) {
    return { status: 'pass', baselineP95: baseP95, delta }
  }
  if (currentP95 <= baseP95 * (1 + tolerance * 2)) {
    return { status: 'warn', baselineP95: baseP95, delta }
  }
  return { status: 'fail', baselineP95: baseP95, delta }
}
