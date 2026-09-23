import { useTerminal } from '../context/TerminalContext';
import { Wifi, Database, Cpu, Radio } from 'lucide-react';

export default function StatusBar() {
  const { telemetry, replay, linkedSymbols } = useTerminal();

  return (
    <div className="h-6 border-t border-border bg-[#0d0f13] shrink-0 flex items-center justify-between px-3 text-[11px] font-mono text-muted select-none z-20">
      {/* Left: Active context groups */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <Radio className="w-3 h-3 text-accent animate-pulse" />
          <span className="text-[10px] text-muted">CONTEXT:</span>
          <span className="bg-[#0070f3]/20 text-[#0070f3] px-1 rounded text-[10px] font-bold">
            B: {linkedSymbols.BLUE.split(':')[0]}
          </span>
          <span className="bg-[#00c853]/20 text-[#00c853] px-1 rounded text-[10px] font-bold">
            G: {linkedSymbols.GREEN.split(':')[0]}
          </span>
        </div>

        {replay.isActive && (
          <div className="bg-down/20 text-down font-bold px-1.5 rounded text-[10px]">
            [REPLAY {replay.speed}x]
          </div>
        )}
      </div>

      {/* Right: Live Telemetry */}
      <div className="flex items-center space-x-4">
        {/* WS Connection & Latency */}
        <div className="flex items-center space-x-1 text-text">
          <Wifi className="w-3 h-3 text-up" />
          <span>BINANCE WS: <strong className="text-up">{Math.round(telemetry.wsLatencyMs)}ms</strong></span>
        </div>

        {/* Throughput */}
        <div>
          STREAM: <strong className="text-text">{telemetry.messagesPerSecond.toLocaleString()} msg/s</strong>
        </div>

        {/* DuckDB In-process */}
        <div className="flex items-center space-x-1">
          <Database className="w-3 h-3 text-accent" />
          <span>DUCKDB: <strong className="text-text">{telemetry.dbLatencyMs}ms</strong></span>
        </div>

        {/* Hardware Load */}
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-muted" />
          <span>GPU: <strong className="text-text">{Math.round(telemetry.gpuPercent)}%</strong></span>
          <span>RAM: <strong className="text-text">{telemetry.memoryMb}MB</strong></span>
        </div>

        {/* AI Engine */}
        <div className="text-[10px]">
          AI: <span className="text-up font-bold">{telemetry.aiStatus}</span> (LOCAL GGUF)
        </div>

        {/* Live Indicator */}
        <div className="flex items-center space-x-1 font-bold text-up text-[10px]">
          <div className="w-2 h-2 rounded-full bg-up animate-ping" />
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}
