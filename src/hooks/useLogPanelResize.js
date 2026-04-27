import { useState, useEffect, useRef, useCallback } from "react";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;

export function useLogPanelResize(initialHeight = 220) {
  const [height, setHeight] = useState(initialHeight);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(initialHeight);

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current) return;
      e.preventDefault();
      const delta = startY.current - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.current + delta));
      setHeight(next);
    };
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = useCallback(
    (e) => {
      isResizing.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    },
    [height]
  );

  return { height, setHeight, startResize };
}
