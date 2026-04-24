import { useCallback, useEffect, useState } from "react";
import { checkForUpdates, skipVersion, clearSkip } from "../utils/updateChecker";

const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
const RECHECK_MS = 6 * 60 * 60 * 1000;

export function useUpdateChecker() {
  const [status, setStatus] = useState({ checking: false, info: null });
  const [visible, setVisible] = useState(false);

  const runCheck = useCallback(async ({ force = false, silent = false } = {}) => {
    setStatus((s) => ({ ...s, checking: true }));
    const info = await checkForUpdates(APP_VERSION, { force });
    setStatus({ checking: false, info });
    if (!silent) {
      if (info?.available && !info.dismissed) setVisible(true);
      else if (force) setVisible(true);
    } else if (info?.available && !info.dismissed) {
      setVisible(true);
    }
    return info;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runCheck({ silent: true }), 4000);
    const interval = setInterval(() => runCheck({ silent: true }), RECHECK_MS);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [runCheck]);

  const dismiss = useCallback(() => setVisible(false), []);

  const skip = useCallback(() => {
    if (status.info?.latest) skipVersion(status.info.latest);
    setVisible(false);
  }, [status.info]);

  const reset = useCallback(() => {
    clearSkip();
  }, []);

  return {
    updateInfo: status.info,
    checking: status.checking,
    visible,
    setVisible,
    dismiss,
    skip,
    reset,
    checkNow: () => runCheck({ force: true, silent: false }),
    currentVersion: APP_VERSION,
  };
}
