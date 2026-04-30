import { useEffect, useState } from "react";
import { safeInvoke } from "../utils/tauri";
import { listen } from "@tauri-apps/api/event";

export function useTelemetry({ lowFx }) {
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const merge = (patch) => {
      setSystemInfo((prev) => (prev ? { ...prev, ...patch } : patch));
    };

    // Initial and Slow data still polled or fetched once
    const fetchInitial = async () => {
      const info = await safeInvoke("get_system_info");
      if (!cancelled && info) setSystemInfo(info);
    };

    const fetchSlow = async () => {
      const info = await safeInvoke("get_slow_telemetry");
      if (!cancelled && info) merge(info);
    };

    fetchInitial();

    // Fast data now comes from Rust events
    const unlistenFast = listen("fast-telemetry", (event) => {
      if (!cancelled && document.visibilityState === "visible") {
        merge(event.payload);
      }
    });

    const slowMs = lowFx ? 60000 : 30000;
    const slowTimer = setInterval(() => {
      if (document.visibilityState === "visible") fetchSlow();
    }, slowMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchSlow();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      unlistenFast.then(f => f());
      clearInterval(slowTimer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [lowFx]);

  return [systemInfo, setSystemInfo];
}
