/**
 * 성능 테스트 HTML 레포트 생성기
 *
 * perf/report/perf-data.ndjson + perf/baseline.json → perf/report/perf-report.html
 * 사용: npx tsx perf/report/generate-html.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'
import { loadBaseline, compareToBaseline } from '../helpers/baseline'

interface MetricsRecord {
  type: 'metrics'
  label: string
  testFile: string
  timestamp: string
  data: { count: number; min: number; max: number; mean: number; p50: number; p95: number; p99: number }
}

interface ExtraRecord {
  type: 'extra'
  label: string
  testFile: string
  timestamp: string
  data: Record<string, Record<string, number | string>>
}

type PerfRecord = MetricsRecord | ExtraRecord

// ── Read NDJSON ──

const NDJSON_PATH = path.resolve(__dirname, 'perf-data.ndjson')
const OUTPUT_PATH = path.resolve(__dirname, 'perf-report.html')

if (!existsSync(NDJSON_PATH)) {
  console.error('No perf-data.ndjson found. Run tests first: npm run test:perf')
  process.exit(1)
}

const lines = readFileSync(NDJSON_PATH, 'utf-8').trim().split('\n').filter(Boolean)
const records: PerfRecord[] = lines.map((l) => JSON.parse(l))

// ── Load Baseline ──

const baseline = loadBaseline()

// ── Group by testFile ──

const grouped = new Map<string, PerfRecord[]>()
for (const r of records) {
  const key = r.testFile
  if (!grouped.has(key)) grouped.set(key, [])
  grouped.get(key)!.push(r)
}

// ── Detect scaling series ──

const SCALE_RE = /^(.+?)\s*\((\d[\d,_]*)\)$/

interface ScalingSeries {
  prefix: string
  points: Array<{ scale: number; label: string; data: MetricsRecord['data'] }>
}

function detectScalingSeries(records: PerfRecord[]): ScalingSeries[] {
  const seriesMap = new Map<string, ScalingSeries>()

  for (const r of records) {
    if (r.type !== 'metrics') continue
    const match = r.label.match(SCALE_RE)
    if (!match) continue

    const prefix = match[1].trim()
    const scale = parseInt(match[2].replace(/[,_]/g, ''), 10)

    if (!seriesMap.has(prefix)) {
      seriesMap.set(prefix, { prefix, points: [] })
    }
    seriesMap.get(prefix)!.points.push({ scale, label: match[2], data: r.data })
  }

  const result: ScalingSeries[] = []
  for (const series of seriesMap.values()) {
    if (series.points.length >= 3) {
      series.points.sort((a, b) => a.scale - b.scale)
      result.push(series)
    }
  }
  return result
}

// ── Comparison stats ──

const statusCounts = { pass: 0, warn: 0, fail: 0, new: 0 }

// ── HTML Generation ──

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderBadge(status: string): string {
  return `<span class="badge badge-${status}">${status.toUpperCase()}</span>`
}

function renderDelta(delta: number | null): string {
  if (delta === null) return '<td class="dim">-</td>'
  const sign = delta > 0 ? '+' : ''
  const cls = delta > 0 ? 'delta-worse' : delta < 0 ? 'delta-better' : 'dim'
  return `<td class="${cls}">${sign}${delta}%</td>`
}

function renderMetricsTable(records: MetricsRecord[]): string {
  if (records.length === 0) return ''
  const hasBaseline = baseline !== null
  let html = `<table><thead><tr>
    <th>Scenario</th><th>Count</th><th>Min</th><th>Max</th><th>Mean</th><th>P50</th><th>P95</th><th>P99</th>`
  if (hasBaseline) html += `<th>Baseline</th><th>Delta</th><th>Status</th>`
  html += '</tr></thead><tbody>'

  for (const r of records) {
    const d = r.data
    const cmp = compareToBaseline(r.label, d.p95, baseline)
    statusCounts[cmp.status]++

    html += `<tr>
      <td class="label">${esc(r.label)}</td>
      <td>${d.count}</td><td>${d.min}</td><td>${d.max}</td>
      <td>${d.mean}</td><td>${d.p50}</td>
      <td class="highlight">${d.p95}</td><td>${d.p99}</td>`

    if (hasBaseline) {
      html += `<td class="dim">${cmp.baselineP95 ?? '-'}</td>`
      html += renderDelta(cmp.delta)
      html += `<td>${renderBadge(cmp.status)}</td>`
    }

    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function renderExtraTable(r: ExtraRecord): string {
  const rows = Object.entries(r.data)
  if (rows.length === 0) return ''
  const cols = new Set<string>()
  for (const [, vals] of rows) {
    for (const k of Object.keys(vals)) cols.add(k)
  }
  const colArr = [...cols]

  let html = `<table><thead><tr><th></th>`
  for (const c of colArr) html += `<th>${esc(c)}</th>`
  html += '</tr></thead><tbody>'
  for (const [rowName, vals] of rows) {
    html += `<tr><td class="label">${esc(rowName)}</td>`
    for (const c of colArr) {
      html += `<td>${vals[c] ?? ''}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function renderChart(series: ScalingSeries, idx: number): string {
  const labels = series.points.map((p) => p.label)
  const p50 = series.points.map((p) => p.data.p50)
  const p95 = series.points.map((p) => p.data.p95)
  const mean = series.points.map((p) => p.data.mean)

  return `
    <div class="chart-container">
      <canvas id="chart-${idx}"></canvas>
    </div>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof Chart === 'undefined') return;
        new Chart(document.getElementById('chart-${idx}'), {
          type: 'line',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [
              { label: 'P95 (ms)', data: ${JSON.stringify(p95)}, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 },
              { label: 'P50 (ms)', data: ${JSON.stringify(p50)}, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3 },
              { label: 'Mean (ms)', data: ${JSON.stringify(mean)}, borderColor: '#a855f7', borderDash: [5,5], fill: false, tension: 0.3 }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              title: { display: true, text: '${esc(series.prefix)} — Scaling', color: '#e2e8f0', font: { size: 14 } },
              legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
              x: { title: { display: true, text: 'Scale', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
              y: { title: { display: true, text: 'Time (ms)', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' }, beginAtZero: true }
            }
          }
        });
      });
    </script>`
}

// ── Assemble ──

const metricsCount = records.filter((r) => r.type === 'metrics').length
const extraCount = records.filter((r) => r.type === 'extra').length

const allSeries: ScalingSeries[] = []
for (const [, recs] of grouped) {
  allSeries.push(...detectScalingSeries(recs))
}

let sectionsHtml = ''
let chartIdx = 0
for (const [file, recs] of grouped) {
  const metricsRecs = recs.filter((r): r is MetricsRecord => r.type === 'metrics')
  const extraRecs = recs.filter((r): r is ExtraRecord => r.type === 'extra')

  sectionsHtml += `<section><h2>${esc(file)}</h2>`

  if (metricsRecs.length > 0) {
    sectionsHtml += renderMetricsTable(metricsRecs)
  }

  const fileSeries = detectScalingSeries(recs)
  for (const s of fileSeries) {
    sectionsHtml += renderChart(s, chartIdx++)
  }

  for (const r of extraRecs) {
    sectionsHtml += `<h3>${esc(r.label)}</h3>`
    sectionsHtml += renderExtraTable(r)
  }

  sectionsHtml += '</section>'
}

// ── Status summary cards ──

const baselineInfo = baseline
  ? `Baseline: ${new Date(baseline.updatedAt).toLocaleDateString()}`
  : 'No baseline'

let statusCardsHtml = ''
if (baseline) {
  statusCardsHtml = `
  <div class="summary" style="margin-bottom: 1rem;">
    <div class="summary-card" style="border-color: #22c55e"><div class="num" style="color: #22c55e">${statusCounts.pass}</div><div class="lbl">Pass</div></div>
    <div class="summary-card" style="border-color: #eab308"><div class="num" style="color: #eab308">${statusCounts.warn}</div><div class="lbl">Warn</div></div>
    <div class="summary-card" style="border-color: #ef4444"><div class="num" style="color: #ef4444">${statusCounts.fail}</div><div class="lbl">Fail</div></div>
    <div class="summary-card" style="border-color: #3b82f6"><div class="num" style="color: #3b82f6">${statusCounts.new}</div><div class="lbl">New</div></div>
  </div>`
} else {
  statusCardsHtml = `<div class="no-baseline">No baseline set. Run <code>npm run test:perf:baseline</code> to create one.</div>`
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Performance Test Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  :root {
    --bg: #0f172a; --bg2: #1e293b; --fg: #e2e8f0; --fg2: #94a3b8;
    --accent: #3b82f6; --danger: #ef4444; --border: #334155;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f8fafc; --bg2: #ffffff; --fg: #1e293b; --fg2: #64748b;
      --accent: #2563eb; --danger: #dc2626; --border: #e2e8f0;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: var(--bg); color: var(--fg); padding: 2rem; max-width: 1200px; margin: 0 auto; line-height: 1.6; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .meta { color: var(--fg2); font-size: 0.85rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
  .meta span { display: inline-block; margin-right: 1.5rem; }
  .summary { display: flex; gap: 1rem; margin-bottom: 2rem; }
  .summary-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.5rem; flex: 1; text-align: center; }
  .summary-card .num { font-size: 2rem; font-weight: 700; color: var(--accent); }
  .summary-card .lbl { font-size: 0.8rem; color: var(--fg2); text-transform: uppercase; letter-spacing: 0.05em; }
  .no-baseline { background: var(--bg2); border: 1px dashed var(--border); border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 2rem; color: var(--fg2); font-size: 0.9rem; }
  .no-baseline code { background: rgba(59,130,246,0.15); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.85em; color: var(--accent); }
  section { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  h2 { font-size: 1.1rem; color: var(--accent); margin-bottom: 1rem; font-family: monospace; }
  h3 { font-size: 0.95rem; color: var(--fg2); margin: 1.25rem 0 0.5rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 0.75rem; }
  th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--border); color: var(--fg2); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--border); font-variant-numeric: tabular-nums; }
  td.label { font-weight: 500; max-width: 300px; }
  td.highlight { color: var(--danger); font-weight: 600; }
  td.dim { color: var(--fg2); }
  td.delta-better { color: #22c55e; font-weight: 500; }
  td.delta-worse { color: #ef4444; font-weight: 500; }
  tr:hover { background: rgba(59,130,246,0.05); }
  .badge { display: inline-block; padding: 0.15em 0.5em; border-radius: 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; }
  .badge-pass { background: rgba(34,197,94,0.15); color: #22c55e; }
  .badge-warn { background: rgba(234,179,8,0.15); color: #eab308; }
  .badge-fail { background: rgba(239,68,68,0.15); color: #ef4444; }
  .badge-new { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .chart-container { margin: 1.25rem 0; max-width: 700px; }
  footer { text-align: center; color: var(--fg2); font-size: 0.75rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); }
</style>
</head>
<body>

<h1>Performance Test Report</h1>
<div class="meta">
  <span>Generated: ${esc(new Date().toISOString())}</span>
  <span>Node ${process.version}</span>
  <span>${os.platform()} ${os.arch()}</span>
  <span>${os.cpus()[0]?.model ?? 'unknown CPU'}</span>
  <span>${baselineInfo}</span>
</div>

<div class="summary">
  <div class="summary-card"><div class="num">${metricsCount}</div><div class="lbl">Metric Scenarios</div></div>
  <div class="summary-card"><div class="num">${extraCount}</div><div class="lbl">Extra Measurements</div></div>
  <div class="summary-card"><div class="num">${grouped.size}</div><div class="lbl">Test Files</div></div>
  <div class="summary-card"><div class="num">${allSeries.length}</div><div class="lbl">Scaling Charts</div></div>
</div>

${statusCardsHtml}

${sectionsHtml}

<footer>D Chat Desktop — Performance Test Suite</footer>
</body>
</html>`

writeFileSync(OUTPUT_PATH, html)
console.log(`\n✅ Report generated: ${OUTPUT_PATH}`)
console.log(`   ${metricsCount} metrics + ${extraCount} extras from ${grouped.size} test files`)
if (baseline) {
  console.log(`   Baseline comparison: ${statusCounts.pass} pass, ${statusCounts.warn} warn, ${statusCounts.fail} fail, ${statusCounts.new} new`)
} else {
  console.log('   No baseline found. Run: npm run test:perf:baseline')
}
