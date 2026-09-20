const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INTERVALS = ["30 mins", "1 hr", "2 hrs", "4 hrs", "6 hrs", "12 hrs", "24 hrs"];
const FEATURED_SANDBOX = [
  "XPMultiplier",
  "SkillPointsPerLevel",
  "LootRespawnDays",
  "TraderResetInterval",
  "VendingResetInterval",
  "GlobalLootCount",
  "DayNightLength",
  "DayLightLength",
  "BloodMoonFrequency",
  "BloodMoonEnemyCount",
  "EnemySpawnMode",
  "DropOnDeath",
  "AirDropFrequency"
];

const state = {
  servers: [],
  activity: [],
  activeId: null,
  pollTimer: null,
  saveTimers: new Map(),
  pendingPatches: new Map(),
  openSections: (() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sevendtd-open-sections") || "null");
      if (Array.isArray(raw) && raw.length) return new Set(raw);
    } catch { /* ignore */ }
    return new Set();
  })(),
  busy: new Set(),
  repairPrompted: new Set(),
  consoleSource: null,
  consoleServerId: null,
  panel: localStorage.getItem("sevendtd-panel") === "console" ? "console" : "overview"
};

const workspace = document.getElementById("workspace");
const tabsEl = document.getElementById("tabs");
const toastStack = document.getElementById("toast-stack");
const infoDialog = document.getElementById("info-dialog");
const importDialog = document.getElementById("import-dialog");
const copyDialog = document.getElementById("copy-dialog");
const confirmDialog = document.getElementById("confirm-dialog");
const firewallDialog = document.getElementById("firewall-dialog");
const repairDialog = document.getElementById("repair-dialog");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<p>${escapeHtml(message)}</p>`;
  toastStack.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function activeServer() {
  return state.servers.find(s => s.id === state.activeId) || state.servers[0] || null;
}

function schedulePatch(id, patch) {
  const server = state.servers.find(s => s.id === id);
  if (!server) return;
  if (patch.xml) {
    server.dtd = server.dtd || { xml: {}, sandbox: {} };
    server.dtd.xml = { ...(server.dtd.xml || {}), ...patch.xml };
    server.xml = server.dtd.xml;
  }
  if (patch.sandbox) {
    server.dtd = server.dtd || { xml: {}, sandbox: {} };
    server.dtd.sandbox = { ...(server.dtd.sandbox || {}), ...patch.sandbox };
    server.sandbox = server.dtd.sandbox;
  }
  Object.assign(server, patch);
  if (patch.profile !== undefined) renderTabs();
  const pending = { ...(state.pendingPatches.get(id) || {}), ...patch };
  state.pendingPatches.set(id, pending);
  if (state.saveTimers.has(id)) clearTimeout(state.saveTimers.get(id));
  state.saveTimers.set(id, setTimeout(async () => {
    const body = state.pendingPatches.get(id) || {};
    state.pendingPatches.delete(id);
    try {
      const updated = await api(`/api/servers/${id}`, { method: "PATCH", body });
      const idx = state.servers.findIndex(s => s.id === id);
      if (idx >= 0) state.servers[idx] = { ...state.servers[idx], ...updated };
    } catch (err) {
      toast(err.message, "error");
    }
  }, 500));
}

function statusClass(server) {
  const status = String(server.status || "").toLowerCase();
  const availability = String(server.availability || "").toLowerCase();
  if (status === "updating" || availability.includes("start")) return "starting";
  if (status === "running") return "running";
  return "stopped";
}

function statusDisplay(server) {
  const status = String(server?.status || "").toLowerCase();
  const availability = String(server?.availability || "").toLowerCase();
  if (status === "updating") return { label: "Updating", tone: "warn" };
  if (availability.includes("start") || status.includes("start")) {
    return { label: "Starting…", tone: "warn" };
  }
  if (status === "running") return { label: "Running", tone: "good" };
  return { label: "Offline", tone: "bad" };
}

function availabilityClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "online") return "good";
  if (v.includes("start") || v === "unreachable") return "warn";
  return "bad";
}

function firewallClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "good") return "good";
  if (v.includes("admin") || v.includes("no port")) return "bad";
  return "warn";
}

function renderTabs() {
  const servers = [...state.servers].sort((a, b) => a.order - b.order);
  if (!state.activeId && servers[0]) state.activeId = servers[0].id;
  tabsEl.innerHTML = servers.map(server => `
    <button type="button" class="tab ${statusClass(server)} ${server.id === state.activeId ? "active" : ""}"
      data-id="${server.id}" draggable="true" role="tab" aria-selected="${server.id === state.activeId}">
      <span class="tab-copy">
        <b>${escapeHtml(server.profile || "New Server")}</b>
        <small>${escapeHtml(statusDisplay(server).label)}</small>
      </span>
      <span class="close" data-close="${server.id}" title="Remove">×</span>
    </button>
  `).join("");
}

function dayChecks(name, values) {
  return DAYS.map((day, i) => `
    <label><input type="checkbox" data-field="${name}" data-index="${i}" ${values?.[i] ? "checked" : ""} /> ${day}</label>
  `).join("");
}

function disconnectConsole() {
  if (state.consoleSource) {
    state.consoleSource.close();
    state.consoleSource = null;
  }
  state.consoleServerId = null;
}

function connectConsole(serverId) {
  if (state.consoleServerId === serverId && state.consoleSource) return;
  disconnectConsole();
  state.consoleServerId = serverId;
  const source = new EventSource(`/api/servers/${serverId}/console-stream`);
  state.consoleSource = source;
  source.onmessage = event => {
    try {
      const entry = JSON.parse(event.data);
      appendConsoleLine(entry);
      const el = document.getElementById("console-output");
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  };
  source.onerror = () => {
    const status = document.getElementById("console-live-status");
    if (status) {
      status.dataset.state = "reconnecting";
      const label = status.querySelector("b");
      if (label) label.textContent = "Reconnecting";
    }
  };
  source.onopen = () => {
    const status = document.getElementById("console-live-status");
    if (status) {
      status.dataset.state = "live";
      const label = status.querySelector("b");
      if (label) label.textContent = "Live";
    }
  };
}

function appendConsoleLine(entry) {
  const el = document.getElementById("console-output");
  if (!el) return;
  const empty = el.querySelector(".console-empty");
  if (empty) empty.remove();
  const line = document.createElement("div");
  line.className = `console-line ${entry.level || "info"}`;
  const time = new Date(entry.time || Date.now()).toLocaleTimeString();
  line.innerHTML = `<time>${escapeHtml(time)}</time><span>${escapeHtml(entry.message || "")}</span>`;
  const stick = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.appendChild(line);
  while (el.children.length > 600) el.removeChild(el.firstChild);
  if (stick) el.scrollTop = el.scrollHeight;
}

function playerInitials(name) {
  const parts = String(name || "").trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  const cleaned = String(name || "").replace(/[^A-Za-z0-9]/g, "");
  return (cleaned.slice(0, 2) || "?").toUpperCase();
}

function playerRosterHtml(server) {
  const count = Number(server.players) || 0;
  const list = Array.isArray(server.playersOnline) && server.playersOnline.length
    ? server.playersOnline
    : [];
  if (!count && !list.length) {
    return `<p class="player-empty">Nobody online</p>`;
  }
  if (!list.length) {
    return `<p class="player-empty">${escapeHtml(String(count))} in session</p>`;
  }
  return list.filter(player => {
    const name = String(typeof player === "string" ? player : player?.name || "").trim();
    return name.length >= 2;
  }).map(player => {
    const name = typeof player === "string" ? player : player.name;
    const ping = typeof player === "object" ? Number(player.ping) : NaN;
    const pingHtml = Number.isFinite(ping) && ping > 0
      ? `<span class="player-ping">${escapeHtml(String(Math.round(ping)))}ms</span>`
      : "";
    const hue = [...String(name || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
    return `<div class="player-row">
      <span class="player-avatar" style="--h:${hue}">${escapeHtml(playerInitials(name))}</span>
      <span class="player-name">${escapeHtml(name || "Player")}</span>
      ${pingHtml}
    </div>`;
  }).join("");
}

function rconHint(server) {
  const rcon = server.rcon || {};
  if (rcon.telnet) {
    if (!rcon.hasPassword) return "Set a Telnet password below to send console commands from this panel";
    return "Telnet is enabled — type server commands here (lp, gt, saveworld, shutdown, kick)";
  }
  return "Enable Telnet in Admin settings to send commands from this console";
}

function xmlOf(server) {
  return server.dtd?.xml || server.xml || {};
}

function sandboxOf(server) {
  return server.dtd?.sandbox || server.sandbox || {};
}

function xmlField(server, key) {
  const spec = (state.xmlProperties || []).find(p => p.key === key) || { key, label: key, type: "string" };
  const value = xmlOf(server)[key] ?? spec.def ?? "";
  if (spec.type === "bool") {
    const on = value === true || String(value).toLowerCase() === "true";
    return `<label class="check-line"><input type="checkbox" data-xml="${escapeHtml(key)}" ${on ? "checked" : ""} /> ${escapeHtml(spec.label)}</label>`;
  }
  if (spec.type === "select" && spec.options) {
    const opts = spec.options.map(o => {
      const v = typeof o === "object" ? o.value : o;
      const l = typeof o === "object" ? o.label : o;
      return `<option value="${escapeHtml(v)}" ${String(value) === String(v) ? "selected" : ""}>${escapeHtml(l)}</option>`;
    }).join("");
    return `<label class="field"><span>${escapeHtml(spec.label)}</span><select data-xml="${escapeHtml(key)}">${opts}</select></label>`;
  }
  const extra = spec.type === "int" ? ` type="number"${spec.min != null ? ` min="${spec.min}"` : ""}${spec.max != null ? ` max="${spec.max}"` : ""}` : "";
  return `<label class="field"><span>${escapeHtml(spec.label)}</span><input data-xml="${escapeHtml(key)}"${extra} value="${escapeHtml(value)}" /></label>`;
}

function sandboxField(server, key) {
  const opt = (state.sandboxOptions || []).find(o => o.key === key);
  if (!opt) return "";
  const value = sandboxOf(server)[key] ?? opt.default;
  const dayKeys = new Set(["LootRespawnDays", "TraderResetInterval", "VendingResetInterval"]);
  let values = [...opt.values];
  if (dayKeys.has(key)) {
    values.sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (na < 0 && nb < 0) return na - nb;
      if (na < 0) return -1;
      if (nb < 0) return 1;
      return na - nb;
    });
  }
  if (key === "SkillPointsPerLevel") {
    values = values
      .filter(v => Number(v) >= 1 && Number(v) <= 10)
      .sort((a, b) => Number(a) - Number(b));
  }
  const options = values.map(v => {
    let label = String(v);
    if (typeof v === "boolean") label = v ? "On" : "Off";
    else if (key === "TraderResetInterval" || key === "VendingResetInterval") {
      label = Number(v) < 0 ? "Game default" : `${v} day${Number(v) === 1 ? "" : "s"}`;
    } else if (key === "LootRespawnDays") {
      label = Number(v) < 0 ? "Disabled" : `${v} day${Number(v) === 1 ? "" : "s"}`;
    } else if (opt.type === "Float" || key === "XPMultiplier") {
      const n = Number(v);
      label = n === 0 ? "None" : `${Math.round(n * 100)}%`;
    }
    return `<option value="${escapeHtml(v)}" ${String(value) === String(v) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
  return `<label class="field"><span>${escapeHtml(opt.label)}</span><select data-sandbox="${escapeHtml(key)}">${options}</select></label>`;
}

