<div align="center">

# 🛡️ ArtifactScope

**A cross-platform digital forensics toolkit for investigators, incident responders, and security researchers.**

Inspect files, recover artifacts, hunt indicators, and document chain of custody — all from a single, fast Electron desktop app.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/Electron-32-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Overview

ArtifactScope brings the most common steps of a forensic investigation into one cohesive workflow:

- **Acquire** evidence and track it with a tamper-evident chain of custody.
- **Analyze** files, images, archives, registries, emails, captures, and disk images.
- **Hunt** IOCs across artifacts and correlate findings on a unified timeline.
- **Report** with court-ready PDF exports tied to your case.

Everything runs locally on your machine. Evidence never leaves your workstation unless you choose to export it.

---

## 🧰 Capabilities

### 🗂️ Case Management
- Create, prioritize, and tag investigations.
- **Tamper-evident chain of custody** — every action is hash-chained and verifiable.
- **Activity log** records every operation for audit and review.

### 🔬 File & Artifact Analysis
| Tool | What it does |
| --- | --- |
| **File Analyzer** | MD5/SHA-1/SHA-256/SHA-512 hashing, magic-byte detection, extension-mismatch alerts, entropy scoring, string extraction, EXIF, hex view. |
| **Image Forensics** | EXIF, GPS extraction, manipulation hints, embedded data review. |
| **Strings / IOC Hunter** | Extract printable strings and surface IPs, URLs, emails, hashes, BTC wallets, and other indicators. |
| **Archive Analyzer** | Inspect ZIP / TAR contents, flag suspicious entries, detect path traversal. |
| **Disk Image** | Walk partitions and recover file metadata from raw images. |

### 🌐 Artifact Recovery
- **Browser Artifacts** — history, downloads, cookies, and visit timelines from Chrome / Edge / Firefox profiles.
- **System Info** — live OS, CPU, memory, network, and process snapshots.
- **Registry Analyzer** *(Windows)* — parse hives, browse keys, inspect values.
- **Email Analyzer** — `.eml`/`.msg` parsing with header authentication checks and attachment inventory.

### 🔍 Investigation
- **Log Analyzer** — multi-format log ingestion with severity grouping and pattern search.
- **Network / PCAP** — packet capture summaries, conversation views, and protocol breakdowns.
- **Timeline** — unified MAC time view across the filesystem with CSV export.
- **SQLite Browser** — open any `.sqlite`/`.db` and run ad-hoc SQL safely.

### 📚 Knowledge & Reporting
- **Hash Database** — local known-good / known-bad / suspicious hash lookup with CSV import.
- **Reports** — generate branded PDF reports per case with evidence, hashes, and findings.
- **Settings** — investigator defaults, theme, hash algorithm preferences, and external service keys.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- Platform-specific build tools for `better-sqlite3` (Xcode CLT on macOS, build-essential on Linux, Visual Studio Build Tools on Windows).

### Install & Run

```bash
git clone <repo-url> ArtifactScope
cd ArtifactScope
npm install
npm run dev
```

### Build for Production

```bash
npm run build         # build all targets
npm run build:mac     # macOS bundle
npm run build:win     # Windows installer
npm run build:linux   # Linux AppImage / deb
```

Artifacts land in `dist/` (or `out/` for unpacked builds).

### Quality Gates

```bash
npm run typecheck     # strict TS across main + renderer
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Renderer (React + Tailwind)                │  ← UI, pages, stores
│    └─ src/renderer/src                      │
├─────────────────────────────────────────────┤
│  Preload (contextBridge)                    │  ← typed IPC surface
│    └─ src/preload/index.ts                  │
├─────────────────────────────────────────────┤
│  Main (Electron + Node)                     │
│    ├─ src/main/forensics  ← analyzers       │
│    ├─ src/main/db         ← SQLite stores   │
│    └─ src/main/util       ← logging, paths  │
└─────────────────────────────────────────────┘
```

**Stack**

- **Electron 32** + **electron-vite** — desktop shell & build pipeline
- **React 18** + **React Router 6** + **Zustand** — UI and state
- **Tailwind CSS** + **lucide-react** + **framer-motion** — design system
- **better-sqlite3** — local case database, hash DB, activity log
- **recharts** — visualizations
- **exifreader**, **node-stream-zip** — artifact parsers

---

## 🔐 Data & Privacy

- All databases live under the OS-appropriate user-data directory.
- No telemetry. No background network calls unless an external service is explicitly configured (e.g., VirusTotal API key).
- Custody and activity logs are hash-chained — modifying or deleting a row breaks the chain on the next integrity check.

---

## 🗺️ Project Layout

```
src/
├── main/                # Electron main process
│   ├── db/              # SQLite stores (cases, evidence, custody, hashdb, activity)
│   ├── forensics/       # File / image / log / pcap / registry analyzers, hashing, magic bytes
│   ├── util/            # Logging, paths, progress events
│   ├── ipc.ts           # IPC channel registry
│   └── index.ts         # App bootstrap & window lifecycle
├── preload/
│   └── index.ts         # contextBridge — exposes the typed `window.bridge` API
└── renderer/
    └── src/
        ├── pages/       # One file per tool (Dashboard, FileAnalyzer, …)
        ├── components/  # ui/ + layout/ primitives
        ├── lib/         # api wrapper, formatters, classnames
        ├── stores/      # Zustand stores
        └── styles/      # Tailwind entry & globals
```

---

## 🤝 Contributing

Issues and PRs are welcome. Please keep changes scoped, add types for any new IPC channel, and run `npm run typecheck` before opening a PR.

---

## 📄 License

MIT © ArtifactScope contributors. See [LICENSE](./LICENSE).

---

<div align="center">
<sub>Built for forensic officers, blue-teamers, and curious minds.</sub>
</div>
