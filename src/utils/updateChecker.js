import { invoke } from "@tauri-apps/api/core";
import { SettingKeys, getJSON, setJSON, getString, setString, remove } from "./settings";

const RELEASES_PAGE = "https://github.com/byGOG/StashZero/releases/latest";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function cleanVersion(raw) {
  if (!raw) return "";
  return String(raw).trim().replace(/^v/i, "").split(/[-+]/)[0];
}

function parseVersion(raw) {
  if (!raw) return null;
  const cleaned = cleanVersion(raw);
  const parts = cleaned.split(".").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;
  for (let i = 0; i < 3; i++) {
    if ((va[i] || 0) > (vb[i] || 0)) return 1;
    if ((va[i] || 0) < (vb[i] || 0)) return -1;
  }
  return 0;
}

function readCache() {
  return getJSON(SettingKeys.updateCache, null);
}

function writeCache(payload) {
  setJSON(SettingKeys.updateCache, { ...payload, checkedAt: Date.now() });
}

async function fetchLatestRelease() {
  // Rust tarafında çalışan check_for_update komutu reqwest ile çağrı yapar,
  // timeout/redirect ve User-Agent başlığını yönetir; arızada Err döndürür.
  return await invoke("check_for_update");
}

export async function checkForUpdates(currentVersion, { force = false } = {}) {
  const cache = readCache();
  const fresh = cache && Date.now() - (cache.checkedAt || 0) < CHECK_INTERVAL_MS;

  let release;
  if (!force && fresh && cache.release) {
    release = cache.release;
  } else {
    try {
      const data = await fetchLatestRelease();
      release = {
        version: data.version,
        name: data.name,
        notes: data.notes || "",
        url: data.url || RELEASES_PAGE,
        publishedAt: data.publishedAt,
      };
      writeCache({ release });
    } catch (err) {
      console.warn("Güncelleme kontrolü başarısız:", err);
      if (cache?.release) release = cache.release;
      else return { available: false, error: true };
    }
  }

  const hasUpdate = compareVersions(release.version, currentVersion) > 0;
  const skipped = getString(SettingKeys.updateSkip, "");
  const userSkipped = skipped && compareVersions(skipped, release.version) >= 0;

  return {
    available: hasUpdate,
    dismissed: !!userSkipped,
    current: currentVersion,
    latest: release.version,
    name: release.name,
    notes: release.notes,
    url: release.url || RELEASES_PAGE,
    publishedAt: release.publishedAt,
  };
}

export function skipVersion(version) {
  setString(SettingKeys.updateSkip, version);
}

export function clearSkip() {
  remove(SettingKeys.updateSkip);
}

export { RELEASES_PAGE };