function xmlGroup(server, group) {
  return (state.xmlProperties || [])
    .filter(p => p.group === group && p.key !== "SandboxCode")
    .map(p => xmlField(server, p.key))
    .join("");
}

function sandboxCategory(server, category) {
  const opts = (state.sandboxOptions || []).filter(o => o.category === category);
  if (!opts.length) return "";
  return opts.map(o => sandboxField(server, o.key)).join("");
}

function staticTile(title, body, extraClass = "") {
  return `<article class="tile tile-static${extraClass ? ` ${extraClass}` : ""}">
    <header class="tile-head">
      <span class="tile-mark" aria-hidden="true"></span>
      <div class="tile-head-copy">
        <p class="tile-kicker">Pinned</p>
        <h2>${title}</h2>
      </div>
    </header>
    <div class="tile-body">${body}</div>
  </article>`;
}

function collapsibleTile(id, title, body) {
  const open = state.openSections.has(id);
  return `<article class="tile collapsible ${open ? "is-open" : ""}" data-section="${id}">
    <button type="button" class="tile-toggle" data-action="toggle-section" data-section="${id}" aria-expanded="${open ? "true" : "false"}">
      <span class="tile-mark" aria-hidden="true"></span>
      <div class="tile-head-copy">
        <p class="tile-kicker">Section</p>
        <h2>${title}</h2>
      </div>
      <span class="tile-chevron" aria-hidden="true"></span>
    </button>
    <div class="tile-body">${body}</div>
  </article>`;
}

