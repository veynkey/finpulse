import { useTerminal } from '../context/TerminalContext';
import PanelHeader from './PanelHeader';
import { Play, Pause, RotateCcw, FastForward, Film } from 'lucide-react';

export default function ReplayPanel() {
  const { replay, setReplay } = useTerminal();

  const speeds = [0.5, 1, 2, 5, 10, 50];

  const togglePlay = () => {
    setReplay((prev) => ({
      ...prev,
      isActive: true,
      isPlaying: !prev.isPlaying,
    }));
  };

  const resetReplay = () => {
    setReplay((prev) => ({
      ...prev,
      currentTimestamp: prev.startTimestamp,
      isPlaying: false,
    }));
  };

  const handleSeek = (pct: number) => {
    const range = replay.endTimestamp - replay.startTimestamp;
    const target = replay.startTimestamp + (range * pct) / 100;
    setReplay((prev) => ({
      ...prev,
      currentTimestamp: target,
    }));
  };

  const currentProgress = Math.min(
    100,
    Math.max(
      0,
      ((replay.currentTimestamp - replay.startTimestamp) / (replay.endTimestamp - replay.startTimestamp)) * 100
    )
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] text-xs font-mono select-none">
      <PanelHeader
        title="HISTORICAL MARKET REPLAY ENGINE"
        actions={
          <div className="flex items-center space-x-1">
            <span
              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                replay.isActive ? 'bg-up/20 text-up' : 'bg-white/10 text-muted'
              }`}
            >
              {replay.isActive ? (replay.isPlaying ? 'REPLAYING' : 'PAUSED') : 'OFFLINE'}
            </span>
          </div>
        }
      />

      <div className="flex-grow p-3 flex flex-col justify-between space-y-3">
        {/* Timeline Scrub Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted">
            <span>{new Date(replay.startTimestamp).toLocaleDateString()} 00:00 UTC</span>
            <span className="text-accent font-bold">
              {new Date(replay.currentTimestamp).toLocaleTimeString()}
            </span>
            <span>{new Date(replay.endTimestamp).toLocaleDateString()} 23:59 UTC</span>
          </div>

          <div
            className="w-full h-3 bg-[#1e222b] rounded cursor-pointer relative overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = (clickX / rect.width) * 100;
              handleSeek(pct);
            }}
          >
            <div className="h-full bg-accent transition-all duration-75" style={{ width: `${currentProgress}%` }} />
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-md -ml-0.5"
              style={{ left: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-between bg-[#121419] p-2 rounded border border-border/50">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={togglePlay}
              className={`p-2 rounded font-bold flex items-center justify-center transition-colors ${
                replay.isPlaying ? 'bg-down hover:bg-down/80 text-white' : 'bg-accent hover:bg-accent/80 text-white'
              }`}
            >
              {replay.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={resetReplay}
              className="p-2 bg-white/5 hover:bg-white/10 rounded text-muted hover:text-text transition-colors"
              title="Reset Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1">
            <FastForward className="w-3.5 h-3.5 text-muted mr-1" />
            {speeds.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setReplay((prev) => ({ ...prev, speed: spd }))}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  replay.speed === spd ? 'bg-accent text-white font-bold' : 'text-muted hover:text-text bg-white/5'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Status Callout */}
        <div className="bg-black/40 border border-border/30 rounded p-2 text-[10px] text-muted flex items-start space-x-2">
          <Film className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <div>
            Replay operates through the identical fast-path normalizer pipeline, replaying L2 book snapshots, order-flow ticks, and calculated radar events synchronously.
          </div>
        </div>
      </div>
    </div>
  );
}
