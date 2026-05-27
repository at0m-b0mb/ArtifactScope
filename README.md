<div align="center">

# 🛡️ ArtifactScope

### Cross-platform digital forensics — entirely on your machine.

A modern desktop toolkit for investigators, incident responders, and security researchers.
Inspect files, recover artifacts, hunt indicators, and document chain of custody from a single fast, keyboard-driven UI.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-32-47848F?logo=electron&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white&style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)

<br />

```
┌─ Case management  •  19 analyzers  •  Hash DB  •  Tamper-evident log  •  PDF reports ─┐
│                                                                                       │
│   ⌘K to jump anywhere   ·   ? for shortcuts   ·   No telemetry, no cloud calls        │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## ✨ Highlights

- **🎯 Command palette** — `⌘K` / `Ctrl+K` opens fuzzy search over every tool, case, and action.
- **⌨️ Keyboard-first** — Vim-style `g d` / `g c` / `g f` shortcuts; `?` reveals the full cheatsheet.
- **🔗 Tamper-evident audit log** — every action is hash-chained; integrity verifies in one click.
- **🗂️ Case workflow** — evidence, chain of custody, and activity bound together per investigation.
- **🔬 19 forensic analyzers** — files, images, logs, PCAPs, registries, email, archives, SQLite, disk images, and more.
- **🧬 Hash database** — local known-good / known-bad / suspicious lookup, NSRL-compatible import.
- **📤 One-click export** — CSV / JSON exporters on every data view.
- **🎨 Polished UI** — Tailwind + Framer Motion, accent picker, cozy/compact density, loading skeletons, animated page transitions.
- **🛡️ Local-first & private** — no telemetry; databases live in your user-data directory; no network calls unless you wire up an API key.

---

## 📸 At a Glance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ▤ ArtifactScope    [⌘K Search tools, jump anywhere…]    Case · #2026-001  ?    │
├──────────────┬──────────────────────────────────────────────────────────────────┤
│ Overview     │   Open Cases   Critical    Hash DB     Known Bad                 │
│   Dashboard  │      4            1         12,481        37                     │
│   Cases      │                                                                  │
│   Activity   │  Quick Actions    Active Case          Recent Activity           │
│ Analyze      │  ┌─┬─┬─┐          Operation Thunder    • Analyzed sample.exe     │
│   File       │  │F│G│M│          #2026-001 · Open     • Added evidence …        │
│   Image      │  ├─┼─┼─┤          Det. Jane Smith                                │
│   Strings    │  │H│O│T│                                                         │
│   Archive    │  └─┴─┴─┘                                                         │
│ Artifacts    │                                                                  │
│   Browser    │  Recent Files                                                    │
│   System     │  invoice.pdf   capture.pcap   hive.dat   …                       │
│   Registry   │                                                                  │
│   Email      │  Recent Cases                                                    │
│ Investigate  │  ▸ Operation Thunder      open  high      2h ago                 │
│   Logs       │  ▸ Phishing Campaign A    open  medium    1d ago                 │
│   Network    │                                                                  │
│   Timeline   │                                                                  │
└──────────────┴──────────────────────────────────────────────────────────────────┘
```

> *Screenshots coming soon. The build is fully working — run `npm run dev` to see it live.*

---

## 🧰 Capabilities

### 🗂️ Case Management

| Feature | Description |
| --- | --- |
| **Cases** | Create, prioritize, tag, and filter investigations. Active case follows you across tools. |
| **Evidence** | Per-case evidence registry with hashes, source paths, and notes. |
| **Chain of Custody** | Every transfer/review action is logged with timestamp + actor and hash-chained. |
| **Activity Log** | Append-only, hash-chained log of every operation. Verify integrity on demand. |

### 🔬 File & Artifact Analyzers

| Tool | What it does |
| --- | --- |
| **File Analyzer** | MD5/SHA-1/SHA-256/SHA-512 hashing, magic-byte detection, extension-mismatch alerts, entropy scoring, string extraction, EXIF, hex view, automatic hash-DB lookup, JSON export. |
| **Image Forensics** | EXIF, GPS extraction, manipulation hints, thumbnail/embedded data review. |
| **Strings / IOC Hunter** | Extract printable strings and surface IPs, URLs, emails, hashes, BTC wallets, JWTs, and custom regex. |
| **Archive Analyzer** | Inspect ZIP / TAR contents, flag suspicious entries, detect path-traversal payloads. |
| **Disk Image** | Walk partitions and recover file metadata from raw `.dd` / `.img` files. |

### 🌐 Artifact Recovery

| Tool | What it does |
| --- | --- |
| **Browser Artifacts** | History, downloads, cookies, and visit timelines from Chrome / Edge / Firefox profiles. |
| **System Info** | Live OS, CPU, memory, network, and process snapshots — for triage on the responder's own box. |
| **Registry Analyzer** *(Windows)* | Parse hives, browse keys, inspect values. |
| **Email Analyzer** | `.eml` / `.msg` parsing with header authentication (SPF/DKIM/DMARC) and attachment inventory. |

### 🔍 Investigation

| Tool | What it does |
| --- | --- |
| **Log Analyzer** | Multi-format log ingestion (syslog, JSON, generic) with severity grouping, pattern search, and CSV export. |
| **Network / PCAP** | Packet capture summaries, conversation views, protocol breakdowns, suspicious-flow flags. |
| **Filesystem Timeline** | Unified MAC time view across a directory tree with CSV export. |
| **SQLite Browser** | Open any `.sqlite` / `.db` and run ad-hoc SQL safely. |

### 📚 Knowledge & Reporting

