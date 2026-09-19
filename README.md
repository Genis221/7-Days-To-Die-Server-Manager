# 7 Days To Die Server Manager (Web)

A local web control panel for managing **7 Days to Die** dedicated servers on Windows.

It follows the same Node.js pattern as the Icarus, ARK, and Minecraft managers: start/stop servers, SteamCMD install/update, schedules, world backups, Windows Firewall helpers, live logs, and telnet commands.

Drop your existing dedicated-server folder into a profile’s **Install** path. Game files are not stored in this git repo.

---

## Requirements

- **Windows**
- **[Node.js 20+](https://nodejs.org/)** on your PATH
- Optional: SteamCMD (can be downloaded from the UI into `Documents\SteamCMD`)

No `npm install` is required — the app uses only Node built-ins.

Dedicated server Steam App ID: **294420**.

---

## Quick start

1. Double-click **`Start 7DTD Manager.cmd`**, or run `npm start`
2. Open the UI:

- Local: `http://127.0.0.1:3240`
- LAN: `http://YOUR-PC-IP:3240`

The start script checks GitHub for manager updates, binds to `0.0.0.0`, opens Windows Firewall for the dashboard port **3240**, and stops any previous manager already using that port.

Forward **TCP 3240** later if you want the panel on the internet. Forward the game UDP range (default **26900–26902**) for players.

---

## Settings

The panel writes **`manager-serverconfig.xml`** in the install folder and launches with `-configfile=manager-serverconfig.xml` so Steam updates do not wipe your settings.

Included:

- Identity, ports, slots, EAC, telnet, web dashboard, world, land claims, performance
- **SandboxCode** for V3+ (XP gain, loot respawn days, shop/trader restock days, blood moon, loot abundance, and the rest of the sandbox catalog)
- Legacy V2 xml fields (`XPMultiplier`, `LootRespawnDays`, …) kept in the same file for older servers

---

## Layout

```text
7 Days To Die Server Manager/
├── server.mjs
├── sandbox.mjs
├── dtd-config.mjs
├── sandbox-options.json
├── package.json
├── Start 7DTD Manager.cmd
├── public/
└── data/                   # Runtime (gitignored)
```

Env overrides: `SEVENDTD_HOST`, `SEVENDTD_PORT`, `SEVENDTD_DATA_DIR`, `SEVENDTD_ALLOW_REMOTE`, `SEVENDTD_ALLOW_PUBLIC`
