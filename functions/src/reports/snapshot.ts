import { Timestamp } from 'firebase-admin/firestore';
import { monitoringReportSchema } from '../../../packages/contracts/src/monitoring.js';
import { reportSchema, type OperationsReport } from '../../../packages/contracts/src/reports.js';
import { RESOURCE_CATALOG } from '../integrations/resources.js';
import type { Scope } from '../../../packages/contracts/src/index.js';

const verified = new Set(['hunpeolabs', 'satsunicseo', 'satsunicplan']);
const nullTotals = () => ({ requestCount: null, serverErrorCount: null, errorRate: null });
export type ReportSnapshot = { id: string; value: Record<string, unknown> };
export function buildOperationsReport(input: { id: string; version: number; scope: Scope; cutoff: string; apps: readonly { id: string; name: string }[]; watermarks: Record<string, string | null>; snapshots: ReportSnapshot[]; truncated: boolean; fixture: boolean }): OperationsReport {
  const start = Date.parse(input.scope.from); const end = Date.parse(input.scope.to);
  const snapshots = input.snapshots.flatMap(snapshot => {
    const value = snapshot.value;
    const createdAt = value.createdAt instanceof Timestamp ? value.createdAt.toDate().toISOString() : value.createdAt;
    const parsed = monitoringReportSchema.safeParse({ id: snapshot.id, scope: value.scope, status: value.status, data: value.data, fixture: value.fixture, queryVersion: value.queryVersion, createdAt });
    if (!parsed.success || parsed.data.fixture !== input.fixture || parsed.data.status !== 'complete' || Date.parse(parsed.data.createdAt) > Date.parse(input.cutoff)) return [];
    return [parsed.data];
  }).sort((a, b) => Date.parse(a.scope.from) - Date.parse(b.scope.from) || a.id.localeCompare(b.id));
  const sources: OperationsReport['sources'] = input.apps.map(app => {
    const intervals: OperationsReport['sources'][number]['intervals'] = [];
    const footprints: Array<[number, number]> = [];
    let excludedOverlaps = 0; let excludedAlignment = 0;
    for (const snapshot of verified.has(app.id) ? snapshots : []) {
      if (snapshot.scope.appId !== app.id || snapshot.scope.environment !== input.scope.environment) continue;
      const from = Date.parse(snapshot.scope.from); const to = Date.parse(snapshot.scope.to);
      if (from < start || to > end) continue; // Never prorate an interval across report boundaries.
      const row = snapshot.data.find(item => item.appId === app.id);
      const resource = RESOURCE_CATALOG[app.id];
      if (!row || !resource || row.projectId !== resource.projectId || row.provenance.resourceRef !== `projects/${resource.projectId}` || !['available', 'empty'].includes(row.metrics.status)) continue;
      if (row.metrics.status === 'available') {
        const requests = row.metrics.points.reduce((sum, point) => sum + point.requests, 0);
        const errors = row.metrics.points.reduce((sum, point) => sum + point.errors, 0);
        if (row.metrics.points.some(point => !Number.isSafeInteger(point.requests) || !Number.isSafeInteger(point.errors)) || !Number.isSafeInteger(requests) || !Number.isSafeInteger(errors) || requests !== row.metrics.requestCount || errors !== row.metrics.serverErrorCount || errors > requests) continue;
      }
      // Existing metric definition aligns SUM into hourly buckets. Distinct query
      // periods may still contain overlapping buckets: do not sum those twice.
      // Official aggregation contract represents aligned buckets at their end time:
      // https://docs.cloud.google.com/monitoring/api/v3/aggregation
      // startTime is absent in stored observations; use the conservative fixed1h footprint.
      const windows = row.metrics.status === 'available' ? row.metrics.points.map(point => [Date.parse(point.at) - 3600000, Date.parse(point.at)] as [number, number]) : [];
      if (windows.some(([a, b]) => a < start || b > end) || windows.some(([a, b], index) => windows.slice(0, index).some(([c, d]) => a < d && b > c))) { excludedAlignment++; continue; }
      const queryOverlap = intervals.some(interval => from < Date.parse(interval.to) && to > Date.parse(interval.from));
      const bucketOverlap = windows.some(([a, b]) => footprints.some(([c, d]) => a < d && b > c));
      if (queryOverlap || bucketOverlap) { excludedOverlaps++; continue; }
      if (row.metrics.status === 'available' && (!windows.length || row.metrics.requestCount === null || row.metrics.serverErrorCount === null)) continue;
      intervals.push({ snapshotId: snapshot.id, from: snapshot.scope.from, to: snapshot.scope.to, status: row.metrics.status as 'available' | 'empty', alignedWindows: windows.map(([a, b]) => ({ from: new Date(a).toISOString(), to: new Date(b).toISOString() })), ...(row.metrics.status === 'empty' ? nullTotals() : { requestCount: row.metrics.requestCount, serverErrorCount: row.metrics.serverErrorCount, errorRate: row.metrics.errorRate }) });
      footprints.push(...windows);
    }
    const coveredMs = intervals.reduce((sum, interval) => sum + Date.parse(interval.to) - Date.parse(interval.from), 0);
    const contiguous = !input.truncated && intervals.length > 0 && Date.parse(intervals[0]!.from) === start && Date.parse(intervals.at(-1)!.to) === end && intervals.every((interval, index) => index === 0 || Date.parse(interval.from) === Date.parse(intervals[index - 1]!.to));
    const orderedFootprints = footprints.slice().sort(([a], [b]) => a - b);
    const measurementCoveredMs = orderedFootprints.reduce((sum, [a, b]) => sum + b - a, 0);
    const measurementComplete = orderedFootprints.length > 0 && orderedFootprints[0]![0] === start && orderedFootprints.at(-1)![1] === end && orderedFootprints.every(([a], index) => index === 0 || a === orderedFootprints[index - 1]![1]);
    let totals: OperationsReport['sources'][number]['totals'] = nullTotals();
    if (contiguous && measurementComplete && intervals.every(interval => interval.status === 'available')) {
      const requests = intervals.reduce((sum, interval) => sum + interval.requestCount!, 0);
      const errors = intervals.reduce((sum, interval) => sum + interval.serverErrorCount!, 0);
      if (Number.isSafeInteger(requests) && Number.isSafeInteger(errors)) totals = { requestCount: requests, serverErrorCount: errors, errorRate: requests ? errors / requests : null };
    }
    return { appId: app.id, name: app.name, watermark: verified.has(app.id) ? input.watermarks[app.id] ?? null : null, coveredMs, measurementCoveredMs, requestedMs: end - start, totals, intervals, excludedOverlaps, excludedAlignment,
      status: !verified.has(app.id) ? 'not_configured' : !intervals.length ? 'missing' : !contiguous ? 'partial' : intervals.every(interval => interval.status === 'empty') ? 'empty' : intervals.some(interval => interval.status === 'empty') || !measurementComplete ? 'partial' : 'available' };
  });
  const complete = sources.length > 0 && sources.every(source => source.coveredMs === source.requestedMs && ['available', 'empty'].includes(source.status)) && !input.truncated;
  return reportSchema.parse({ id: input.id, version: input.version, scope: input.scope, generatedAt: input.cutoff, sourceCutoff: input.cutoff, definitionVersion: 'operations-report-v1', queryVersion: 'reports-v1', fixture: input.fixture, sources, alignmentPeriodSeconds: 3600, metricCaveat: 'aligned_buckets_not_query_period_totals',
    coverage: { status: complete ? 'complete' : sources.some(source => source.coveredMs > 0) ? 'partial' : 'missing', truncated: input.truncated, snapshotLimit: 200 }, gaps: ['finance', 'analytics', 'incidents', 'email', 'pdf'] });
}
