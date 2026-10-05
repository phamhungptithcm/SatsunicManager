const pending = new Map<symbol, boolean>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const progressSnapshot = () => pending.size;
export const immediateProgressSnapshot = () => [...pending.values()].some(Boolean);
export function subscribeProgress(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function beginProgress({ immediate = false }: { immediate?: boolean } = {}) {
  const token = Symbol();
  pending.set(token, immediate);
  notify();
  return () => {
    if (pending.delete(token)) notify();
  };
}

export async function withProgress<T>(operation: () => Promise<T>): Promise<T> {
  const finish = beginProgress();
  try { return await operation(); }
  finally { finish(); }
}

export function progressFetch(input: RequestInfo | URL, init?: RequestInit) {
  return withProgress(() => fetch(input, init));
}
