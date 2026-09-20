import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const SANDBOX_OPTIONS = JSON.parse(
  readFileSync(path.join(ROOT, "sandbox-options.json"), "utf8")
);
export const SANDBOX_BY_KEY = Object.fromEntries(SANDBOX_OPTIONS.map(opt => [opt.key, opt]));
export const SANDBOX_BY_ID = Object.fromEntries(SANDBOX_OPTIONS.map(opt => [opt.id, opt]));

function idToLetters(id) {
  const n = Number(id);
  const a = Math.floor(n / 26);
  const b = n % 26;
  return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
}

function lettersToId(pair) {
  const a = pair.charCodeAt(0) - 65;
  const b = pair.charCodeAt(1) - 65;
  return a * 26 + b;
}

function sameValue(a, b) {
  if (a === b) return true;
  if (typeof a === "boolean" || typeof b === "boolean") return Boolean(a) === Boolean(b);
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a) === String(b);
}

function valueIndex(opt, value) {
  const idx = opt.values.findIndex(v => sameValue(v, value));
  if (idx >= 0) return idx;
  const n = Number(value);
  if (Number.isFinite(n)) {
    let best = 0;
    let bestDiff = Infinity;
    opt.values.forEach((v, i) => {
      const diff = Math.abs(Number(v) - n);
      if (diff < bestDiff) {
        best = i;
        bestDiff = diff;
      }
    });
    return best;
  }
  return Math.max(0, opt.values.findIndex(v => sameValue(v, opt.default)));
}

export function sandboxDefaults() {
  const out = {};
  for (const opt of SANDBOX_OPTIONS) out[opt.key] = opt.default;
  return out;
}

export function decodeSandboxCode(code) {
  const values = sandboxDefaults();
  const unknown = [];
  const text = String(code || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!text) return { values, unknown, header: "A", raw: "" };
  const header = text[0] || "A";
  const body = text.slice(1);
  for (let i = 0; i + 2 < body.length; i += 3) {
    const block = body.slice(i, i + 3);
    const id = lettersToId(block.slice(0, 2));
    const valueIdx = block.charCodeAt(2) - 65;
    const opt = SANDBOX_BY_ID[id];
    if (!opt) {
      unknown.push(block);
      continue;
    }
    values[opt.key] = opt.values[Math.max(0, Math.min(opt.values.length - 1, valueIdx))];
  }
  return { values, unknown, header, raw: text };
}

export function encodeSandboxCode(values, { unknown = [], header = "A" } = {}) {
  let out = header || "A";
  const seen = new Set();
  const ordered = [...SANDBOX_OPTIONS].sort((a, b) => a.id - b.id);
  for (const opt of ordered) {
    const value = values?.[opt.key];
    if (value === undefined || sameValue(value, opt.default)) continue;
    const idx = valueIndex(opt, value);
    if (sameValue(opt.values[idx], opt.default)) continue;
    out += idToLetters(opt.id) + String.fromCharCode(65 + idx);
    seen.add(idToLetters(opt.id));
  }
  for (const block of unknown) {
    const pair = String(block || "").toUpperCase().slice(0, 2);
    if (pair.length === 2 && !seen.has(pair) && !SANDBOX_BY_ID[lettersToId(pair)]) {
      out += String(block).toUpperCase().slice(0, 3);
    }
  }
  return out;
}

export function applySandboxPatch(currentCode, patch) {
  const decoded = decodeSandboxCode(currentCode);
  const next = { ...decoded.values, ...(patch || {}) };
  return {
    values: next,
    code: encodeSandboxCode(next, { unknown: decoded.unknown, header: decoded.header })
  };
}

export function optionChoices(opt) {
  return opt.values.map(value => {
    if (typeof value === "boolean") return { value, label: value ? "On" : "Off" };
    if (opt.key === "XPMultiplier" || opt.type === "Float") {
      const n = Number(value);
      if (Number.isFinite(n) && Math.abs(n) <= 20) {
        if (n === 0 && opt.key !== "CropGrowthSpeed") return { value, label: "None / 0%" };
        if (opt.key === "LootRespawnDays" || Number.isInteger(n) && Math.abs(n) >= 4 && n === value) {
          return { value, label: String(value) };
        }
        return { value, label: `${Math.round(n * 100)}%` };
      }
    }
    if (opt.key === "TraderResetInterval" || opt.key === "VendingResetInterval") {
      return { value, label: Number(value) < 0 ? "Default / never override" : `${value} day${Number(value) === 1 ? "" : "s"}` };
    }
    if (opt.key === "LootRespawnDays") {
      return { value, label: Number(value) < 0 ? "Disabled" : `${value} day${Number(value) === 1 ? "" : "s"}` };
    }
    return { value, label: String(value) };
  });
}
