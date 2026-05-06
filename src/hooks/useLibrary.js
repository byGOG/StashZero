import { useState, useEffect, useCallback } from "react";
import { LEGENDARY_APPS as LOCAL_APPS } from "../data/library";
import { SettingKeys, getJSON, setJSON } from "../utils/settings";

const LIBRARY_URL = "https://raw.githubusercontent.com/byGOG/StashZero/main/src/data/library.json";
const CACHE_KEY = "stash-zero-library-cache";

const withPath = (list) => list.map(a => (a.path ? a : { ...a, path: a.id }));

export const useLibrary = () => {
  const [apps, setApps] = useState(() => withPath(LOCAL_APPS));
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(() => getJSON(SettingKeys.updateCache, null));

  const updateLibrary = useCallback(async (force = false) => {
    setIsUpdating(true);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && !force) {
        setApps(withPath(JSON.parse(cached)));
      }

      const response = await fetch(LIBRARY_URL, { cache: "no-store" });
      if (response.ok) {
        const remoteApps = await response.json();
        if (remoteApps && Array.isArray(remoteApps)) {
          setApps(withPath(remoteApps));
          localStorage.setItem(CACHE_KEY, JSON.stringify(remoteApps));
          const now = new Date().toISOString();
          setLastUpdate(now);
          setJSON(SettingKeys.updateCache, now);
          console.log("Library updated successfully from GitHub.");
        }
      }
    } catch (err) {
      console.warn("Failed to fetch library from GitHub, using local/cached data.", err);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    // Uygulama açıldığında sessizce güncelle
    updateLibrary();
  }, [updateLibrary]);

  return { apps, isUpdating, lastUpdate, updateLibrary };
};
