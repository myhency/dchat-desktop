import { appendFileSync, mkdirSync } from 'fs'
import path from 'path'

const REPORT_DIR = path.resolve(__dirname, '../report')
const NDJSON_PATH = path.join(REPORT_DIR, 'perf-data.ndjson')

export { NDJSON_PATH, REPORT_DIR }

export interface MetricsRecord {
  type: 'metrics'
  label: string
  testFile: string
  timestamp: string
  data: { count: number; min: number; max: number; mean: number; p50: number; p95: number; p99: number }
}

export interface ExtraRecord {
  type: 'extra'
  label: string
  testFile: string
  timestamp: string
  data: Record<string, Record<string, number | string>>
}

export type PerfRecord = MetricsRecord | ExtraRecord

function getTestFile(): string {
  try {
    const worker = (globalThis as any).__vitest_worker__
    if (worker?.filepath) {
      const root = path.resolve(__dirname, '../..')
      return path.relative(root, worker.filepath)
    }
  } catch {
    // fallback
  }
  return 'unknown'
}

function append(record: PerfRecord): void {
  mkdirSync(REPORT_DIR, { recursive: true })
  appendFileSync(NDJSON_PATH, JSON.stringify(record) + '\n')
}

export function recordMetrics(
  label: string,
  metrics: { count: number; min: number; max: number; mean: number; p50: number; p95: number; p99: number }
): void {
  append({
    type: 'metrics',
    label,
    testFile: getTestFile(),
    timestamp: new Date().toISOString(),
    data: metrics
  })
}

export function recordExtra(
  label: string,
  data: Record<string, Record<string, number | string>>
): void {
  append({
    type: 'extra',
    label,
    testFile: getTestFile(),
    timestamp: new Date().toISOString(),
    data
  })
}
