import { useEffect, useState } from "react";
import { safeInvoke } from "../utils/tauri";

export function useTelemetry({ lowFx }) {
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const merge = (patch) => {
      setSystemInfo((prev) => (prev ? { ...prev, ...patch } : patch));
    };

    const fetchInitial = async () => {
      const info = await safeInvoke("get_system_info");
      if (!cancelled && info) setSystemInfo(info);
    };
    const fetchFast = async () => {
      const info = await safeInvoke("get_fast_telemetry");
      if (!cancelled && info) merge(info);
    };
    const fetchSlow = async () => {
      const info = await safeInvoke("get_slow_telemetry");
      if (!cancelled && info) merge(info);
    };

    const fastMs = lowFx ? 5000 : 2500;
    const slowMs = lowFx ? 60000 : 30000;

    fetchInitial();
    const fastTimer = setInterval(() => {
      if (document.visibilityState === "visible") fetchFast();
    }, fastMs);
    const slowTimer = setInterval(() => {
      if (document.visibilityState === "visible") fetchSlow();
    }, slowMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchFast();
        fetchSlow();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(fastTimer);
      clearInterval(slowTimer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [lowFx]);

  return [systemInfo, setSystemInfo];
}
