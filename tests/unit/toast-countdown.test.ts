import { afterEach, describe, expect, it, vi } from "vitest";
import { createToastCountdown } from "../../apps/web/src/lib/ui/toast-countdown";

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const tick = vi.fn(), expire = vi.fn();
  const timer = createToastCountdown(5000, tick, expire, () => Date.now());
  return { timer, tick, expire };
}
describe("toast countdown", () => {
  it("holds the remaining budget on hover and resumes rather than restarting", () => {
    const { timer, tick, expire } = setup();
    vi.advanceTimersByTime(1800);
    timer.hold("hover", true);
    expect(tick).toHaveBeenLastCalledWith(3200, true);
    vi.advanceTimersByTime(10000);
    expect(expire).not.toHaveBeenCalled();
    timer.hold("hover", false);
    vi.advanceTimersByTime(3199);
    expect(expire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(expire).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(expire).toHaveBeenCalledTimes(1);
  });
  it("waits until hover, keyboard focus and hidden-tab holds all end", () => {
    const { timer, expire } = setup();
    vi.advanceTimersByTime(1000);
    timer.hold("hover", true);
    timer.hold("focus", true);
    timer.hold("hidden", true);
    timer.hold("hover", false);
    timer.hold("focus", false);
    vi.advanceTimersByTime(10000);
    expect(expire).not.toHaveBeenCalled();
    timer.hold("hidden", false);
    vi.advanceTimersByTime(4000);
    expect(expire).toHaveBeenCalledTimes(1);
  });
  it("ignores duplicate holds and preserves time through multiple pause cycles", () => {
    const { timer, expire } = setup();
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(1000);
      timer.hold("hover", true);
      timer.hold("hover", true);
      vi.advanceTimersByTime(1000);
      timer.hold("hover", false);
      timer.hold("hover", false);
    }
    vi.advanceTimersByTime(1000);
    expect(expire).toHaveBeenCalledTimes(1);
  });
  it("disposes timers and ignores stale interaction callbacks after unmount", () => {
    const { timer, tick, expire } = setup();
    vi.advanceTimersByTime(1200);
    timer.dispose();
    tick.mockClear();
    timer.hold("hover", true);
    timer.hold("hover", false);
    vi.advanceTimersByTime(10000);
    expect(tick).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("keeps pending operations visible beyond the timeout and resumes after every hold ends", () => {
  const { timer, expire } = setup();
  timer.hold("pending", true);
  vi.advanceTimersByTime(15000);
  timer.hold("hover", true);
  timer.hold("pending", false);
  vi.advanceTimersByTime(10000);
  expect(expire).not.toHaveBeenCalled();
  timer.hold("hover", false);
  vi.advanceTimersByTime(4999);
  expect(expire).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(expire).toHaveBeenCalledOnce();
});
