#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const pkgPath = resolve(root, "package.json");
const cargoPath = resolve(root, "src-tauri", "Cargo.toml");
const confPath = resolve(root, "src-tauri", "tauri.conf.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+([.-].+)?$/.test(version)) {
  console.error(`[sync-version] geçersiz semver: ${version}`);
  process.exit(1);
}

let cargo = readFileSync(cargoPath, "utf8");
const cargoMatch = cargo.match(/^\[package\][\s\S]*?^version\s*=\s*"[^"]+"/m);
if (!cargoMatch) {
  console.error(`[sync-version] Cargo.toml içinde [package] version bulunamadı`);
  process.exit(1);
}
const cargoNext = cargoMatch[0].replace(/version\s*=\s*"[^"]+"/, `version = "${version}"`);
const cargoUpdated = cargo.replace(cargoMatch[0], cargoNext);

const confRaw = readFileSync(confPath, "utf8");
const conf = JSON.parse(confRaw);
const confWasCurrent = conf.version === version;
conf.version = version;

const cargoChanged = cargoUpdated !== cargo;
if (cargoChanged) writeFileSync(cargoPath, cargoUpdated);
if (!confWasCurrent) writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

console.log(
  `[sync-version] ${version} → Cargo.toml ${cargoChanged ? "yazıldı" : "güncel"}, tauri.conf.json ${confWasCurrent ? "güncel" : "yazıldı"}`
);
