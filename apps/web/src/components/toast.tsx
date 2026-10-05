"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createToastCountdown, type ToastCountdown } from "../lib/ui/toast-countdown";
import { Check, X, MessageCircle, TriangleAlert } from "lucide-react";
const glyphs = { check: Check, close: X, comment: MessageCircle, warning: TriangleAlert };
function BlogIcon({name,size}:{name:string;size:number}) { const Icon = glyphs[name as keyof typeof glyphs]; return <Icon size={size}/>; }
const duration = 5000;
export type ToastKind = "info" | "success" | "error" | "warning";
const icons: Record<ToastKind, string> = { info: "comment", success: "check", error: "close", warning: "warning" };
export function useToastNotice() {
  const [notice, update] = useState({ text: "", kind: "info" as ToastKind });
  const setNotice = useCallback((text: string, kind: ToastKind = "info") => update({ text, kind }), []);
  return { notice: notice.text, noticeKind: notice.kind, setNotice };
}
export function BlogToast({ text, kind = "info", onClose, language = "vi", pending = false, actions }: {
  text: string; kind?: ToastKind; onClose: () => void; language?: "vi" | "en";
  pending?: boolean; actions?: ReactNode;
}) {
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const [host, setHost] = useState<Element | null>(null);
  const hasHost = host !== null;
  const timer = useRef<ToastCountdown | null>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const hovered = useRef(false);
  const [clock, setClock] = useState({ remaining: duration, paused: false });
  useEffect(() => {
    const updateHost = () => setHost(document.querySelector("dialog[open]") ?? document.body);
    const frame = requestAnimationFrame(updateHost);
    const observer = new MutationObserver(updateHost);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [text]);
  useEffect(() => {
    if (!hasHost || !text) return;
    const countdown = createToastCountdown(duration, (remaining, paused) => setClock({ remaining, paused }), () => close.current());
    timer.current = countdown;
    countdown.hold("pending", pending);
    countdown.hold("hover", hovered.current);
    countdown.hold("focus", !!element.current?.contains(document.activeElement));
    const visibility = () => countdown.hold("hidden", document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      countdown.dispose();
      timer.current = null;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [hasHost, text, kind, pending]);
  useEffect(() => {
    hovered.current = false;
    timer.current?.hold("hover", false);
    timer.current?.hold("focus", !!element.current?.contains(document.activeElement));
  }, [host]);
  if (!host || !text) return null;
  return createPortal(
    <div ref={element} className="blog-toast" data-kind={kind} data-paused={clock.paused} aria-busy={pending}
      onMouseEnter={() => { hovered.current = true; timer.current?.hold("hover", true); }}
      onMouseLeave={() => { hovered.current = false; timer.current?.hold("hover", false); }}
      onFocusCapture={() => timer.current?.hold("focus", true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) timer.current?.hold("focus", false); }}>
      <span className="blog-toast-icon" aria-hidden="true"><BlogIcon name={icons[kind]} size={19} /></span>
      <div className="blog-toast-content">
        <p role={kind === "error" ? "alert" : "status"} aria-atomic="true">{text}</p>
        {actions && <div className="blog-toast-actions">{actions}</div>}
      </div>
      <div className="blog-toast-controls">
      {!pending && <span className="blog-toast-time" aria-hidden="true" title={language === "en" ? (clock.paused ? "Countdown paused" : "Dismisses automatically") : (clock.paused ? "Đếm ngược đang tạm dừng" : "Tự ẩn thông báo")}>{Math.ceil(clock.remaining / 1000)}s</span>}
      {!pending && <button className="blog-toast-close" type="button" onClick={onClose} aria-label={language === "en" ? "Dismiss notification" : "Ẩn thông báo"} title={language === "en" ? "Dismiss notification" : "Ẩn thông báo"}><BlogIcon name="close" size={15} /></button>}
      </div>
      {!pending && <span className="blog-toast-track" aria-hidden="true"><span style={{ transform: `scaleX(${clock.remaining / duration})` }} /></span>}
    </div>, host,
  );
}
