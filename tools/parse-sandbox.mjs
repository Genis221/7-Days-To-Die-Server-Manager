import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
const dest = process.argv[3];
const raw = readFileSync(src, "utf8");
const options = [];
let category = "General";
for (const line of raw.split(/\n/)) {
  const cat = line.match(/^## Category: (.+?) \(/);
  if (cat) {
    category = cat[1].trim();
    continue;
  }
  if (!line.startsWith("|") || line.includes("Option Name") || /^\|[\s:|-]+\|$/.test(line.trim())) continue;
  const parts = line.split("|").map(s => s.trim());
  parts.shift();
  parts.pop();
  if (parts.length < 6) continue;
  const label = parts[0];
  const key = (parts[1].match(/`([^`]+)`/) || [])[1];
  const idMatch = parts[2].match(/\((\d+)\)/);
  if (!key || idMatch == null) continue;
  const id = Number(idMatch[1]);
  const type = parts[3];
  let def = parts[4];
  if (def === "True") def = true;
  else if (def === "False") def = false;
  else if (def !== "" && !Number.isNaN(Number(def))) def = Number(def);
  const inner = parts[5].replace(/^\[/, "").replace(/\]$/, "");
  const values = [];
  for (const piece of inner.split(",").map(s => s.trim()).filter(Boolean)) {
    if (piece === "True") values.push(true);
    else if (piece === "False") values.push(false);
    else if (!Number.isNaN(Number(piece))) values.push(Number(piece));
    else values.push(piece);
  }
  options.push({ key, label, id, type, default: def, values, category });
}
writeFileSync(dest, JSON.stringify(options, null, 2));
console.log(`Wrote ${options.length} options to ${dest}`);
