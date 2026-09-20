# 7 Days To Die Server Manager

A Windows web control panel for **7 Days to Die** dedicated servers.

It uses Node.js 20+ built-ins only (no `npm install`). Start and stop servers, install or update with SteamCMD, edit gameplay and XML settings, schedule restarts, back up worlds, open Windows Firewall, stream live logs, and upload mods from any PC that can reach the panel.

Game files stay on disk in each profile’s install folder. They are not stored in this git repo.

GitHub: [Genis221/7-Days-To-Die-Server-Manager](https://github.com/Genis221/7-Days-To-Die-Server-Manager)

---

## Requirements

- **Windows**
- **[Node.js 20+](https://nodejs.org/)** on your PATH
- Optional: SteamCMD (the UI can download it into `Documents\SteamCMD`)

Dedicated server Steam App ID: **294420**  
Executable: `7DaysToDieServer.exe` (client `7DaysToDie.exe` is also recognized)

---

## Quick start

1. Double-click **`Start 7DTD Manager.cmd`**, or run `npm start`
2. Open the panel:

| Where | URL |
| --- | --- |
| This PC | `http://127.0.0.1:3240` |
| LAN | `http://YOUR-PC-IP:3240` |

The start script:

- Pulls manager updates from GitHub when it can
- Listens on **all interfaces** (`0.0.0.0`)
- Opens Windows Firewall for dashboard **TCP 3240**
- Stops a previous manager that is already using that port
- Can open the browser unless you pass `-NoBrowser`

**Restart Server Manager** in the UI relaunches through `RestartSevenDaysManager.cmd` / `.vbs` so the new process survives after Node exits.

---

## Ports

| What | Default | Notes |
| --- | --- | --- |
| Manager panel | TCP **3240** | Forward this if you want the UI from the internet |
| Game | UDP/TCP **26900** | Plus UDP **+1** and **+2** (query). Change **Game port** if you run more than one server |
| Telnet | TCP **8081** | Used for live log / commands when telnet is enabled |
| Built-in game dashboard | TCP **8080** | Optional, off by default |

Internet play: forward the game UDP range (default **26900–26902**) to this PC, plus TCP for the game port and telnet if you use them. Forward **TCP 3240** only if you want the manager itself reachable off-LAN.

---

## Profiles and install

Create **New Server** or **Import** an existing dedicated-server folder (or `7DaysToDieServer.exe`). Import can copy the folder (up to 20 GB) or attach it in place.

On **Install**:

- **Installed Version** — read from SteamCMD / appmanifest when known
- **Install Location** — folder that contains `7DaysToDieServer.exe`, then **Attach**
- **Launch Arguments** — default includes `-configfile=manager-serverconfig.xml` and `-dedicated`

On **SteamCMD**:

- Folder path (often `Documents\SteamCMD`)
- Optional Steam **branch** (empty = stable; `latest_experimental` or a pinned beta)
- **Download SteamCMD**
- **Update / Verify** pulls app **294420** into the install

If SteamCMD reports a stuck install (app state `0x6`), the manager can **repair**: it deletes the install except `UserData`, `Mods`, `logs`, `manager-serverconfig.xml`, and `serveradmin.xml`, then redownloads.

You can run several profiles (different ports and install folders).

---

## Settings file

The panel writes **`manager-serverconfig.xml`** in the install folder and launches with `-configfile=manager-serverconfig.xml` so a Steam update does not wipe your settings.

V3+ gameplay lives in **SandboxCode**. The UI also keeps matching **legacy V2 XML** fields (XP %, loot respawn, loot abundance, day length, blood moon, and so on) in the same file for older servers.

---

## Overview layout

Left of the workspace: **This PC** (CPU % / cores / GHz and RAM % / used / free / total / MHz), **Start with Windows**, world tabs.

Under **Session**:

- Status, availability, firewall, players
- **Install** and **SteamCMD** (same-height pair)
- **Gameplay highlights** (full width)

Right column (collapsible), top to bottom:

1. Identity  
2. Network & ports  
3. Slots  
4. Shutdown / restart  
5. Automatic start  
6. Mods  
7. Admin / telnet / dashboard  
8. World save  
9. Remaining XML rules  
10. Performance  
11. Land claims  
12. Dynamic mesh  
13. World backups  
14. Config files  
15. Sandbox categories (Player, Entities, World, Resources, Crafting, Traders, Tasks, Misc)

**Live log** is a second workspace tab.

---

## Gameplay highlights

These write SandboxCode (and the matching V2 XML fields where they exist):

| Control | What it does |
| --- | --- |
| XP Multiplier | Player XP rate |
| Skill Points Per Level | Points awarded per level (UI **1–10**; vanilla SandboxCode documents **1–7**, so **8–10** may cap at 7 until the game adds those steps) |
| Loot Respawn Days | Including **1–5** plus the official longer values |
| Trader / vending reset | Shop restock interval (**1–5** days are listed) |
| Global loot abundance | Loot count multiplier |
| 24-day cycle / daylight | Day length |
| Blood moon frequency and count | Horde night |
| Enemy spawn | On/off |
| Drop on death | |
| Air drops | |
| SandboxCode | Raw V3 string if you want to paste a code |

Everything else in the sandbox catalog is under **Sandbox: …** on the right.

---

## XML groups

| Section | Examples |
| --- | --- |
| Identity | Name, description, website, join password, region, language |
| Network | Game port, visibility, crossplay, world transfer speed |
| Slots | Max players, reserved and admin slots |
| Admin | Telnet, built-in web dashboard, map rendering, Windows terminal window |
| World save | Navezgane vs RWG seed/size, save name, chunk age, save size limit |
| Remaining XML rules | Safe zone, bedrolls, PvP killing mode, creative, spawn-near-friend |
| Security | EAC, EOS sanctions, command-log hiding |
| Performance | Max zombies/animals, view distance |
| Land claims | Count, size, expiry, durability |
| Dynamic mesh / Twitch | Mesh cache, Twitch permission |

---

## Mods

Mods go in **`<install>\Mods\`** as folders with `ModInfo.xml` (the dedicated server loads `Mods\YourModName\`).

**Add mod** opens a file picker **on the computer you are browsing from** (this PC or another on LAN/WAN). Upload a **`.zip`** (up to **2 GB**). The manager extracts it and copies the mod folder into `Mods`. Zip unpacked mods first.

**Open Mods folder** opens Explorer on the **server PC**.

Repair / Steam verify keeps the `Mods` folder.

---

## Windows Firewall

On first start the UI can ask to add rules. After you allow once, it can auto-apply:

- Game UDP/TCP on the configured game port
- UDP on game port **+1** and **+2**
- Telnet TCP when telnet is enabled
- Manager TCP **3240** (from the start script)

---

## Schedules, backups, copies

- **Automatic start** — days of week, time, optional update before start  
- **Shutdown / restart** — days, time, optional update then restart  
- **World backups** — interval (30 min–24 h), keep last N (10–100), destination folder, backup now  
- **Copy server settings** — launch args, schedules, backups, log paths, XML + sandbox between profiles  
- **Config files** — list/add/open/delete files in the dedicated server folder (`manager-serverconfig.xml`, `serveradmin.xml`, and so on)

---

## Live log

The **Live log** tab tails the dedicated server output. Telnet (default port 8081, optional password) is used when enabled so you can send commands. **Show Windows terminal window** in Admin is off by default so the server stays headless.

---

## Start with Windows

Checkbox on the left rail. When on, a hidden launcher is written to the Windows Startup folder (`7 Days To Die Server Manager.cmd`) so the panel comes up at logon without a PowerShell window.

---

## Light / dark

**Change to Light mode** / **Dark mode** in the rail. Colors stay 7DTD (ember / wasteland), not a clone of the other managers.

---

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `SEVENDTD_PORT` / `PORT` | `3240` | Manager HTTP port |
| `SEVENDTD_HOST` | `0.0.0.0` | Bind address |
| `SEVENDTD_DATA_DIR` | `./data` | State, logs, temp uploads |
| `SEVENDTD_ALLOW_REMOTE` | `true` | Allow non-loopback clients |
| `SEVENDTD_ALLOW_PUBLIC` | `true` | Allow public/WAN use of the panel |

Runtime data (`data/`, including `state.json`) is gitignored.

---

## Layout

```text
7 Days To Die Server Manager/
├── server.mjs                      # HTTP API + process control
├── sandbox.mjs                     # SandboxCode encode/decode
├── sandbox-options.json            # V3 sandbox catalog
├── dtd-config.mjs                  # XML property list + render
├── package.json
├── Start 7DTD Manager.cmd
├── StartSevenDaysManager.ps1
├── RestartSevenDaysManager.cmd
├── RestartSevenDaysManager.vbs
├── public/                         # UI
└── data/                           # Runtime (gitignored)
```

---

## Scripts

```text
npm start     # node server.mjs
npm run dev   # same, --no-open
npm run check # syntax check, no extra packages
```