function renderServer(server) {
  if (!server) {
    workspace.innerHTML = `<div class="empty-view"><p>No server profiles yet.</p></div>`;
    return;
  }
  const running = String(server.status).toLowerCase() === "running";
  const updating = String(server.status).toLowerCase() === "updating";
  const busy = state.busy.has(server.id) || updating;
  const statusUi = statusDisplay(server);
  const xml = xmlOf(server);
  const panel = state.panel === "console" ? "console" : "overview";
  const featured = FEATURED_SANDBOX.map(key => sandboxField(server, key)).join("");
  const categories = [...new Set((state.sandboxOptions || []).map(o => o.category))];

  workspace.innerHTML = `
    <div class="server-page" data-server-id="${server.id}" data-panel="${panel}">
      <header class="command-bar">
        <label class="field profile-field">
          <span>Server profile</span>
          <input data-field="profile" value="${escapeHtml(server.profile)}" maxlength="80" />
        </label>
        <nav class="panel-nav" aria-label="Workspace">
          <button type="button" class="panel-btn" data-panel="overview">Overview</button>
          <button type="button" class="panel-btn" data-panel="console">Live log</button>
        </nav>
        <div class="controls-row">
          <button type="button" class="btn ${running ? "stop" : "start"}" data-action="toggle" ${busy ? "disabled" : ""}>
            ${running ? "Stop" : "Start"}
          </button>
          <button type="button" class="btn primary" data-action="update" ${busy ? "disabled" : ""}>Update / Verify</button>
        </div>
      </header>

      <section class="panel-view" data-view="overview">
        <div class="hero ${statusUi.tone}">
          <div>
            <p class="hero-kicker">Session</p>
            <h1>${escapeHtml(server.profile)}</h1>
          </div>
          <div class="stats">
            <div class="stats-stack">
              <article class="stat-card ${statusUi.tone}" data-stat="status">
                <span>Status</span>
                <strong>${escapeHtml(statusUi.label)}</strong>
              </article>
              <article class="stat-card ${availabilityClass(server.availability)}" data-stat="availability">
                <span>Availability</span>
                <strong>${escapeHtml(server.availability || "Offline")}</strong>
              </article>
              <article class="stat-card ${firewallClass(server.firewallStatus)}" data-stat="firewall">
                <span>Firewall</span>
                <strong>${escapeHtml(server.firewallStatus || "Not Checked")}</strong>
              </article>
            </div>
            <article class="stat-card players-card ${Number(server.players) > 0 ? "good" : ""}" data-stat="players">
              <span>Players</span>
              <strong>${Number(server.players) || 0} / ${Number(server.maxPlayers) || 8}</strong>
              <div class="player-roster">${playerRosterHtml(server)}</div>
            </article>
          </div>
        </div>
        <div class="overview-stack">
          <div class="overview-pin">
            ${staticTile("Install", `
              <label class="field">
                <span>Installed Version</span>
                <input data-field="version" value="${escapeHtml(server.version || "")}" readonly />
              </label>
              <div class="field">
                <span class="field-label">Install Location</span>
                <div class="path-row">
                  <input class="inline-input" data-field="install" value="${escapeHtml(server.install || "")}" placeholder="C:\\7DTDDedicatedServer or ...\\7DaysToDieServer.exe" />
                  <button type="button" class="btn secondary" data-action="attach-install">Attach</button>
                </div>
              </div>
              ${server.exe ? `<p class="field-hint">Running: ${escapeHtml(server.exe)}</p>` : `<p class="field-hint">Point this at the folder that contains 7DaysToDieServer.exe, then Attach.</p>`}
              <label class="field">
                <span>Launch Arguments</span>
                <input data-field="launchArgs" value="${escapeHtml(server.launchArgs || "")}" placeholder="-logfile logs\\output_log.txt -quit -batchmode -nographics -configfile=manager-serverconfig.xml -dedicated" />
              </label>
            `)}
            ${staticTile("SteamCMD", `
              <div class="field">
                <span class="field-label">SteamCMD folder</span>
                <input class="inline-input" data-field="steamcmd" value="${escapeHtml(server.steamcmd || "")}" placeholder="C:\\Users\\...\\Documents\\SteamCMD" />
              </div>
              <label class="field">
                <span>Steam branch (empty = stable, or latest_experimental / a pinned beta)</span>
                <input data-field="steamBranch" value="${escapeHtml(server.steamBranch || "")}" placeholder="leave empty for stable" />
              </label>
              <div class="action-row">
                <button type="button" class="btn primary" data-action="download-steamcmd">Download SteamCMD</button>
              </div>
            `)}
            ${staticTile("Gameplay highlights", `
              <p class="field-hint">These write into SandboxCode for V3+ and also keep legacy V2 xml fields (XP %, loot respawn days, etc). Shop restock is Trader Reset Interval.</p>
              ${featured}
              <label class="field"><span>SandboxCode</span><input data-xml="SandboxCode" value="${escapeHtml(xml.SandboxCode || "")}" /></label>
            `, "tile-wide")}
          </div>
          <div class="overview-extras">
            ${collapsibleTile("identity", "Identity", xmlGroup(server, "Identity"))}
            ${collapsibleTile("network", "Network & ports", `
              <p class="field-hint">Game port default 26900. Windows Firewall opens UDP/TCP on that port plus UDP +1 and +2, and TCP telnet. Forward those later for internet play. This manager uses TCP 3240.</p>
              ${xmlGroup(server, "Network")}
            `)}
            ${collapsibleTile("slots", "Slots", xmlGroup(server, "Slots"))}
            ${collapsibleTile("shutdown", "Shutdown / restart", `
              <div class="day-row">${dayChecks("shutdownDays", server.shutdownDays)}</div>
              <label class="field"><span>Shutdown at</span><input type="time" data-field="shutdownTime" value="${escapeHtml(toTimeInput(server.shutdownTime))}" /></label>
              <label class="check-line"><input type="checkbox" data-field="performUpdate" ${server.performUpdate ? "checked" : ""} /> Perform update</label>
              <label class="check-line"><input type="checkbox" data-field="thenRestart" ${server.thenRestart ? "checked" : ""} /> Then restart</label>
            `)}
            ${collapsibleTile("autostart", "Automatic start", `
              <div class="day-row">${dayChecks("autostartDays", server.autostartDays)}</div>
              <label class="field"><span>Start Server at</span><input type="time" data-field="autostartTime" value="${escapeHtml(toTimeInput(server.autostartTime))}" /></label>
              <label class="check-line"><input type="checkbox" data-field="autostartUpdate" ${server.autostartUpdate ? "checked" : ""} /> Update before start</label>
            `)}
            ${collapsibleTile("mods", "Mods", `
              <p class="field-hint">From any PC: click Add mod and pick a .zip on that computer. It uploads into this dedicated server's Mods folder (Mods\\YourModName\\). Folder mods should be zipped first.</p>
              <div class="config-file-list" id="mod-file-list"><p class="field-hint">Loading…</p></div>
              <input type="file" id="mod-file-upload" class="hidden" accept=".zip,application/zip" />
              <div class="action-row config-add-actions">
                <button type="button" class="btn primary" data-action="mod-file-add">Add mod</button>
                <button type="button" class="btn secondary" data-action="mod-open-folder">Open Mods folder</button>
              </div>
            `)}
            ${collapsibleTile("admin", "Admin / telnet / dashboard", xmlGroup(server, "Admin"))}
            ${collapsibleTile("world", "World save", xmlGroup(server, "World") + xmlGroup(server, "Folders"))}
            ${collapsibleTile("rules", "Remaining xml rules", xmlGroup(server, "Rules") + xmlGroup(server, "Security"))}
            ${collapsibleTile("performance", "Performance", xmlGroup(server, "Performance"))}
            ${collapsibleTile("claims", "Land claims", xmlGroup(server, "Land claims"))}
            ${collapsibleTile("mesh", "Dynamic mesh", xmlGroup(server, "Dynamic mesh") + xmlGroup(server, "Twitch"))}
            ${collapsibleTile("backups", "World backups", `
              <label class="field">
                <span>Interval</span>
                <select data-field="autoBackupInterval">
                  ${INTERVALS.map(v => `<option value="${v}" ${server.autoBackupInterval === v ? "selected" : ""}>${v}</option>`).join("")}
                </select>
              </label>
              <label class="field">
                <span>Keep last N backups</span>
                <input type="number" min="10" max="100" data-field="backupLimit" value="${escapeHtml(server.backupLimit || "10")}" />
              </label>
              <div class="field">
                <span class="field-label">Backup Folder</span>
                <input class="inline-input" data-field="autoBackupDest" value="${escapeHtml(server.autoBackupDest || "")}" />
              </div>
              <div class="action-row">
                <button type="button" class="btn primary" data-action="backup" ${server.backupInProgress ? "disabled" : ""}>Backup Now</button>
                <label class="check-line"><input type="checkbox" data-field="autoBackupEnabled" ${server.autoBackupEnabled ? "checked" : ""} /> Enable Auto Backup</label>
              </div>
            `)}
            ${collapsibleTile("config-files", "Config files", `
              <p class="field-hint">Files in the dedicated server folder. Green means the file is on disk. manager-serverconfig.xml is what this panel writes so Steam updates do not wipe settings.</p>
              <div class="config-file-list" id="config-file-list"><p class="field-hint">Loading…</p></div>
              <div class="config-add-row">
                <label class="field">
                  <span>Add file</span>
                  <select id="config-file-preset">
                    <option value="">Choose a file…</option>
                    <option value="manager-serverconfig.xml">manager-serverconfig.xml</option>
                    <option value="serverconfig.xml">serverconfig.xml</option>
                    <option value="serveradmin.xml">serveradmin.xml</option>
                    <option value="startdedicated.bat">startdedicated.bat</option>
                    <option value="__custom">Custom filename…</option>
                  </select>
                </label>
                <label class="field config-custom-name hidden" id="config-custom-wrap">
                  <span>Filename</span>
                  <input id="config-file-name" placeholder="MyMod.ini" />
                </label>
                <label class="field">
                  <span>Copy from path (optional)</span>
                  <input id="config-file-source" placeholder="C:\\path\\to\\Engine.ini" />
                </label>
                <div class="action-row config-add-actions">
                  <button type="button" class="btn primary" data-action="config-file-add">Add to server</button>
                </div>
              </div>
              <div class="field">
                <span class="field-label">Game Log Location</span>
                <input class="inline-input" data-field="logLocation" value="${escapeHtml(server.logLocation || "")}" />
              </div>
              <div class="field">
                <span class="field-label">Update Log Location</span>
                <input class="inline-input" data-field="updateLogLocation" value="${escapeHtml(server.updateLogLocation || "")}" />
              </div>
            `)}
            ${categories.map(cat => collapsibleTile(`sandbox-${cat}`, `Sandbox: ${cat}`, sandboxCategory(server, cat))).join("")}
          </div>
        </div>
      </section>

      <section class="panel-view" data-view="console">
        <section class="console-panel">
          <div class="console-toolbar">
            <strong class="console-title">Live log</strong>
            <div class="console-live-status" id="console-live-status" data-state="live"><i></i><b>Live</b></div>
            <span class="console-hint">${escapeHtml(rconHint(server))}</span>
            <div class="console-tools">
              <button type="button" class="btn secondary" data-action="console-clear">Clear</button>
            </div>
          </div>
          <div class="console-output" id="console-output"><div class="console-empty">Live 7 Days to Die log output will appear here…</div></div>
          <form class="console-command" id="console-form">
            <input id="console-input" type="text" autocomplete="off" spellcheck="false" placeholder="Command notes appear in this log" />
            <button type="submit" class="btn primary">Send</button>
          </form>
        </section>
      </section>
    </div>
  `;

  connectConsole(server.id);
  loadConfigFiles(server);
  loadModFiles(server);
}

