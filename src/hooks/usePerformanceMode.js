import { useEffect, useState } from "react";
import { SettingKeys, getString, setString } from "../utils/settings";

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
    const saved = getString(SettingKeys.perfMode, "auto");
    return saved === "low" || saved === "full" || saved === "auto" ? saved : "auto";
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
    setString(SettingKeys.perfMode, next);
  };

  return { mode, setMode: setModePersist, lowFx, autoLow };
}
