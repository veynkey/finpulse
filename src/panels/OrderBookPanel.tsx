import { useState, useEffect } from 'react';
import { useTerminal } from '../context/TerminalContext';
import { marketData } from '../services/marketData';
import type { LinkGroup, OrderBook } from '../types';
import PanelHeader from './PanelHeader';

export default function OrderBookPanel({ defaultGroup = 'BLUE' }: { defaultGroup?: LinkGroup }) {
  const { getSymbolForGroup } = useTerminal();
  const [linkGroup, setLinkGroup] = useState<LinkGroup>(defaultGroup);
  const activeInstrument = getSymbolForGroup(linkGroup);
  const [book, setBook] = useState<OrderBook | null>(null);

  useEffect(() => {
    const unsub = marketData.subscribeBook((newBook) => {
      if (newBook.instrumentId === activeInstrument.id) {
        setBook(newBook);
      }
    });
    return () => {
      unsub();
    };
  }, [activeInstrument.id]);

  const maxTotal = Math.max(
    book?.bids[book.bids.length - 1]?.total || 1,
    book?.asks[book.asks.length - 1]?.total || 1
  );

  return (
    <div className="flex flex-col h-full bg-[#0b0c10] text-xs font-mono select-none">
      <PanelHeader
        title={`ORDER BOOK [${activeInstrument.displaySymbol}]`}
        linkGroup={linkGroup}
        onLinkGroupChange={setLinkGroup}
        actions={
          book && (
            <div className="text-[10px] text-muted">
              SPREAD: <span className="text-text font-bold">{book.spread}</span> ({book.spreadBps} bps)
            </div>
          )
        }
      />

      <div className="grid grid-cols-2 text-[10px] uppercase text-muted bg-[#121418] px-2 py-0.5 border-b border-border/40">
        <div className="flex justify-between">
          <span>Size</span>
          <span>Bid</span>
        </div>
        <div className="flex justify-between pl-3">
          <span>Ask</span>
          <span>Size</span>
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex flex-col justify-between p-1">
        {/* Asks (Sell orders, highest on top) */}
        <div className="flex flex-col justify-end space-y-0.5 overflow-hidden flex-1">
          {book?.asks.slice(0, 8).reverse().map((ask, idx) => {
            const pct = Math.min(100, (ask.total / maxTotal) * 100);
            return (
              <div key={idx} className="relative flex justify-between px-1 text-[11px] h-4 items-center">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-down/15 pointer-events-none"
                  style={{ width: `${pct}%` }}
                />
                <span className="text-muted z-10">{ask.size.toFixed(2)}</span>
                <span className="text-down font-semibold z-10">{ask.price.toFixed(activeInstrument.priceDecimals)}</span>
              </div>
            );
          })}
        </div>

        {/* Mid price bar */}
        <div className="py-1 px-2 my-0.5 bg-[#15181f] border-y border-border/50 flex justify-between items-center text-xs">
          <span className="text-muted text-[10px]">MID</span>
          <span className="font-bold text-text text-sm">
            {book ? book.midPrice.toFixed(activeInstrument.priceDecimals) : '---'}
          </span>
          <span className="text-muted text-[10px]">{activeInstrument.quoteCurrency || 'USD'}</span>
        </div>

        {/* Bids (Buy orders) */}
        <div className="flex flex-col space-y-0.5 overflow-hidden flex-1">
          {book?.bids.slice(0, 8).map((bid, idx) => {
            const pct = Math.min(100, (bid.total / maxTotal) * 100);
            return (
              <div key={idx} className="relative flex justify-between px-1 text-[11px] h-4 items-center">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-up/15 pointer-events-none"
                  style={{ width: `${pct}%` }}
                />
                <span className="text-up font-semibold z-10">{bid.price.toFixed(activeInstrument.priceDecimals)}</span>
                <span className="text-muted z-10">{bid.size.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
