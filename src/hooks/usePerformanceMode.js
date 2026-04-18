import { useEffect, useState } from "react";

const STORAGE_KEY = "stash-zero-perf-mode";

const detectAuto = () => {
  if (typeof window === "undefined") return false;

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return true;

  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;

  const mem = navigator.deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return true;

  return false;
};

export function usePerformanceMode() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "low" || saved === "full" || saved === "auto") return saved;
    return "auto";
  });

  const [autoLow, setAutoLow] = useState(detectAuto);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setAutoLow(detectAuto());
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const lowFx = mode === "low" || (mode === "auto" && autoLow);

  const setModePersist = (next) => {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { mode, setMode: setModePersist, lowFx, autoLow };
}