| Tool | What it does |
| --- | --- |
| **Hash Database** | Local known-good / known-bad / suspicious lookup with NSRL-compatible CSV import. Batch lookup mode. |
| **Reports** | Generate branded PDF reports per case — evidence, hashes, findings, custody chain. |
| **Settings** | Investigator defaults, accent color, density, hash algorithm preferences, VirusTotal API key. |

---

## ⌨️ Keyboard Shortcuts

Press <kbd>?</kbd> anytime for the full cheat-sheet. Highlights:

| Shortcut | Action |
| --- | --- |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> | Open command palette |
| <kbd>?</kbd> | Show shortcuts overlay |
| <kbd>Esc</kbd> | Close palette or dialog |
| <kbd>g</kbd> <kbd>d</kbd> | Dashboard |
| <kbd>g</kbd> <kbd>c</kbd> | Cases |
| <kbd>g</kbd> <kbd>a</kbd> | Activity log |
| <kbd>g</kbd> <kbd>f</kbd> | File analyzer |
| <kbd>g</kbd> <kbd>h</kbd> | Hash database |
| <kbd>g</kbd> <kbd>t</kbd> | Timeline |
| <kbd>g</kbd> <kbd>s</kbd> | Settings |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- Native build toolchain for `better-sqlite3`:
  - **macOS** — Xcode Command Line Tools (`xcode-select --install`)
  - **Linux** — `sudo apt install build-essential python3`
  - **Windows** — Visual Studio Build Tools (Desktop development with C++)

### Install & Run

```bash
git clone https://github.com/at0m-b0mb/ArtifactScope.git
cd ArtifactScope
npm install
npm run dev
```

The Electron window will open with hot-reload across renderer and main.

### Build for Distribution

```bash
npm run build         # bundle main + preload + renderer
npm run build:mac     # macOS .dmg
npm run build:win     # Windows .exe installer
npm run build:linux   # Linux AppImage / .deb
```

Output lands in `dist/` (installer-ready) and `out/` (unpacked).

### Quality Gates

```bash
npm run typecheck     # strict TS across main + renderer
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│  Renderer  (React 18 + Tailwind + Framer Motion)   │  ← UI, pages, stores, shortcuts
│    └─ src/renderer/src                             │
├─────────────────────────────────────────────────────┤
│  Preload   (contextBridge)                         │  ← typed IPC surface
│    └─ src/preload/index.ts → window.bridge         │
├─────────────────────────────────────────────────────┤
│  Main      (Electron + Node)                       │
│    ├─ src/main/forensics  — analyzers              │
│    ├─ src/main/db         — SQLite stores          │
│    └─ src/main/util       — logging, paths, …      │
└─────────────────────────────────────────────────────┘
```

**Stack**

- **Electron 32** + **electron-vite** — desktop shell & build pipeline
- **React 18** + **React Router 6** + **Zustand** — UI and state
- **Tailwind CSS** + **lucide-react** + **framer-motion** — design system
- **better-sqlite3** — local case database, hash DB, activity log
- **recharts** — visualizations
- **exifreader**, **node-stream-zip** — artifact parsers

---

## 🔐 Privacy & Data

- All databases live under the OS-appropriate user-data directory (`~/Library/Application Support/ArtifactScope`, `%APPDATA%\ArtifactScope`, `~/.config/ArtifactScope`).
- **No telemetry.** No background network calls unless you configure an external integration (e.g., VirusTotal API key in Settings).
- Custody, evidence, and activity rows are hash-chained — any tampering breaks the chain at the next integrity check (`Activity Log → Verify Integrity`).
- Generated PDF reports are local files you choose to share, not auto-uploaded.

---

## 🗺️ Project Layout

```
src/
├── main/                # Electron main process
│   ├── db/              # SQLite stores: cases, evidence, custody, hashdb, activity
│   ├── forensics/       # File / image / log / pcap / registry / email / disk analyzers
│   ├── util/            # Logging, paths, progress events
│   ├── ipc.ts           # IPC channel registry
│   └── index.ts         # App bootstrap & window lifecycle
├── preload/
│   └── index.ts         # contextBridge — exposes the typed `window.bridge` API
└── renderer/
    └── src/
        ├── components/  # ui/ + layout/ primitives, CommandPalette, ShortcutsHelp, WelcomeModal
        ├── pages/       # One file per tool (Dashboard, FileAnalyzer, HashDB, …)
        ├── lib/         # api wrapper, formatters, classnames, storage, export, shortcuts
        ├── stores/      # Zustand stores (case, UI)
        └── styles/      # Tailwind entry & globals
```

---

## 🧭 Roadmap

Planned, in rough priority order:

- [ ] **Hash DB integrations** — VirusTotal, MalwareBazaar lookup with caching.
- [ ] **YARA-rule support** in the IOC Hunter.
- [ ] **Memory dump triage** (Volatility profiles).
- [ ] **Multi-investigator mode** with per-user accountability.
- [ ] **Report templates** — Markdown / Word in addition to PDF.
- [ ] **Light theme** to complement the existing accent picker.
- [ ] **Plugin SDK** for custom analyzers.
- [ ] **Encrypted case archives** for hand-off between investigators.

---

## 🤝 Contributing

Issues and PRs welcome. Please:

1. Keep changes focused — one feature/fix per PR.
2. Add types for any new IPC channel in `src/preload/index.ts`.
3. Run `npm run typecheck` and `npm run build` before opening a PR.
4. Match the existing component patterns in `src/renderer/src/components/ui`.

---

## 📄 License

[MIT](./LICENSE) © ArtifactScope contributors.

---

<div align="center">
<sub>Built for forensic officers, blue-teamers, and curious minds.<br />
Local-first by design — your evidence never leaves your machine unless you choose to share it.</sub>
</div>