function configFileListHtml(files, folder) {
  if (!Array.isArray(files) || !files.length) {
    return `<p class="field-hint">${folder ? escapeHtml(folder) : "No config folder yet."}</p>`;
  }
  const rows = files.map(file => {
    const present = Boolean(file.exists);
    const meta = present
      ? `${escapeHtml(file.sizeLabel || "0 B")}`
      : "Not on disk";
    const actions = present
      ? `<button type="button" class="btn secondary" data-action="config-file-open" data-name="${escapeHtml(file.name)}">Open</button>
         <button type="button" class="btn danger" data-action="config-file-delete" data-name="${escapeHtml(file.name)}">Delete</button>`
      : `<button type="button" class="btn primary" data-action="config-file-create" data-name="${escapeHtml(file.name)}">Add</button>`;
    return `<div class="config-file-row ${present ? "is-present" : "is-missing"}">
      <span class="config-file-status" title="${present ? "On disk" : "Missing"}"></span>
      <div class="config-file-meta">
        <b>${escapeHtml(file.name)}</b>
        <small>${meta}</small>
      </div>
      <div class="config-file-actions">${actions}</div>
    </div>`;
  }).join("");
  return `${rows}<p class="field-hint">${escapeHtml(folder || "")}</p>`;
}

async function loadConfigFiles(server) {
  const el = document.getElementById("config-file-list");
  if (!el || !server) return;
  if (!server.install) {
    el.innerHTML = `<p class="field-hint">Attach an install folder first.</p>`;
    return;
  }
  try {
    const data = await api(`/api/servers/${server.id}/config-files`);
    el.innerHTML = configFileListHtml(data.files || [], data.folder);
  } catch (err) {
    el.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function loadModFiles(server) {
  const el = document.getElementById("mod-file-list");
  if (!el || !server) return;
  if (!server.install) {
    el.innerHTML = `<p class="field-hint">Attach an install folder first.</p>`;
    return;
  }
  try {
    const data = await api(`/api/servers/${server.id}/mods`);
    const files = data.files || [];
    if (!files.length) {
      el.innerHTML = `<p class="field-hint">Mods folder is ready. Add a .zip from this PC.<br>${escapeHtml(data.folder || "")}</p>`;
      return;
    }
    el.innerHTML = files.map(file => `
      <div class="config-file-row is-present">
        <span class="config-file-status" title="On disk"></span>
        <div class="config-file-meta">
          <b>${escapeHtml(file.name)}</b>
          <small>${escapeHtml(file.sizeLabel || "0 B")}</small>
        </div>
        <div class="config-file-actions">
          <button type="button" class="btn danger" data-action="mod-file-delete" data-name="${escapeHtml(file.name)}">Delete</button>
        </div>
      </div>
    `).join("") + `<p class="field-hint">${escapeHtml(data.folder || "")}</p>`;
  } catch (err) {
    el.innerHTML = `<p class="field-hint">${escapeHtml(err.message)}</p>`;
  }
}

async function addConfigFileFromForm(server, name) {
  const preset = document.getElementById("config-file-preset");
  const custom = document.getElementById("config-file-name");
  const source = document.getElementById("config-file-source");
  const chosen = String(name || (preset?.value === "__custom" ? custom?.value : preset?.value) || "").trim();
  if (!chosen || chosen === "__custom") {
    toast("Choose or type a config filename", "error");
    return;
  }
  await api(`/api/servers/${server.id}/config-files`, {
    method: "POST",
    body: { name: chosen, source: String(source?.value || "").trim() }
  });
  toast(`Added ${chosen}`, "success");
  if (source) source.value = "";
  await loadConfigFiles(server);
}

function toTimeInput(value) {
  const text = String(value || "09:00");
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
}

function fromTimeInput(value) {
  return String(value || "09:00").slice(0, 5);
}

function meterLevel(percent) {
  const n = Number(percent);
  if (!Number.isFinite(n)) return "";
  if (n >= 90) return "hot";
  if (n >= 75) return "warn";
  return "";
}

function updateHostMeters(resources) {
  const cpuLabel = document.getElementById("host-cpu-label");
  const cpuBar = document.getElementById("host-cpu-bar");
  const cpuDetail = document.getElementById("host-cpu-detail");
  const ramLabel = document.getElementById("host-ram-label");
  const ramBar = document.getElementById("host-ram-bar");
  const ramDetail = document.getElementById("host-ram-detail");
  const cpuMeter = document.querySelector('.host-meter[data-meter="cpu"]');
  const ramMeter = document.querySelector('.host-meter[data-meter="ram"]');
  if (!cpuLabel || !resources) return;

  const cpu = resources.cpuPercent;
  const cpuBits = [];
  if (cpu == null || !Number.isFinite(Number(cpu))) {
    cpuBits.push("…");
    if (cpuBar) cpuBar.style.width = "0%";
    if (cpuMeter) cpuMeter.dataset.level = "";
  } else {
    const pct = Math.max(0, Math.min(100, Number(cpu)));
    cpuBits.push(`${pct.toFixed(pct >= 10 ? 0 : 1)}%`);
    if (cpuBar) cpuBar.style.width = `${pct}%`;
    if (cpuMeter) cpuMeter.dataset.level = meterLevel(pct);
  }
  if (resources.cpuCores) cpuBits.push(`${resources.cpuCores}c`);
  if (resources.cpuGhzLabel) cpuBits.push(resources.cpuGhzLabel);
  cpuLabel.textContent = cpuBits.join(" · ");
  if (cpuDetail) cpuDetail.textContent = resources.cpuModel || "—";

  const ramPct = Number(resources.ramUsedPercent);
  const ramBits = [];
  if (Number.isFinite(ramPct)) {
    ramBits.push(`${ramPct.toFixed(ramPct >= 10 ? 0 : 1)}%`);
    if (ramBar) ramBar.style.width = `${Math.max(0, Math.min(100, ramPct))}%`;
    if (ramMeter) ramMeter.dataset.level = meterLevel(ramPct);
  }
  if (resources.ramMhzLabel) ramBits.push(resources.ramMhzLabel);
  ramLabel.textContent = ramBits.join(" · ") || "—";
  if (ramDetail) {
    ramDetail.textContent = [
      resources.ramUsedLabel ? `${resources.ramUsedLabel} used` : "",
      resources.ramFreeLabel ? `${resources.ramFreeLabel} free` : "",
      resources.ramTotalLabel ? `${resources.ramTotalLabel} total` : "",
      resources.ramMhzLabel
    ].filter(Boolean).join(" · ") || "—";
  }
  fillHostSpecs(resources);
}

function updateStartWithWindows(host) {
  const wrap = document.getElementById("host-startup-wrap");
  const box = document.getElementById("btn-start-with-windows");
  if (!wrap || !box) return;
  const win = String(host?.platform || "").toLowerCase() === "win32";
  wrap.hidden = !win;
  if (win) box.checked = host?.startWithWindows !== false;
}

function fillHostSpecs(resources) {
  const cpuEl = document.getElementById("info-cpu");
  const ramEl = document.getElementById("info-ram");
  if (!cpuEl || !ramEl) return;
  const src = resources || window.__dtdHost?.resources || {};
  cpuEl.textContent = [src.cpuModel, src.cpuGhzLabel, src.cpuCores ? `${src.cpuCores} cores` : ""]
    .filter(Boolean)
    .join(" · ") || "—";
  ramEl.textContent = [
    src.ramUsedLabel ? `${src.ramUsedLabel} used` : "",
    src.ramFreeLabel ? `${src.ramFreeLabel} free` : "",
    src.ramTotalLabel ? `${src.ramTotalLabel} total` : "",
    src.ramMhzLabel
  ].filter(Boolean).join(" · ") || "—";
}

function render() {
  renderTabs();
  renderServer(activeServer());
}

async function refreshState({ silent = false } = {}) {
  try {
    const data = await api("/api/state");
    const prevFocus = document.activeElement;
    const focusKey = prevFocus?.dataset?.sandbox
      ? `${prevFocus.closest("[data-server-id]")?.dataset.serverId}:sandbox:${prevFocus.dataset.sandbox}`
      : prevFocus?.dataset?.xml
      ? `${prevFocus.closest("[data-server-id]")?.dataset.serverId}:xml:${prevFocus.dataset.xml}`
      : prevFocus?.dataset?.field
      ? `${prevFocus.closest("[data-server-id]")?.dataset.serverId}:${prevFocus.dataset.field}:${prevFocus.dataset.index ?? ""}`
      : null;
    const selectionStart = prevFocus?.selectionStart;
    const selectionEnd = prevFocus?.selectionEnd;

    state.servers = data.servers || [];
    state.activity = data.activity || [];
    state.sandboxOptions = data.sandboxOptions || state.sandboxOptions || [];
    state.xmlProperties = data.xmlProperties || state.xmlProperties || [];
    window.__dtdHost = data.host || null;
    updateHostMeters(data.host?.resources);
    updateStartWithWindows(data.host);
    if (!state.servers.find(s => s.id === state.activeId)) {
      state.activeId = state.servers[0]?.id || null;
    }

    // Keep the live console mounted — only refresh chrome/stats on poll
    const page = workspace.querySelector(`[data-server-id="${state.activeId}"]`);
    const consoleMounted = Boolean(page && document.getElementById("console-output"));
    if (consoleMounted || (focusKey && prevFocus && ["INPUT", "SELECT", "TEXTAREA"].includes(prevFocus.tagName))) {
      renderTabs();
      updateLiveStats(activeServer());
      const hint = document.querySelector(".console-hint");
      if (hint && activeServer()) hint.textContent = rconHint(activeServer());
      if (state.activeId) connectConsole(state.activeId);
    } else {
      render();
    }

    if (focusKey) {
      const [id, field, index] = focusKey.split(":");
      const el = workspace.querySelector(
        field === "sandbox"
          ? `[data-server-id="${id}"] [data-sandbox="${index}"]`
          : field === "xml"
          ? `[data-server-id="${id}"] [data-xml="${index}"]`
          : index !== ""
          ? `[data-server-id="${id}"] [data-field="${field}"][data-index="${index}"]`
          : `[data-server-id="${id}"] [data-field="${field}"]`
      );
      if (el) {
        el.focus();
        if (typeof selectionStart === "number" && el.setSelectionRange) {
          try { el.setSelectionRange(selectionStart, selectionEnd); } catch { /* ignore */ }
        }
      }
    }
  } catch (err) {
    if (!silent) {
      workspace.innerHTML = `<div class="empty-view"><p>Could not reach manager API.<br>${escapeHtml(err.message)}</p></div>`;
    }
  }
}

function setStatTone(card, tone) {
  if (!card) return;
  card.classList.remove("good", "warn", "bad");
  if (tone) card.classList.add(tone);
}

function updateLiveStats(server) {
  if (!server) return;
  const page = workspace.querySelector(`[data-server-id="${server.id}"]`);
  if (!page) return;
  const cards = {
    status: page.querySelector("[data-stat='status']"),
    availability: page.querySelector("[data-stat='availability']"),
    players: page.querySelector("[data-stat='players']"),
    firewall: page.querySelector("[data-stat='firewall']")
  };
  const updating = String(server.status).toLowerCase() === "updating";
  const busy = state.busy.has(server.id) || updating;
  const running = String(server.status).toLowerCase() === "running";
  const playerCount = Number(server.players) || 0;
  const statusUi = statusDisplay(server);

  if (cards.status) {
    const strong = cards.status.querySelector("strong");
    if (strong) strong.textContent = statusUi.label;
    setStatTone(cards.status, statusUi.tone);
  }
  if (cards.availability) {
    const strong = cards.availability.querySelector("strong");
    if (strong) strong.textContent = server.availability || "Offline";
    setStatTone(cards.availability, availabilityClass(server.availability));
  }
  if (cards.players) {
    const strong = cards.players.querySelector("strong");
    if (strong) strong.textContent = `${playerCount} / ${Number(server.maxPlayers) || 8}`;
    setStatTone(cards.players, playerCount > 0 ? "good" : "");
    const roster = cards.players.querySelector(".player-roster");
    if (roster) roster.innerHTML = playerRosterHtml(server);
  }
  if (cards.firewall) {
    const strong = cards.firewall.querySelector("strong");
    if (strong) strong.textContent = server.firewallStatus || "Not Checked";
    setStatTone(cards.firewall, firewallClass(server.firewallStatus));
  }

  const toggle = page.querySelector("[data-action='toggle']");
  if (toggle) {
    toggle.textContent = running ? "Stop" : "Start";
    toggle.classList.toggle("stop", running);
    toggle.classList.toggle("start", !running);
    toggle.disabled = busy;
  }
  const updateBtn = page.querySelector("[data-action='update']");
  if (updateBtn) updateBtn.disabled = busy;
  renderTabs();
  maybePromptRepair(server);
}

async function askRepairConsent(server) {
  return new Promise(resolve => {
    const message = document.getElementById("repair-message");
    if (message) {
      message.textContent =
        `SteamCMD reported app state 0x6 for "${server.profile}". Repair deletes the install except UserData, Mods, logs, and manager-serverconfig.xml, then redownloads.`;
    }
    repairDialog.showModal();
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    function cleanup() {
      repairDialog.close();
      document.getElementById("repair-ok").removeEventListener("click", onOk);
      document.getElementById("repair-cancel").removeEventListener("click", onCancel);
    }
    document.getElementById("repair-ok").addEventListener("click", onOk);
    document.getElementById("repair-cancel").addEventListener("click", onCancel);
  });
}

async function maybePromptRepair(server) {
  if (!server) return;
  if (!server.needsRepair || server.updating) {
    if (!server.needsRepair) state.repairPrompted.delete(server.id);
    return;
  }
  if (state.repairPrompted.has(server.id) || repairDialog?.open) return;
  state.repairPrompted.add(server.id);
  const ok = await askRepairConsent(server);
  if (!ok) return;
  state.repairPrompted.delete(server.id);
  toast("Repair & redownload started — watch the Console", "success");
  connectConsole(server.id);
  await api(`/api/servers/${server.id}/update`, { method: "POST", body: { repair: true } });
  await refreshState({ silent: true });
}

async function confirmDanger(title, message, okLabel = "Delete") {
  return new Promise(resolve => {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    const okBtn = document.getElementById("confirm-ok");
    const previousLabel = okBtn.textContent;
    okBtn.textContent = okLabel;
    confirmDialog.showModal();
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    function cleanup() {
      confirmDialog.close();
      okBtn.textContent = previousLabel;
      okBtn.removeEventListener("click", onOk);
      document.getElementById("confirm-cancel").removeEventListener("click", onCancel);
    }
    okBtn.addEventListener("click", onOk);
    document.getElementById("confirm-cancel").addEventListener("click", onCancel);
  });
}

async function confirmDelete(server) {
  return confirmDanger(
    "Delete Server Profile",
    `Delete profile "${server.profile}"? This does not delete server files on disk.`
  );
}

async function askFirewallConsent(server) {
  return new Promise(resolve => {
    const message = document.getElementById("firewall-message");
    if (message) {
      message.textContent =
        `Allow 7 Days To Die Server Manager to add Windows firewall rules for "${server.profile}" (game UDP/TCP, UDP +1/+2, and telnet) when this server starts? Choose "Allow & start" once and you will not be asked again for this profile.`;
    }
    firewallDialog.showModal();
    const onAllow = () => { cleanup(); resolve("allow"); };
    const onSkip = () => { cleanup(); resolve("skip"); };
    const onCancel = () => { cleanup(); resolve("cancel"); };
    function cleanup() {
      firewallDialog.close();
      document.getElementById("firewall-allow").removeEventListener("click", onAllow);
      document.getElementById("firewall-skip").removeEventListener("click", onSkip);
      document.getElementById("firewall-cancel").removeEventListener("click", onCancel);
    }
    document.getElementById("firewall-allow").addEventListener("click", onAllow);
    document.getElementById("firewall-skip").addEventListener("click", onSkip);
    document.getElementById("firewall-cancel").addEventListener("click", onCancel);
  });
}

async function startServerWithFirewallPrompt(server) {
  let applyFirewall = Boolean(server.firewallAutoApproved);
  if (!applyFirewall) {
    const choice = await askFirewallConsent(server);
    if (choice === "cancel") return false;
    applyFirewall = choice === "allow";
    // skip / allow both leave approved only when allow — skip asks again next start
  }
  await withBusy(server.id, async () => {
    await api(`/api/servers/${server.id}/start`, {
      method: "POST",
      body: { applyFirewall }
    });
  });
  if (applyFirewall) {
    server.firewallAutoApproved = true;
    toast("Approve the Windows admin prompt if it appears — firewall rules will auto-apply after that", "success");
  }
  return true;
}

async function withBusy(id, fn) {
  state.busy.add(id);
  render();
  try {
    return await fn();
  } finally {
    state.busy.delete(id);
    await refreshState({ silent: true });
  }
}

async function validatePath(field, label) {
  const server = activeServer();
  if (!server) return;
  const value = String(server[field] || "").trim();
  if (!value) {
    toast(`Enter a ${label} path first`, "error");
    return;
  }
  try {
    const result = await api("/api/path/validate", { method: "POST", body: { path: value } });
    if (result.exists) toast(`${label} path is valid`, "success");
    else toast(`${label} path was not found on this machine`, "error");
  } catch (err) {
    toast(err.message, "error");
  }
}

tabsEl.addEventListener("click", async event => {
  const closeId = event.target.closest("[data-close]")?.dataset.close;
  if (closeId) {
    event.stopPropagation();
    const server = state.servers.find(s => s.id === closeId);
    if (!server) return;
    if (!(await confirmDelete(server))) return;
    try {
      await api(`/api/servers/${closeId}`, { method: "DELETE" });
      if (state.activeId === closeId) state.activeId = null;
      toast(`Deleted ${server.profile}`);
      await refreshState();
    } catch (err) {
      toast(err.message, "error");
    }
    return;
  }
  const tab = event.target.closest(".tab");
  if (!tab) return;
  state.activeId = tab.dataset.id;
  render();
});

let dragId = null;
tabsEl.addEventListener("dragstart", event => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  dragId = tab.dataset.id;
  event.dataTransfer.effectAllowed = "move";
});
tabsEl.addEventListener("dragover", event => {
  event.preventDefault();
});
tabsEl.addEventListener("drop", async event => {
  event.preventDefault();
  const tab = event.target.closest(".tab");
  if (!tab || !dragId || dragId === tab.dataset.id) return;
  const ids = [...state.servers].sort((a, b) => a.order - b.order).map(s => s.id);
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(tab.dataset.id);
  if (from < 0 || to < 0) return;
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  try {
    const data = await api("/api/servers/reorder", { method: "POST", body: { ids } });
    state.servers = data.servers || state.servers;
    render();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    dragId = null;
  }
});

document.getElementById("btn-add").addEventListener("click", async () => {
  try {
    const server = await api("/api/servers", { method: "POST", body: { profile: "New Server" } });
    state.activeId = server.id;
    toast("Created New Server", "success");
    await refreshState();
  } catch (err) {
    toast(err.message, "error");
  }
});

let importPreview = null;
let importPollTimer = null;

function importModeLabel(mode) {
  return ({ resume: "Resume last prospect", load: "Load prospect", create: "Create prospect", lobby: "Lobby" })[mode] || mode;
}

function renderImportPreview(preview) {
  const el = document.getElementById("import-preview");
  importPreview = preview;
  const xml = preview.dtd?.xml || preview.xml || {};
  el.classList.remove("hidden");
  el.innerHTML = `
    <div><b>${escapeHtml(preview.profile || "Imported Server")}</b></div>
    <div>Install: ${escapeHtml(preview.install)}</div>
    <div>Size: ${escapeHtml(preview.sizeLabel || "unknown")} · ${Number(preview.files) || 0} files${preview.copyAllowed === false ? " · too large to copy (use in place)" : ""}</div>
    <div>Players: ${escapeHtml(xml.ServerMaxPlayerCount ?? 8)} · Game port: ${escapeHtml(xml.ServerPort ?? 26900)}</div>
    <div>World: ${escapeHtml(xml.GameWorld || "Navezgane")} · Save: ${escapeHtml(xml.GameName || "")}</div>
    <div>Password: ${xml.ServerPassword ? "set" : "none"} · Telnet: ${xml.TelnetEnabled}</div>
    <div>Config xml: ${preview.hasSettings ? "found" : "not found yet"}</div>
  `;
  const name = document.getElementById("import-profile");
  if (name && !name.value.trim()) name.value = preview.profile || "";
  const copy = document.getElementById("import-copy");
  if (copy && preview.copyAllowed === false) copy.checked = false;
  document.getElementById("import-dest-wrap")?.classList.toggle("hidden", !document.getElementById("import-copy")?.checked);
}

async function scanImportSource() {
  const source = document.getElementById("import-source")?.value?.trim();
  if (!source) {
    toast("Choose a server folder first", "error");
    return;
  }
  try {
    toast("Reading install…");
    const preview = await api("/api/import/inspect", { method: "POST", body: { source } });
    renderImportPreview(preview);
    toast("Settings loaded", "success");
  } catch (err) {
    importPreview = null;
    document.getElementById("import-preview")?.classList.add("hidden");
    toast(err.message, "error");
  }
}

function setImportProgress(job) {
  const wrap = document.getElementById("import-progress");
  const fill = document.getElementById("import-progress-fill");
  const text = document.getElementById("import-progress-text");
  wrap?.classList.remove("hidden");
  const percent = Number(job.percent) || 0;
  if (fill) fill.style.width = `${percent}%`;
  if (text) {
    if (job.status === "copying") {
      text.textContent = `Copying ${job.sizeLabel || "0 B"} of ${job.totalLabel || "?"} (${percent}%)`;
    } else if (job.status === "done") {
      text.textContent = "Import complete";
      if (fill) fill.style.width = "100%";
    } else if (job.status === "error") {
      text.textContent = job.error || "Import failed";
    } else {
      text.textContent = "Preparing import…";
    }
  }
}

document.getElementById("btn-import").addEventListener("click", () => {
  importPreview = null;
  if (importPollTimer) clearInterval(importPollTimer);
  importPollTimer = null;
  const form = document.getElementById("import-form");
  form?.reset();
  document.getElementById("import-preview")?.classList.add("hidden");
  document.getElementById("import-progress")?.classList.add("hidden");
  document.getElementById("import-dest-wrap")?.classList.add("hidden");
  document.getElementById("import-submit").disabled = false;
  importDialog.showModal();
});

document.getElementById("import-scan").addEventListener("click", () => scanImportSource());
document.getElementById("import-copy").addEventListener("change", event => {
  document.getElementById("import-dest-wrap")?.classList.toggle("hidden", !event.target.checked);
});

document.getElementById("import-form").addEventListener("submit", async event => {
  event.preventDefault();
  const source = document.getElementById("import-source").value.trim();
  const profile = document.getElementById("import-profile").value.trim();
  const copy = document.getElementById("import-copy").checked;
  const dest = document.getElementById("import-dest").value.trim();
  if (!source) {
    toast("Choose a server folder first", "error");
    return;
  }
  if (copy && !dest) {
    toast("Choose a destination folder for the copy", "error");
    return;
  }
  const submit = document.getElementById("import-submit");
  submit.disabled = true;
  try {
    const job = await api("/api/import/start", {
      method: "POST",
      body: { source, dest, copy, profile }
    });
    setImportProgress(job);
    if (job.status === "done" && job.server) {
      state.activeId = job.server.id;
      toast(`Imported ${job.server.profile}`, "success");
      importDialog.close();
      await refreshState();
      return;
    }
    if (importPollTimer) clearInterval(importPollTimer);
    importPollTimer = setInterval(async () => {
      try {
        const next = await api(`/api/import/jobs/${job.id}`);
        setImportProgress(next);
        if (next.status === "done") {
          clearInterval(importPollTimer);
          importPollTimer = null;
          if (next.server) state.activeId = next.server.id;
          toast(`Imported ${next.server?.profile || profile || "server"}`, "success");
          importDialog.close();
          submit.disabled = false;
          await refreshState();
        } else if (next.status === "error") {
          clearInterval(importPollTimer);
          importPollTimer = null;
          submit.disabled = false;
          toast(next.error || "Import failed", "error");
        }
      } catch (err) {
        clearInterval(importPollTimer);
        importPollTimer = null;
        submit.disabled = false;
        toast(err.message, "error");
      }
    }, 1000);
  } catch (err) {
    submit.disabled = false;
    toast(err.message, "error");
  }
});

document.getElementById("btn-start-with-windows")?.addEventListener("change", async event => {
  const enabled = Boolean(event.target.checked);
  event.target.disabled = true;
  try {
    await api("/api/manager/startup", { method: "POST", body: { enabled } });
    if (window.__dtdHost) window.__dtdHost.startWithWindows = enabled;
    toast(enabled ? "Will start with Windows" : "Won't start with Windows", "success");
  } catch (err) {
    event.target.checked = !enabled;
    toast(err.message, "error");
  } finally {
    event.target.disabled = false;
  }
});

document.getElementById("btn-theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
});

