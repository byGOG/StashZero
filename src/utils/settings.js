const PREFIX = "stash-zero-";

export const SettingKeys = {
  theme: `${PREFIX}theme`,
  font: `${PREFIX}font`,
  fontSize: `${PREFIX}font-size`,
  cleanup: `${PREFIX}cleanup`,
  sound: `${PREFIX}sound`,
  activeCategory: `${PREFIX}active-category`,
  perfMode: `${PREFIX}perf-mode`,
  musicPlaying: `${PREFIX}music-playing`,
  musicMounted: `${PREFIX}music-mounted`,
  musicPosition: `${PREFIX}music-position`,
  updateCache: `${PREFIX}update-check`,
  updateSkip: `${PREFIX}update-skip`,
};

export const VALID_THEMES = ["aurora", "nebula", "sunset", "mint", "onyx"];

const validators = {
  [SettingKeys.theme]: (v) => (typeof v === "string" && VALID_THEMES.includes(v) ? v : null),
  [SettingKeys.font]: (v) => (typeof v === "string" && v ? v : null),
  [SettingKeys.fontSize]: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 50 && n <= 200 ? n : null;
  },
  [SettingKeys.cleanup]: (v) => (typeof v === "boolean" ? v : null),
  [SettingKeys.sound]: (v) => (typeof v === "boolean" ? v : null),
  [SettingKeys.activeCategory]: (v) => (typeof v === "string" && v ? v : null),
};

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded or storage disabled — ignore */
  }
}

export function getJSON(key, fallback) {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  const validate = validators[key];
  if (validate) {
    const valid = validate(parsed);
    return valid == null ? fallback : valid;
  }
  return parsed;
}

export function setJSON(key, value) {
  const validate = validators[key];
  const normalized = validate ? validate(value) : value;
  if (validate && normalized == null) return false;
  try {
    writeRaw(key, JSON.stringify(normalized ?? value));
    return true;
  } catch {
    return false;
  }
}

export function getString(key, fallback) {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  const validate = validators[key];
  if (validate) {
    const valid = validate(raw);
    return valid == null ? fallback : valid;
  }
  return raw;
}

export function setString(key, value) {
  const validate = validators[key];
  const normalized = validate ? validate(value) : value;
  if (validate && normalized == null) return false;
  writeRaw(key, String(normalized ?? value));
  return true;
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
