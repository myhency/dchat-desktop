/**
 * 현재 NDJSON 결과를 베이스라인으로 저장
 *
 * 사용: npx tsx perf/scripts/update-baseline.ts
 * 또는: npm run test:perf:baseline
 */

import { saveBaseline, BASELINE_PATH } from '../helpers/baseline'

saveBaseline()
console.log(`\n✅ Baseline updated: ${BASELINE_PATH}`)
