const GITHUB_REPO = "byGOG/StashZero";
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "stash-zero-update-check";
const SKIP_KEY = "stash-zero-update-skip";

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
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, checkedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

async function fetchLatestRelease() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
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
        version: data.tag_name || data.name,
        name: data.name,
        notes: data.body || "",
        url: data.html_url || RELEASES_PAGE,
        publishedAt: data.published_at,
      };
      writeCache({ release });
    } catch (err) {
      console.warn("Güncelleme kontrolü başarısız:", err);
      if (cache?.release) release = cache.release;
      else return { available: false, error: true };
    }
  }

  const hasUpdate = compareVersions(release.version, currentVersion) > 0;
  const skipped = localStorage.getItem(SKIP_KEY);
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
  try {
    localStorage.setItem(SKIP_KEY, version);
  } catch {
    /* ignore */
  }
}

export function clearSkip() {
  try {
    localStorage.removeItem(SKIP_KEY);
  } catch {
    /* ignore */
  }
}

export { RELEASES_PAGE };