function applyTheme(theme) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = value;
  localStorage.setItem("sevendtd-theme", value);
  const btn = document.getElementById("btn-theme");
  if (btn) {
    const nextLabel = value === "light" ? "Change to Dark mode" : "Change to Light mode";
    btn.textContent = nextLabel;
    btn.title = nextLabel;
    btn.setAttribute("aria-label", nextLabel);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value === "light" ? "#e4d6c2" : "#120805";
}

applyTheme(localStorage.getItem("sevendtd-theme") === "light" ? "light" : "dark");

document.getElementById("btn-info").addEventListener("click", () => {
  const host = window.__dtdHost || {};
  const lans = (host.lanAddresses || []).map(ip => `http://${ip}:${host.managerPort || 3240}`);
  const p = infoDialog.querySelector(".muted");
  if (p) {
    p.textContent = lans.length
      ? `This PC and the internet can use the panel (forward TCP ${host.managerPort || 3240}). LAN examples: ${lans.join(" · ")}`
      : "Listening on all interfaces (0.0.0.0). Forward TCP 3240 for the panel, and UDP 26900-26902 (or your ServerPort range) for 7 Days to Die.";
  }
  fillHostSpecs(host.resources);
  infoDialog.showModal();
});

async function waitForManagerBack(timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) return true;
    } catch { /* still down */ }
  }
  return false;
}

