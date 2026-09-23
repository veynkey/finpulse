import React, { useState, useEffect, useRef } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { CANONICAL_INSTRUMENTS } from '../services/instruments';
import { Terminal, ArrowRight } from 'lucide-react';

interface Suggestion {
  type: 'INSTRUMENT' | 'COMMAND' | 'FINQL';
  label: string;
  sublabel: string;
  command: string;
}

export default function CommandModal() {
  const { isCommandOpen, setIsCommandOpen, executeCommand } = useTerminal();
  const [inputVal, setInputVal] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setStatusMessage(null);
    }
  }, [isCommandOpen]);

  // Compute suggestions based on input
  const suggestions: Suggestion[] = React.useMemo(() => {
    const q = inputVal.trim().toUpperCase();
    const list: Suggestion[] = [];

    if (!q) {
      list.push(
        { type: 'COMMAND', label: 'BTC CHART', sublabel: 'Focus BTC on linked Chart', command: 'BTC CHART' },
        { type: 'COMMAND', label: 'ETH FLOW', sublabel: 'Open Ethereum Order Flow & Tape', command: 'ETH FLOW' },
        { type: 'FINQL', label: 'SCAN VOL>2', sublabel: 'Filter assets with volume Z-score > 2.0', command: 'SCAN VOL>2' },
        { type: 'COMMAND', label: 'PORT', sublabel: 'Switch to Portfolio & Risk Analytics', command: 'PORT' },
        { type: 'COMMAND', label: 'PRO', sublabel: 'Switch Terminal Density to Professional', command: 'PRO' },
        { type: 'COMMAND', label: 'ULTRA', sublabel: 'Switch Terminal Density to Ultra Dense', command: 'ULTRA' }
      );
      return list;
    }

    // Matching instruments
    CANONICAL_INSTRUMENTS.forEach((inst) => {
      if (inst.symbol.includes(q) || inst.displaySymbol.toUpperCase().includes(q) || inst.name.toUpperCase().includes(q)) {
        list.push({
          type: 'INSTRUMENT',
          label: inst.displaySymbol,
          sublabel: `${inst.name} [${inst.venue}]`,
          command: inst.symbol,
        });
      }
    });

    // Command options for matching symbol
    if (q.startsWith('BTC') || q.startsWith('ETH') || q.startsWith('SOL')) {
      const sym = q.split(/\s+/)[0];
      list.push(
        { type: 'COMMAND', label: `${sym} CHART`, sublabel: `View ${sym} candlestick chart`, command: `${sym} CHART` },
        { type: 'COMMAND', label: `${sym} FLOW`, sublabel: `View ${sym} Time & Sales and CVD`, command: `${sym} FLOW` },
        { type: 'COMMAND', label: `${sym} AI`, sublabel: `Ask local AI analyst about ${sym}`, command: `${sym} AI` },
        { type: 'COMMAND', label: `${sym} REPLAY`, sublabel: `Start historical replay for ${sym}`, command: `${sym} REPLAY` }
      );
    }

    // Common FinQL commands
    if ('SCAN'.startsWith(q)) {
      list.push({ type: 'FINQL', label: 'SCAN VOL>3', sublabel: 'Screen assets with abnormal volume', command: 'SCAN VOL>3' });
    }
    if ('CORR'.startsWith(q)) {
      list.push({ type: 'FINQL', label: 'CORR BTC ETH 90D', sublabel: 'Compute correlation matrix', command: 'CORR BTC ETH 90D' });
    }

    return list.slice(0, 8);
  }, [inputVal]);

  const handleSelect = (cmd: string) => {
    const res = executeCommand(cmd);
    setStatusMessage(res.message);
    setTimeout(() => {
      setIsCommandOpen(false);
      setInputVal('');
      setStatusMessage(null);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % Math.max(1, suggestions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex].command);
      } else if (inputVal.trim()) {
        handleSelect(inputVal.trim());
      }
    }
  };

  if (!isCommandOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-start justify-center pt-20 select-none font-mono"
      onClick={() => setIsCommandOpen(false)}
    >
      <div
        className="w-[620px] bg-[#111317] border border-[#2d3139] rounded shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input bar */}
        <div className="flex items-center px-3 py-2.5 border-b border-border/80 bg-[#16181f]">
          <Terminal className="w-4 h-4 text-accent mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type symbol, action, or FinQL (e.g. 'BTC CHART', 'PRO', 'SCAN VOL>2')..."
            className="w-full bg-transparent border-none outline-none text-sm text-text placeholder-muted"
          />
          <span className="text-[10px] text-muted border border-border/60 px-1.5 py-0.5 rounded ml-2 shrink-0">
            ESC to close
          </span>
        </div>

        {/* Status notice */}
        {statusMessage && (
          <div className="bg-accent/20 text-accent px-3 py-1.5 text-xs border-b border-accent/40 font-semibold">
            {statusMessage}
          </div>
        )}

        {/* Suggestions list */}
        <div className="max-h-[340px] overflow-auto divide-y divide-border/20 py-1">
          {suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={idx}
                onClick={() => handleSelect(item.command)}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-accent/20 border-l-2 border-l-accent' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                      item.type === 'INSTRUMENT'
                        ? 'bg-up/20 text-up'
                        : item.type === 'FINQL'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-white/10 text-muted'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="font-bold text-text text-xs">{item.label}</span>
                  <span className="text-muted text-[11px] truncate max-w-[280px]">{item.sublabel}</span>
                </div>
                {isSelected && <ArrowRight className="w-3.5 h-3.5 text-accent" />}
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="bg-[#0c0d10] px-3 py-1.5 border-t border-border/50 text-[10px] text-muted flex justify-between">
          <span>Arrows: Navigate</span>
          <span>Enter: Execute</span>
          <span>Tab: Autocomplete</span>
        </div>
      </div>
    </div>
  );
}
