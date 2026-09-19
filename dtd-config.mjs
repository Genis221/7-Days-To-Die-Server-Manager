export const XML_PROPERTIES = [
  { key: "ServerName", group: "Identity", label: "Server name", type: "string", def: "My Game Host" },
  { key: "ServerDescription", group: "Identity", label: "Description", type: "string", def: "A 7 Days to Die server" },
  { key: "ServerWebsiteURL", group: "Identity", label: "Website URL", type: "string", def: "" },
  { key: "ServerPassword", group: "Identity", label: "Join password", type: "string", def: "" },
  { key: "ServerLoginConfirmationText", group: "Identity", label: "Join confirmation text", type: "string", def: "" },
  { key: "Region", group: "Identity", label: "Region", type: "select", def: "NorthAmericaEast", options: [
    "NorthAmericaEast", "NorthAmericaWest", "CentralAmerica", "SouthAmerica", "Europe", "Russia", "Asia", "MiddleEast", "Africa", "Oceania"
  ] },
  { key: "Language", group: "Identity", label: "Language", type: "string", def: "English" },

  { key: "ServerPort", group: "Network", label: "Game port", type: "int", def: 26900, min: 1024, max: 65535 },
  { key: "ServerVisibility", group: "Network", label: "Server visibility", type: "select", def: "2", options: [
    { value: "0", label: "Not listed" },
    { value: "1", label: "Friends only (direct IP for dedicated)" },
    { value: "2", label: "Public" }
  ] },
  { key: "ServerDisabledNetworkProtocols", group: "Network", label: "Disabled network protocols", type: "string", def: "SteamNetworking" },
  { key: "ServerMaxWorldTransferSpeedKiBs", group: "Network", label: "World transfer speed (KiB/s)", type: "int", def: 512, min: 1, max: 1300 },
  { key: "ServerAllowCrossplay", group: "Network", label: "Allow crossplay", type: "bool", def: false },

  { key: "ServerMaxPlayerCount", group: "Slots", label: "Max players", type: "int", def: 8, min: 1, max: 64 },
  { key: "ServerReservedSlots", group: "Slots", label: "Reserved slots", type: "int", def: 0, min: 0, max: 64 },
  { key: "ServerReservedSlotsPermission", group: "Slots", label: "Reserved slot permission (lower = more power)", type: "int", def: 100, min: 0, max: 1000 },
  { key: "ServerAdminSlots", group: "Slots", label: "Admin overflow slots", type: "int", def: 0, min: 0, max: 64 },
  { key: "ServerAdminSlotsPermission", group: "Slots", label: "Admin slot permission", type: "int", def: 0, min: 0, max: 1000 },

  { key: "WebDashboardEnabled", group: "Admin", label: "Built-in web dashboard", type: "bool", def: false },
  { key: "WebDashboardPort", group: "Admin", label: "Web dashboard port", type: "int", def: 8080, min: 1, max: 65535 },
  { key: "WebDashboardUrl", group: "Admin", label: "Public dashboard URL", type: "string", def: "" },
  { key: "EnableMapRendering", group: "Admin", label: "Enable map rendering", type: "bool", def: false },
  { key: "TelnetEnabled", group: "Admin", label: "Telnet console", type: "bool", def: true },
  { key: "TelnetPort", group: "Admin", label: "Telnet port", type: "int", def: 8081, min: 1, max: 65535 },
  { key: "TelnetPassword", group: "Admin", label: "Telnet password", type: "string", def: "" },
  { key: "TelnetFailedLoginLimit", group: "Admin", label: "Telnet failed login limit", type: "int", def: 10, min: 1, max: 100 },
  { key: "TelnetFailedLoginsBlocktime", group: "Admin", label: "Telnet block time (seconds)", type: "int", def: 10, min: 1, max: 3600 },
  { key: "TerminalWindowEnabled", group: "Admin", label: "Show Windows terminal window", type: "bool", def: false },

  { key: "AdminFileName", group: "Folders", label: "Admin file name", type: "string", def: "serveradmin.xml" },
  { key: "UserDataFolder", group: "Folders", label: "User data folder (leave blank for default)", type: "string", def: "" },

  { key: "EACEnabled", group: "Security", label: "Easy Anti-Cheat", type: "bool", def: true },
  { key: "IgnoreEOSSanctions", group: "Security", label: "Ignore EOS sanctions", type: "bool", def: false },
  { key: "HideCommandExecutionLog", group: "Security", label: "Hide command execution log", type: "select", def: "0", options: [
    { value: "0", label: "Show everything" },
    { value: "1", label: "Hide from telnet/control panel" },
    { value: "2", label: "Also hide from remote clients" },
    { value: "3", label: "Hide everything" }
  ] },
  { key: "MaxUncoveredMapChunksPerPlayer", group: "World", label: "Max uncovered map chunks / player", type: "int", def: 131072, min: 0, max: 10000000 },
  { key: "PersistentPlayerProfiles", group: "World", label: "Persistent player profiles", type: "bool", def: false },
  { key: "MaxChunkAge", group: "World", label: "Max chunk age (in-game days, -1 off)", type: "int", def: -1, min: -1, max: 3650 },
  { key: "SaveDataLimit", group: "World", label: "Save data limit MB (-1 off)", type: "int", def: -1, min: -1, max: 1000000 },

  { key: "GameWorld", group: "World", label: "World", type: "string", def: "Navezgane" },
  { key: "WorldGenSeed", group: "World", label: "RWG seed", type: "string", def: "MyGame" },
  { key: "WorldGenSize", group: "World", label: "RWG size", type: "select", def: "6144", options: ["6144", "8192", "10240"] },
  { key: "GameName", group: "World", label: "Save / game name", type: "string", def: "MyGame" },
  { key: "GameMode", group: "World", label: "Game mode", type: "string", def: "GameModeSurvival" },

  { key: "SandboxCode", group: "Sandbox", label: "SandboxCode", type: "string", def: "AAAJABJACJADJARFBNC" },

  { key: "PlayerSafeZoneLevel", group: "Rules", label: "Player safe zone level", type: "int", def: 5, min: 0, max: 300 },
  { key: "PlayerSafeZoneHours", group: "Rules", label: "Player safe zone hours", type: "int", def: 5, min: 0, max: 240 },
  { key: "BuildCreate", group: "Rules", label: "Creative / cheat mode", type: "bool", def: false },
  { key: "BedrollDeadZoneSize", group: "Rules", label: "Bedroll dead zone size", type: "int", def: 15, min: 0, max: 300 },
  { key: "BedrollExpiryTime", group: "Rules", label: "Bedroll expiry (real days)", type: "int", def: 45, min: 0, max: 3650 },
  { key: "AllowSpawnNearFriend", group: "Rules", label: "Spawn near friend", type: "select", def: "2", options: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "Always" },
    { value: "2", label: "Forest biome friends only" }
  ] },
  { key: "CameraRestrictionMode", group: "Rules", label: "Camera restriction", type: "select", def: "0", options: [
    { value: "0", label: "Free 1st/3rd person" },
    { value: "1", label: "First person only" },
    { value: "2", label: "Third person only" }
  ] },
  { key: "PartySharedKillRange", group: "Rules", label: "Party shared kill range", type: "int", def: 100, min: 0, max: 10000 },
  { key: "PlayerKillingMode", group: "Rules", label: "Player killing", type: "select", def: "3", options: [
    { value: "0", label: "No killing (PvE)" },
    { value: "1", label: "Allies only" },
    { value: "2", label: "Strangers only" },
    { value: "3", label: "Everyone" }
  ] },

  { key: "MaxSpawnedZombies", group: "Performance", label: "Max spawned zombies", type: "int", def: 64, min: 0, max: 256 },
  { key: "MaxSpawnedAnimals", group: "Performance", label: "Max spawned animals", type: "int", def: 50, min: 0, max: 256 },
  { key: "ServerMaxAllowedViewDistance", group: "Performance", label: "Max view distance", type: "int", def: 12, min: 6, max: 12 },
  { key: "MaxQueuedMeshLayers", group: "Performance", label: "Max queued mesh layers", type: "int", def: 1000, min: 0, max: 100000 },

  { key: "LandClaimCount", group: "Land claims", label: "Land claims per player", type: "int", def: 5, min: 0, max: 50 },
  { key: "LandClaimSize", group: "Land claims", label: "Land claim size", type: "int", def: 41, min: 1, max: 201 },
  { key: "LandClaimDeadZone", group: "Land claims", label: "Land claim dead zone", type: "int", def: 30, min: 0, max: 500 },
  { key: "LandClaimExpiryTime", group: "Land claims", label: "Claim expiry (real days)", type: "int", def: 7, min: 0, max: 3650 },
  { key: "LandClaimDecayMode", group: "Land claims", label: "Claim decay mode", type: "select", def: "0", options: [
    { value: "0", label: "Slow (linear)" },
    { value: "1", label: "Fast (exponential)" },
    { value: "2", label: "None (full until expiry)" }
  ] },
  { key: "LandClaimOnlineDurabilityModifier", group: "Land claims", label: "Online durability modifier (0 = invuln)", type: "int", def: 4, min: 0, max: 100 },
  { key: "LandClaimOfflineDurabilityModifier", group: "Land claims", label: "Offline durability modifier (0 = invuln)", type: "int", def: 4, min: 0, max: 100 },
  { key: "LandClaimOfflineDelay", group: "Land claims", label: "Offline delay (minutes)", type: "int", def: 0, min: 0, max: 10080 },

  { key: "DynamicMeshEnabled", group: "Dynamic mesh", label: "Dynamic mesh enabled", type: "bool", def: true },
  { key: "DynamicMeshLandClaimOnly", group: "Dynamic mesh", label: "Land claim only", type: "bool", def: true },
  { key: "DynamicMeshLandClaimBuffer", group: "Dynamic mesh", label: "Land claim buffer chunks", type: "int", def: 3, min: 0, max: 32 },
  { key: "DynamicMeshMaxItemCache", group: "Dynamic mesh", label: "Max item cache", type: "int", def: 3, min: 1, max: 32 },

  { key: "TwitchServerPermission", group: "Twitch", label: "Twitch permission level", type: "int", def: 90, min: 0, max: 1000 },
  { key: "TwitchBloodMoonAllowed", group: "Twitch", label: "Allow Twitch during blood moon", type: "bool", def: false },

  { key: "XPMultiplier", group: "Legacy V2", label: "XP multiplier (V2 xml %)", type: "int", def: 100, min: 0, max: 1000 },
  { key: "LootRespawnDays", group: "Legacy V2", label: "Loot respawn days (V2 xml)", type: "int", def: 7, min: -1, max: 100 },
  { key: "LootAbundance", group: "Legacy V2", label: "Loot abundance (V2 xml %)", type: "int", def: 100, min: 0, max: 1000 },
  { key: "DayNightLength", group: "Legacy V2", label: "Minutes per day (V2 xml)", type: "int", def: 60, min: 10, max: 180 },
  { key: "DayLightLength", group: "Legacy V2", label: "Daylight hours (V2 xml)", type: "int", def: 18, min: 0, max: 24 },
  { key: "AirDropFrequency", group: "Legacy V2", label: "Air drop frequency hours (V2 xml)", type: "int", def: 72, min: 0, max: 240 },
  { key: "BloodMoonFrequency", group: "Legacy V2", label: "Blood moon frequency (V2 xml)", type: "int", def: 7, min: 0, max: 30 },
  { key: "BloodMoonEnemyCount", group: "Legacy V2", label: "Blood moon horde count (V2 xml)", type: "int", def: 8, min: 0, max: 64 },
  { key: "GameDifficulty", group: "Legacy V2", label: "Game difficulty 0-5 (V2 xml)", type: "int", def: 1, min: 0, max: 5 }
];

