import { describe, it, expect } from "vitest";
import {
  SettingKeys,
  VALID_THEMES,
  getJSON,
  setJSON,
  getString,
  setString,
  remove,
} from "./settings";

describe("settings — getJSON/setJSON round-trip", () => {
  it("returns fallback when key is missing", () => {
    expect(getJSON(SettingKeys.cleanup, false)).toBe(false);
    expect(getJSON(SettingKeys.fontSize, 100)).toBe(100);
  });

  it("persists boolean values", () => {
    setJSON(SettingKeys.sound, false);
    expect(getJSON(SettingKeys.sound, true)).toBe(false);
    setJSON(SettingKeys.sound, true);
    expect(getJSON(SettingKeys.sound, false)).toBe(true);
  });

  it("persists numeric values within validator range", () => {
    setJSON(SettingKeys.fontSize, 125);
    expect(getJSON(SettingKeys.fontSize, 100)).toBe(125);
  });

  it("rejects out-of-range numeric values", () => {
    const ok = setJSON(SettingKeys.fontSize, 500);
    expect(ok).toBe(false);
    expect(getJSON(SettingKeys.fontSize, 100)).toBe(100);
  });

  it("falls back when stored value fails validation", () => {
    localStorage.setItem(SettingKeys.cleanup, JSON.stringify("not-a-bool"));
    expect(getJSON(SettingKeys.cleanup, true)).toBe(true);
  });

  it("falls back when stored value is malformed JSON", () => {
    localStorage.setItem(SettingKeys.cleanup, "{not-json");
    expect(getJSON(SettingKeys.cleanup, false)).toBe(false);
  });
});

describe("settings — getString/setString validators", () => {
  it("accepts valid theme values", () => {
    for (const theme of VALID_THEMES) {
      setString(SettingKeys.theme, theme);
      expect(getString(SettingKeys.theme, "aurora")).toBe(theme);
    }
  });

  it("rejects invalid theme and falls back", () => {
    const ok = setString(SettingKeys.theme, "rainbow");
    expect(ok).toBe(false);
    expect(getString(SettingKeys.theme, "aurora")).toBe("aurora");
  });

  it("returns fallback for missing string", () => {
    expect(getString(SettingKeys.font, "inter")).toBe("inter");
  });

  it("activeCategory rejects empty string", () => {
    const ok = setString(SettingKeys.activeCategory, "");
    expect(ok).toBe(false);
  });

  it("activeCategory accepts arbitrary non-empty string", () => {
    setString(SettingKeys.activeCategory, "Web Tarayıcıları");
    expect(getString(SettingKeys.activeCategory, null)).toBe("Web Tarayıcıları");
  });
});

describe("settings — remove", () => {
  it("clears stored value", () => {
    setJSON(SettingKeys.musicMounted, true);
    expect(getJSON(SettingKeys.musicMounted, false)).toBe(true);
    remove(SettingKeys.musicMounted);
    expect(getJSON(SettingKeys.musicMounted, false)).toBe(false);
  });
});