document.getElementById("btn-restart-manager").addEventListener("click", async () => {
  const ok = await confirmDanger(
    "Restart Server Manager",
    "This restarts 7 Days To Die Server Manager and checks GitHub for updates (same as Start 7DTD Manager.cmd). Your game server is left running. Continue?",
    "Restart"
  );
  if (!ok) return;
  const btn = document.getElementById("btn-restart-manager");
  if (btn) btn.disabled = true;
  toast("Restarting manager — pulling updates, then coming back…", "info");
  try {
    await api("/api/manager/restart", { method: "POST", body: {} });
  } catch (err) {
    // Expected once the process exits mid-request; keep waiting for it to return.
    if (!/failed to fetch|networkerror|load failed|fetch/i.test(String(err.message || err))) {
      if (btn) btn.disabled = false;
      toast(err.message, "error");
      return;
    }
  }
  const back = await waitForManagerBack();
  if (btn) btn.disabled = false;
  if (back) {
    toast("Manager is back — reloading", "success");
    location.reload();
    return;
  }
  toast("Manager has not come back yet. Check the server console, then refresh this page.", "error");
});
document.getElementById("btn-copy-settings").addEventListener("click", () => {
  if (state.servers.length < 2) {
    toast("You need at least two server profiles to copy settings", "error");
    return;
  }
  const from = document.getElementById("copy-from");
  const to = document.getElementById("copy-to");
  const options = state.servers.map(s => `<option value="${s.id}">${escapeHtml(s.profile)}</option>`).join("");
  from.innerHTML = options;
  to.innerHTML = options;
  if (state.servers[1]) to.value = state.servers[1].id;
  copyDialog.showModal();
});

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => btn.closest("dialog")?.close());
});

