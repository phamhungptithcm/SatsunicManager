import type { OperationsReport } from '../../../packages/contracts/src/reports.js';
function cell(value: string | number | null) {
  const text = value === null ? '' : String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(report: OperationsReport) {
  const rows: Array<Array<string | number | null>> = [['record_kind', 'report_id', 'version', 'scope_from', 'scope_to', 'timezone', 'source_cutoff', 'coverage_status', 'truncated', 'app_id', 'app_name', 'source_status', 'watermark', 'query_covered_ms', 'measurement_covered_ms', 'requested_ms', 'request_count', 'server_error_count', 'error_rate', 'alignment_period_seconds', 'metric_caveat', 'excluded_overlaps', 'excluded_alignment', 'snapshot_id', 'query_from', 'query_to', 'interval_status', 'aligned_windows']];
  for (const source of report.sources) {
    const common = [report.id, report.version, report.scope.from, report.scope.to, report.scope.timezone, report.sourceCutoff, report.coverage.status, String(report.coverage.truncated), source.appId, source.name, source.status, source.watermark, source.coveredMs, source.measurementCoveredMs, source.requestedMs];
    const definition = [report.alignmentPeriodSeconds, report.metricCaveat, source.excludedOverlaps, source.excludedAlignment];
    rows.push(['summary', ...common, source.totals.requestCount, source.totals.serverErrorCount, source.totals.errorRate, ...definition, null, null, null, null, null]);
    for (const interval of source.intervals) rows.push(['interval', ...common, interval.requestCount, interval.serverErrorCount, interval.errorRate, ...definition, interval.snapshotId, interval.from, interval.to, interval.status, JSON.stringify(interval.alignedWindows)]);
  }
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
