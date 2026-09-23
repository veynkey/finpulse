# Local AI Stack & Evidence Synthesis

## 1. Zero Cloud AI Policy

FinPulse Wave MAX uses embedded local AI via `llama.cpp` Rust bindings and local GGUF models (supporting Qwen 2.5 and Gemma 2 model families).
- No external AI API keys (OpenAI, Anthropic, Gemini) are required for core operations.
- GPU acceleration is leveraged natively (Vulkan / CUDA / Metal).

## 2. Evidence-First Synthesis Pipeline

The AI engine never speculates without grounded empirical market telemetry. When queried (e.g., "Why is BTC advancing?"), the engine follows a deterministic multi-step pipeline:

```
User Query / Radar Anomaly Trigger
                │
                ▼
1. Query Market State (24h Price Change, 5m Velocity)
2. Query Volume Z-Score & Baseline Deviation
3. Query Order Flow & Spot Cumulative Volume Delta (CVD)
4. Query Perpetual Funding Rate & Open Interest Delta
5. Query Linked Macro Headlines & Entity Tags
                │
                ▼
Synthesize Structured Evidence Block:
- [FACT] Price change and timeframe
- [VERIFIED TELEMETRY EVIDENCE] Volume Z-Score, CVD, Funding, Contagion
- [INTERPRETATION] Empirical hypothesis
- [CONFIDENCE] High / Moderate / Low
```