document.getElementById("copy-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = {
    fromId: form.fromId.value,
    toId: form.toId.value,
    flags: {
      launchArgs: form.launchArgs.checked,
      autoStart: form.autoStart.checked,
      shutdown: form.shutdown.checked,
      backup: form.backup.checked,
      logs: form.logs.checked,
      configFiles: form.configFiles.checked
    }
  };
  try {
    await api("/api/servers/copy-settings", { method: "POST", body });
    copyDialog.close();
    toast("Settings copied", "success");
    await refreshState();
  } catch (err) {
    toast(err.message, "error");
  }
});

workspace.addEventListener("click", async event => {
  const panelBtn = event.target.closest(".panel-btn[data-panel]");
  if (panelBtn && workspace.contains(panelBtn)) {
    const next = panelBtn.dataset.panel;
    if (["overview", "console"].includes(next)) {
      state.panel = next;
      localStorage.setItem("sevendtd-panel", next);
      const page = workspace.querySelector(".server-page");
      if (page) page.dataset.panel = next;
    }
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "toggle-section") {
    const id = event.target.closest("[data-section]")?.dataset.section;
    if (!id) return;
    const tile = event.target.closest(".tile");
    if (state.openSections.has(id)) state.openSections.delete(id);
    else state.openSections.add(id);
    localStorage.setItem("sevendtd-open-sections", JSON.stringify([...state.openSections]));
    const open = state.openSections.has(id);
    tile?.classList.toggle("is-open", open);
    const btn = tile?.querySelector(".tile-toggle");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    return;
  }

  const server = activeServer();
  if (!server) return;

  try {
    if (action === "toggle") {
      if (String(server.status).toLowerCase() === "running") {
        await withBusy(server.id, async () => {
          await api(`/api/servers/${server.id}/stop`, { method: "POST" });
          toast(`Stopped ${server.profile}`);
        });
      } else {
        const started = await startServerWithFirewallPrompt(server);
        if (started) toast(`Started ${server.profile}`, "success");
      }
    } else if (action === "update") {
      state.repairPrompted.delete(server.id);
      await api(`/api/servers/${server.id}/update`, { method: "POST", body: {} });
      toast("Update / Verify started — watch the Console panel", "success");
      connectConsole(server.id);
      await refreshState({ silent: true });
    } else if (action === "download-steamcmd") {
      toast("Downloading SteamCMD…");
      const result = await api("/api/steamcmd/download", { method: "POST", body: {} });
      schedulePatch(server.id, { steamcmd: result.path });
      toast(`SteamCMD ready at ${result.path}`, "success");
      await refreshState();
    } else if (action === "backup") {
      await withBusy(server.id, async () => {
        await api(`/api/servers/${server.id}/backup`, { method: "POST" });
        toast("Backup complete", "success");
      });
    } else if (action === "open-gus-ini") {
      await api(`/api/servers/${server.id}/open-ini`, { method: "POST", body: { kind: "settings" } });
      toast("Opened config file");
    } else if (action === "config-file-add") {
      await addConfigFileFromForm(server);
    } else if (action === "config-file-create") {
      const name = event.target.closest("[data-name]")?.dataset.name;
      await addConfigFileFromForm(server, name);
    } else if (action === "config-file-open") {
      const name = event.target.closest("[data-name]")?.dataset.name;
      await api(`/api/servers/${server.id}/config-files/open`, { method: "POST", body: { name } });
      toast(`Opened ${name}`);
    } else if (action === "config-file-delete") {
      const name = event.target.closest("[data-name]")?.dataset.name;
      const ok = await confirmDanger("Delete config file", `Delete ${name} from this server's WindowsServer config folder?`);
      if (!ok) return;
      await api(`/api/servers/${server.id}/config-files/delete`, { method: "POST", body: { name } });
      toast(`Deleted ${name}`);
      await loadConfigFiles(server);
    } else if (action === "mod-file-add") {
      if (!String(server.install || "").trim()) {
        toast("Attach the dedicated server install first", "error");
        return;
      }
      document.getElementById("mod-file-upload")?.click();
    } else if (action === "mod-file-delete") {
      const name = event.target.closest("[data-name]")?.dataset.name;
      const ok = await confirmDanger("Remove mod", `Delete ${name} from Mods?`);
      if (!ok) return;
      await api(`/api/servers/${server.id}/mods/delete`, { method: "POST", body: { name } });
      toast(`Removed ${name}`);
      await loadModFiles(server);
    } else if (action === "mod-open-folder") {
      await api(`/api/servers/${server.id}/mods/open-folder`, { method: "POST", body: {} });
      toast("Opened Mods folder");
    } else if (action === "attach-install") {
      const target = String(server.install || "").trim();
      if (!target) {
        toast("Enter the 7 Days to Die folder or 7DaysToDieServer.exe path first", "error");
        return;
      }
      const attached = await api(`/api/servers/${server.id}/attach`, { method: "POST", body: { path: target } });
      const idx = state.servers.findIndex(s => s.id === server.id);
      if (idx >= 0) state.servers[idx] = { ...state.servers[idx], ...attached };
      toast(`Attached to ${attached.exe || attached.install}`, "success");
      await refreshState();
    } else if (action === "console-clear") {
      const el = document.getElementById("console-output");
      if (el) el.innerHTML = `<div class="console-empty">Live 7 Days to Die log output will appear here…</div>`;
    } else if (action === "console-players") {
      await sendConsoleCommand(server.id, "ListPlayers", false);
    } else if (action === "console-getchat") {
      await sendConsoleCommand(server.id, "GetChat", false);
    }
  } catch (err) {
    toast(err.message, "error");
    await refreshState({ silent: true });
  }
});

