import { useEffect } from "react";

export function useKeyboardShortcuts({ searchInputRef, onSelectAll, onStartInstall, onEscape }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          onSelectAll();
        }
        return;
      }
      if (e.key === "F6") {
        e.preventDefault();
        onStartInstall();
        return;
      }
      if (e.key === "Escape") {
        onEscape();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchInputRef, onSelectAll, onStartInstall, onEscape]);
}
