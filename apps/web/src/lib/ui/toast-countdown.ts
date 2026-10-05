export type ToastCountdown = ReturnType<typeof createToastCountdown>;

/** A monotonic time budget; overlapping interactions must all end before resuming. */
export function createToastCountdown(
  duration: number,
  onTick: (remaining: number, paused: boolean) => void,
  onExpire: () => void,
  now: () => number = () => performance.now(),
) {
  let remaining = duration;
  let started = now();
  let disposed = false;
  const holds = new Set<string>();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const left = () => Math.max(0, remaining - (holds.size ? 0 : now() - started));
  const clear = () => { clearTimeout(timeout); clearInterval(interval); };
  const expire = () => {
    if (disposed) return;
    disposed = true;
    clear();
    onTick(0, false);
    onExpire();
  };
  const run = () => {
    started = now();
    onTick(remaining, false);
    timeout = setTimeout(expire, remaining);
    interval = setInterval(() => onTick(left(), false), 100);
  };
  run();
  return {
    hold(reason: string, active: boolean) {
      if (disposed || holds.has(reason) === active) return;
      if (active) {
        remaining = left();
        clear();
        holds.add(reason);
        onTick(remaining, true);
      } else {
        holds.delete(reason);
        if (!holds.size) run();
      }
    },
    dispose() { disposed = true; clear(); },
  };
}
