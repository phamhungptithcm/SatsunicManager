import { describe, expect, it } from "vitest";
import { beginProgress, immediateProgressSnapshot, progressSnapshot, subscribeProgress, withProgress } from "../../apps/web/src/lib/ui/action-progress";

describe("shared action progress", () => {
  it("keeps concurrent actions pending until each finishes, with idempotent cleanup", () => {
    const first = beginProgress(), second = beginProgress();
    expect(progressSnapshot()).toBe(2);
    first(); first();
    expect(progressSnapshot()).toBe(1);
    second();
    expect(progressSnapshot()).toBe(0);
  });
  it("isolates immediate navigation signals from debounced actions", () => {
    const action = beginProgress();
    expect(immediateProgressSnapshot()).toBe(false);
    const first = beginProgress({ immediate: true });
    const second = beginProgress({ immediate: true });
    expect(immediateProgressSnapshot()).toBe(true);
    first(); first();
    expect(immediateProgressSnapshot()).toBe(true);
    second();
    expect(immediateProgressSnapshot()).toBe(false);
    expect(progressSnapshot()).toBe(1);
    action();
    expect(progressSnapshot()).toBe(0);
  });
  it("cleans up rejected and synchronously throwing operations", async () => {
    await expect(withProgress(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    await expect(withProgress(() => { throw new Error("cancelled"); })).rejects.toThrow("cancelled");
    expect(progressSnapshot()).toBe(0);
  });
  it("removes subscribers and returns operation results", async () => {
    let updates = 0;
    const unsubscribe = subscribeProgress(() => { updates++; });
    expect(await withProgress(async () => 42)).toBe(42);
    expect(updates).toBe(2);
    unsubscribe();
    await withProgress(async () => 1);
    expect(updates).toBe(2);
  });
});
