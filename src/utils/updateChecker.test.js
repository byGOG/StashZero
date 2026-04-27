import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  cleanVersion,
  compareVersions,
  checkForUpdates,
  skipVersion,
  clearSkip,
} from "./updateChecker";
import { SettingKeys, getJSON, getString } from "./settings";

describe("cleanVersion", () => {
  it("strips leading v", () => {
    expect(cleanVersion("v1.2.3")).toBe("1.2.3");
    expect(cleanVersion("V1.2.3")).toBe("1.2.3");
  });

  it("strips pre-release and build metadata", () => {
    expect(cleanVersion("1.2.3-beta.1")).toBe("1.2.3");
    expect(cleanVersion("1.2.3+build.42")).toBe("1.2.3");
  });

  it("trims whitespace", () => {
    expect(cleanVersion("  v1.2.3  ")).toBe("1.2.3");
  });

  it("returns empty for falsy input", () => {
    expect(cleanVersion(null)).toBe("");
    expect(cleanVersion(undefined)).toBe("");
    expect(cleanVersion("")).toBe("");
  });
});

describe("compareVersions", () => {
  it("orders by major/minor/patch", () => {
    expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
    expect(compareVersions("0.3.0", "0.3.1")).toBe(-1);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("treats v-prefix and pre-release as equal", () => {
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2.3-beta", "1.2.3")).toBe(0);
  });

  it("pads short versions with zeros", () => {
    expect(compareVersions("1", "1.0.0")).toBe(0);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });

  it("returns 0 for unparseable input", () => {
    expect(compareVersions("not-a-version", "1.0.0")).toBe(0);
  });
});

describe("skipVersion / clearSkip", () => {
  beforeEach(() => {
    clearSkip();
  });

  it("persists the skipped version", () => {
    skipVersion("0.4.0");
    expect(getString(SettingKeys.updateSkip, "")).toBe("0.4.0");
  });

  it("clears the skipped version", () => {
    skipVersion("0.4.0");
    clearSkip();
    expect(getString(SettingKeys.updateSkip, "")).toBe("");
  });
});

describe("checkForUpdates", () => {
  beforeEach(() => {
    localStorage.clear();
    invoke.mockReset();
  });

  function mockInvokeOk(release) {
    invoke.mockResolvedValueOnce(release);
  }

  function mockInvokeFail() {
    invoke.mockRejectedValueOnce(new Error("network down"));
  }

  function release(over = {}) {
    return {
      version: "v0.4.0",
      name: "StashZero v0.4.0",
      notes: "notes",
      url: "https://github.com/byGOG/StashZero/releases/v0.4.0",
      publishedAt: "2026-01-01",
      ...over,
    };
  }

  it("flags an update when remote version is higher", async () => {
    mockInvokeOk(release());
    const result = await checkForUpdates("0.3.1");
    expect(result.available).toBe(true);
    expect(result.latest).toBe("v0.4.0");
    expect(result.dismissed).toBe(false);
  });

  it("returns available=false when remote matches current", async () => {
    mockInvokeOk(release({ version: "0.3.1" }));
    const result = await checkForUpdates("0.3.1");
    expect(result.available).toBe(false);
  });

  it("marks update as dismissed when user previously skipped that version", async () => {
    mockInvokeOk(release());
    skipVersion("0.4.0");

    const result = await checkForUpdates("0.3.1");
    expect(result.available).toBe(true);
    expect(result.dismissed).toBe(true);
  });

  it("uses cached release on cache hit", async () => {
    mockInvokeOk(release({ version: "v0.4.0" }));
    await checkForUpdates("0.3.1");

    // Cache hit: invoke must NOT be called again.
    const result = await checkForUpdates("0.3.1");

    expect(result.latest).toBe("v0.4.0");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("force=true bypasses cache", async () => {
    mockInvokeOk(release({ version: "v0.4.0" }));
    await checkForUpdates("0.3.1");

    mockInvokeOk(release({ version: "v0.5.0" }));
    const result = await checkForUpdates("0.3.1", { force: true });

    expect(result.latest).toBe("v0.5.0");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("falls back to cache when invoke fails", async () => {
    mockInvokeOk(release({ version: "v0.4.0" }));
    await checkForUpdates("0.3.1");

    mockInvokeFail();
    const result = await checkForUpdates("0.3.1", { force: true });

    expect(result.latest).toBe("v0.4.0");
  });

  it("returns error shape when invoke fails and no cache exists", async () => {
    mockInvokeFail();
    const result = await checkForUpdates("0.3.1");
    expect(result).toEqual({ available: false, error: true });
  });

  it("writes the cache entry on success", async () => {
    mockInvokeOk(release({ version: "v0.4.0" }));
    await checkForUpdates("0.3.1");
    const cache = getJSON(SettingKeys.updateCache, null);
    expect(cache).not.toBeNull();
    expect(cache.release.version).toBe("v0.4.0");
    expect(typeof cache.checkedAt).toBe("number");
  });
});