async function sendConsoleCommand(serverId, command, asChat) {
  await api(`/api/servers/${serverId}/command`, {
    method: "POST",
    body: { command, asChat: Boolean(asChat) }
  });
}

workspace.addEventListener("submit", async event => {
  if (event.target?.id !== "console-form") return;
  event.preventDefault();
  const server = activeServer();
  if (!server) return;
  const input = document.getElementById("console-input");
  const asChat = document.getElementById("console-as-chat")?.checked;
  const command = input?.value?.trim();
  if (!command) return;
  input.value = "";
  try {
    await sendConsoleCommand(server.id, command, asChat);
  } catch (err) {
    toast(err.message, "error");
  }
});

function applyControlPatch(el) {
  const server = activeServer();
  if (!server) return;

  if (el.dataset.sandbox) {
    const key = el.dataset.sandbox;
    const raw = el.type === "checkbox" ? el.checked : el.value;
    const num = Number(raw);
    const value = el.type === "checkbox" ? el.checked : (raw === "true" ? true : raw === "false" ? false : Number.isFinite(num) && String(num) === String(raw) ? num : raw);
    schedulePatch(server.id, { sandbox: { [key]: value } });
    return;
  }
  if (el.dataset.xml) {
    const key = el.dataset.xml;
    const value = el.type === "checkbox" ? el.checked : el.value;
    schedulePatch(server.id, { xml: { [key]: value } });
    return;
  }

  const field = el.dataset.field;
  if (!field) return;

  if (field === "autostartDays" || field === "shutdownDays") {
    const index = Number(el.dataset.index);
    const next = [...(server[field] || [false, false, false, false, false, false, false])];
    next[index] = el.checked;
    schedulePatch(server.id, { [field]: next });
    return;
  }

  if (el.type === "checkbox") {
    schedulePatch(server.id, { [field]: el.checked });
    return;
  }

  let value = el.value;
  if (field === "autostartTime" || field === "shutdownTime") value = fromTimeInput(value);
  schedulePatch(server.id, { [field]: value });
}

workspace.addEventListener("input", event => applyControlPatch(event.target));
workspace.addEventListener("change", async event => {
  const el = event.target;
  if (el?.id === "mod-file-upload") {
    const file = el.files?.[0];
    el.value = "";
    const server = activeServer();
    if (!file || !server) return;
    try {
      toast(`Uploading ${file.name}…`);
      const res = await fetch(`/api/servers/${server.id}/mods/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(file.name)
        },
        body: file
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      toast("Mod added", "success");
      await loadModFiles(server);
    } catch (err) {
      toast(err.message, "error");
    }
    return;
  }
  if (el?.id === "config-file-preset") {
    document.getElementById("config-custom-wrap")?.classList.toggle("hidden", el.value !== "__custom");
    return;
  }
  if (el?.dataset?.sandbox || el?.dataset?.xml || el?.tagName === "SELECT") applyControlPatch(el);
});

await refreshState();
state.busy.clear();
state.pollTimer = setInterval(() => refreshState({ silent: true }), 2000);
