# Security Architecture & Boundary Model

## 1. Native OS Secret Management

API secrets (such as exchange API credentials) are stored exclusively in the host operating system's native secure credential manager:
- Windows: Windows Credential Manager (via Windows Vault DPAPI)
- macOS: Keychain Services
- Linux: Secret Service API / D-Bus Secret Service

All secret inputs are wrapped in zeroized memory structures (`secrecy::SecretString`).

## 2. Hard Security Boundary

Under NO circumstances is an API secret ever serialized or returned back across the Tauri IPC bridge to the React frontend.
- React frontend may issue `save_api_credential`, `has_api_credential`, or `test_connection`.
- Rust constructs, signs, and executes authenticated HTTP/WS calls internally.
- There is no `get_api_key()` command exposed to the webview.

## 3. Sandboxed AI Execution

The embedded LLM execution engine operates strictly under read-only, non-destructive constraints:
- Cannot access raw filesystem paths.
- Cannot execute shell commands.
- Cannot autonomously trigger live market order execution.
- Can only query approved internal deterministic analytical tools (`get_market_snapshot`, `get_orderflow`, `get_risk`).
