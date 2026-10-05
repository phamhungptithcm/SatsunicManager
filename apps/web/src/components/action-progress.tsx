"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { beginProgress, immediateProgressSnapshot, progressSnapshot, subscribeProgress } from "../lib/ui/action-progress";

export function PendingNavigation() {
  useEffect(() => beginProgress({ immediate: true }), []);
  return null;
}

export function ActionProgress({ language }: { language: "vi" | "en" }) {
  const count = useSyncExternalStore(subscribeProgress, progressSnapshot, () => 0);
  const immediate = useSyncExternalStore(subscribeProgress, immediateProgressSnapshot, () => false);
  const [visible, setVisible] = useState(false);
  const active = count > 0;
  const shown = immediate || visible;
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(active), active ? 300 : 180);
    return () => window.clearTimeout(timer);
  }, [active]);
  useEffect(() => {
    if (shown) document.documentElement.dataset.actionLoading = "true";
    else delete document.documentElement.dataset.actionLoading;
    return () => { delete document.documentElement.dataset.actionLoading; };
  }, [shown]);
  return shown ? (
    <div className="action-progress" role="progressbar" aria-label={language === "vi" ? "Đang xử lý" : "Working"} aria-busy="true">
      <span />
    </div>
  ) : null;
}