export const XML_BY_KEY = Object.fromEntries(XML_PROPERTIES.map(p => [p.key, p]));

export function defaultXml() {
  const out = {};
  for (const prop of XML_PROPERTIES) out[prop.key] = prop.def;
  return out;
}

export function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function parseXmlProperties(raw) {
  const values = defaultXml();
  const text = String(raw || "");
  const re = /<property\s+name="([^"]+)"\s+value="([^"]*)"\s*\/>/gi;
  let match;
  while ((match = re.exec(text))) {
    values[match[1]] = decodeXml(match[2]);
  }
  return values;
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

export function xmlBool(value, fallback = false) {
  if (value === true || value === false) return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) return true;
  if (["false", "0", "no", "off"].includes(text)) return false;
  return fallback;
}

export function normalizeXml(partial = {}) {
  const base = defaultXml();
  for (const prop of XML_PROPERTIES) {
    if (partial[prop.key] === undefined || partial[prop.key] === null) continue;
    if (prop.type === "bool") base[prop.key] = xmlBool(partial[prop.key], prop.def);
    else if (prop.type === "int") {
      const n = Number(partial[prop.key]);
      base[prop.key] = Number.isFinite(n) ? Math.round(n) : prop.def;
    } else {
      base[prop.key] = String(partial[prop.key]);
    }
  }
  return base;
}

export function renderServerConfig(xml) {
  const values = normalizeXml(xml);
  const groups = [];
  for (const prop of XML_PROPERTIES) {
    const last = groups[groups.length - 1];
    if (!last || last.group !== prop.group) groups.push({ group: prop.group, props: [prop] });
    else last.props.push(prop);
  }
  const lines = [
    '<?xml version="1.0"?>',
    "<ServerSettings>",
    "  <!-- Written by 7 Days To Die Server Manager. Use -configfile=manager-serverconfig.xml so Steam updates do not wipe these settings. -->"
  ];
  for (const group of groups) {
    lines.push("");
    lines.push(`  <!-- ${group.group} -->`);
    for (const prop of group.props) {
      let value = values[prop.key];
      if (prop.type === "bool") value = xmlBool(value, prop.def) ? "true" : "false";
      else value = String(value ?? "");
      lines.push(`  <property name="${prop.key}" value="${escapeXml(value)}"/>`);
    }
  }
  lines.push("</ServerSettings>");
  lines.push("");
  return lines.join("\n");
}
