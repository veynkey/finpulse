# FinPulse Wave MAX

> A professional local-first market intelligence workstation inspired by the workflow philosophy of Bloomberg Terminal, built for desktop environments.

---

## 1. What FinPulse Wave MAX Is

- A high-density, keyboard-first financial market workstation.
- A local-first analytical engine that computes order flow, anomalies, and risk on-device.
- An evidence-first intelligence platform powered by local GGUF AI models.
- An embedded database architecture utilizing DuckDB and Parquet storage tiers.

## 2. What FinPulse Wave MAX Is NOT

- Not a personal finance tracker, budget planner, or expense manager.
- Not a generic crypto dashboard or CRUD accounting portal.
- Not a web dashboard packaged in an inefficient cloud shell.
- Not a chatbot with a chart beside it.
- Not a cloud SaaS product reliant on external database servers.

---

## 3. Technology Stack & Prerequisites

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Institutional Dark Palette)
- **Grid Layout:** `react-grid-layout`
- **Charting:** `lightweight-charts` (Multi-pane Candlestick + Volume)
- **Icons:** `lucide-react`

### Backend
- **Desktop Runtime:** Tauri v2
- **Language:** Rust (Tokio asynchronous runtime)
- **Database:** Embedded DuckDB (`duckdb-rs`) with thread-isolated workers
- **WebSocket:** `tokio-tungstenite` with native TLS
- **Security:** OS Native Secret Manager via `keyring`

---

## 4. How to Run

### Development Mode (Web / Desktop Shell)
```bash
# In e:\Blomba\finpulse
npm install
npm run dev
```

### Tauri Native Desktop Application
```bash
# Requires Rust toolchain (rustc & cargo)
npm run tauri dev
```

### Production Build
```bash
npm run build
npm run tauri build
```

---

## 5. Keyboard Navigation & Commands

Open the command bar anywhere with `Ctrl+K`.

Supported FinPulse Command Grammar:
- `<SYMBOL>` (e.g. `BTC`, `ETH`, `NVDA`): Switches active focus on the linked group.
- `<SYMBOL> CHART`: Displays candlestick chart.
- `<SYMBOL> FLOW`: Displays Time & Sales tape and Cumulative Volume Delta.
- `<SYMBOL> AI`: Queries the local evidence analyst.
- `<SYMBOL> REPLAY`: Initiates historical tick replay.
- `SCAN <QUERY>` (e.g. `SCAN VOL>2`): Executes FinQL anomaly screener.
- `PORT` / `RISK`: Switches to Portfolio and Quant Risk Engine.
- `COMPACT` / `PRO` / `ULTRA`: Adjusts terminal visual density.

---

## 6. How Secrets & Data are Managed

- **API Secrets:** Stored securely in the operating system's native credential vault (Windows Credential Manager, macOS Keychain, Linux Secret Service). Secrets are never transmitted back to the webview.
- **Local Data:** In-process DuckDB files (`finpulse.db`) and Parquet cold archives are maintained locally.
- **Data Reset:** To reset database state, delete `finpulse.db` and the `data/` directory.
