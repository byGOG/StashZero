import { useCallback, useState } from "react";

const HISTORY_LIMIT = 50;

export function useCommandHistory() {
  const [history, setHistory] = useState([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((cmd) => {
    setHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)].slice(0, HISTORY_LIMIT));
    setIndex(-1);
  }, []);

  const navigate = useCallback(
    (direction) => {
      if (history.length === 0) return null;
      let next = index + direction;
      if (next >= history.length) next = history.length - 1;
      if (next < -1) next = -1;
      setIndex(next);
      return next === -1 ? "" : history[next];
    },
    [history, index]
  );

  return { push, navigate };
}
