import { describe, expect, it } from 'vitest';
import { buildOperationsReport, type ReportSnapshot } from '../../functions/src/reports/snapshot';
import { reportCsv } from '../../functions/src/reports/export';
import { generateReportInputSchema } from '../../packages/contracts/src/reports';
const start = Date.parse('2026-10-01T00:00:00.000Z');
const iso = (offset: number) => new Date(start + offset).toISOString();
const hour = 3600000;
function snapshot(id: string, from: number, to: number, count: number | null, at = to): ReportSnapshot {
  return { id: id.repeat(64), value: { scope: { appId: 'hunpeolabs', environment: 'production', from: iso(from), to: iso(to), timezone: 'America/Chicago' }, status: 'complete', fixture: true, queryVersion: 'collector-v1', createdAt: iso(3 * hour), data: [{ appId: 'hunpeolabs', projectId: 'hunpeolabs-prod', services: ['hunpeolabs'], metrics: { status: count === null ? 'empty' : 'available', requestCount: count, serverErrorCount: count === null ? null : 0, errorRate: count ? 0 : null, points: count === null ? [] : [{ at: iso(at), requests: count, errors: 0 }], reason: count === null ? 'no_observations' : null }, provenance: { provider: 'Google Cloud', resourceRef: 'projects/hunpeolabs-prod', queryVersion: 'operations-v1', metricDefinitionVersion: 'cloud-run-requests-v1' }, freshness: { fetchedAt: iso(3 * hour), observedThrough: count === null ? null : iso(at) } }] } };
}
function build(snapshots: ReportSnapshot[], options: { truncated?: boolean; name?: string; to?: number } = {}) {
  return buildOperationsReport({ id: 'f'.repeat(64), version: 1, scope: { appId: 'hunpeolabs', environment: 'production', from: iso(0), to: iso(options.to ?? 2 * hour), timezone: 'America/Chicago' }, cutoff: iso(4 * hour), apps: [{ id: 'hunpeolabs', name: options.name ?? 'HunpeoLabs' }], watermarks: { hunpeolabs: iso(2 * hour) }, snapshots, truncated: options.truncated ?? false, fixture: true });
}
describe('Operations report definition and exact-version CSV', () => {
  it('sums only contiguous disjoint contained hourly measurements; measured zero stays zero', () => {
    const report = build([snapshot('a', 0, hour, 0), snapshot('b', hour, 2 * hour, 20)]);
    expect(report.coverage.status).toBe('complete');
    expect(report.sources[0]!.totals).toEqual({ requestCount: 20, serverErrorCount: 0, errorRate: 0 });
    expect(report.sources[0]!.intervals[0]!.requestCount).toBe(0);
    expect(report.alignmentPeriodSeconds).toBe(3600);
  });
  it('excludes overlapping hourly footprints even when query periods do not overlap', () => {
    // These are genuine one-hour alignment footprints of [0h,1h] and [0.5h,1.5h].
    const report = build([snapshot('a', 0, hour, 10), snapshot('b', hour, 1.5 * hour, 15)]);
    expect(report.sources[0]!.excludedOverlaps).toBe(1);
    expect(report.sources[0]!.intervals).toHaveLength(1);
    expect(report.sources[0]!.totals.requestCount).toBeNull();
    expect(report.coverage.status).toBe('partial');
  });
  it('does not treat empty, missing, truncated, invalid or out-of-scope observations as zero/full totals', () => {
    expect(build([]).sources[0]).toMatchObject({ status: 'missing', totals: { requestCount: null } });
    const empty = build([snapshot('a', 0, hour, null), snapshot('b', hour, 2 * hour, null)]);
    expect(empty.sources[0]).toMatchObject({ status: 'empty', totals: { requestCount: null }, coveredMs: 2 * hour });
    expect(build([snapshot('a', 0, hour, 10)], { truncated: true }).sources[0]!.totals.requestCount).toBeNull();
    const alignedOutside = build([snapshot('a', 0, hour, 10, 0.5 * hour)]);
    expect(alignedOutside.sources[0]).toMatchObject({ status: 'missing', excludedAlignment: 1 });
    const newer = snapshot('a', 0, hour, 10); newer.value.createdAt = iso(5 * hour);
    expect(build([newer]).sources[0]!.intervals).toHaveLength(0);
  });
  it('exports frozen displayed totals and protects formula/quote/newline names', () => {
    const report = build([snapshot('a', 0, hour, 10), snapshot('b', hour, 2 * hour, 20)], { name: ' =SUM(1,2)\n"name"' });
    const csv = reportCsv(report);
    expect(csv).toContain('"\' =SUM(1,2)\n""name"""');
    expect(csv).toContain('"30","0","0"');
    expect(csv).toContain(report.id); expect(csv).not.toContain('actorEmail');
    expect(generateReportInputSchema.safeParse({ scope: report.scope, idempotencyKey: crypto.randomUUID(), sourceUrl: 'https://injected.test' }).success).toBe(false);
  });
  it('rejects mismatched fixture/provenance definitions and requires measurement coverage in addition to query coverage', () => {
    const cases = ['fixture', 'provider', 'queryVersion', 'metricDefinitionVersion'];
    for (const field of cases) {
      const value = snapshot('a', 0, hour, 10);
      if (field === 'fixture') value.value.fixture = false;
      else {
        const rows = value.value.data as Array<{ provenance: Record<string, unknown> }>;
        rows[0]!.provenance[field] = 'unsupported-definition';
      }
      expect(build([value]).sources[0]!.intervals).toHaveLength(0);
    }
    const gap = build([snapshot('a', 0, 2 * hour, 10, hour)]);
    expect(gap.sources[0]).toMatchObject({ coveredMs: 2 * hour, measurementCoveredMs: hour, status: 'partial', totals: { requestCount: null } });
    expect(gap.coverage.status).toBe('partial');
    expect(reportCsv(gap)).toContain('"interval"');
    expect(reportCsv(gap)).toContain('aligned_windows');
  });
});
