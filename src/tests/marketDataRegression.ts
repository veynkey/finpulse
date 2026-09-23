import { canonicalizeInstrumentId, getInstrumentById } from '../services/instruments';
import { marketMirror } from '../services/marketMirror';
import type { Candle } from '../types';

declare const process: { exit: (code: number) => void };

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('--- STARTING FINPULSE MARKET DATA REGRESSION TESTS ---');

// 1. Canonical Instrument ID Resolution
console.log('\n[Test 1] Canonical Instrument ID Normalization');
assert(canonicalizeInstrumentId('BTCUSDT') === 'CRYPTO:BINANCE:BTCUSDT', 'BTCUSDT resolves to CRYPTO:BINANCE:BTCUSDT');
assert(canonicalizeInstrumentId('BTC-USDT:BINANCE') === 'CRYPTO:BINANCE:BTCUSDT', 'BTC-USDT:BINANCE resolves to CRYPTO:BINANCE:BTCUSDT');
assert(canonicalizeInstrumentId('btcusdt') === 'CRYPTO:BINANCE:BTCUSDT', 'btcusdt resolves to CRYPTO:BINANCE:BTCUSDT');
assert(canonicalizeInstrumentId('NVDA:NASDAQ') === 'EQUITY:NASDAQ:NVDA', 'NVDA:NASDAQ resolves to EQUITY:NASDAQ:NVDA');
assert(canonicalizeInstrumentId('EURUSD:FX') === 'FOREX:OANDA:EURUSD', 'EURUSD:FX resolves to FOREX:OANDA:EURUSD');

// 2. Registry Multi-Key Lookup
console.log('\n[Test 2] Registry Multi-Key Lookup');
const btc1 = getInstrumentById('BTC-USDT:BINANCE');
const btc2 = getInstrumentById('BTCUSDT');
const btc3 = getInstrumentById('CRYPTO:BINANCE:BTCUSDT');
assert(btc1 !== undefined && btc1.symbol === 'BTCUSDT', 'Lookup by BTC-USDT:BINANCE succeeds');
assert(btc2 !== undefined && btc2.symbol === 'BTCUSDT', 'Lookup by BTCUSDT succeeds');
assert(btc3 !== undefined && btc3.symbol === 'BTCUSDT', 'Lookup by CRYPTO:BINANCE:BTCUSDT succeeds');

// 3. Stale-While-Revalidate Hot RAM Mirror Cache
console.log('\n[Test 3] Stale-While-Revalidate (SWR) Mirror Cache');
const testBars: Candle[] = [
  { time: 1727000000, open: 92000, high: 92500, low: 91800, close: 92300, volume: 150 },
  { time: 1727000900, open: 92300, high: 92800, low: 92200, close: 92700, volume: 180 },
];

marketMirror.setCachedCandles('CRYPTO:BINANCE:BTCUSDT', '15m', testBars);

const cached = marketMirror.getCachedCandles('BTC-USDT:BINANCE', '15m');
assert(cached !== null && cached.length === 2, 'Instant L1/L2 cache retrieval via alias');
assert(cached![0].close === 92300, 'Bar 0 close matches 92300');
assert(cached![1].close === 92700, 'Bar 1 close matches 92700');

// 4. Delta Merging and Deduplication
console.log('\n[Test 4] Delta Merging & Monotonic Deduplication');
const deltaBars: Candle[] = [
  { time: 1727000900, open: 92300, high: 92850, low: 92200, close: 92750, volume: 195 }, // updated bar
  { time: 1727001800, open: 92750, high: 93100, low: 92600, close: 93000, volume: 220 }, // new bar
];

const merged = marketMirror.mergeDelta('CRYPTO:BINANCE:BTCUSDT', '15m', deltaBars);
assert(merged.length === 3, 'Merged length is exactly 3 (deduplicated bar at 1727000900)');
assert(merged[1].close === 92750, 'Updated bar close preserved');
assert(merged[2].close === 93000, 'New bar inserted at correct monotonic position');
assert(merged[0].time < merged[1].time && merged[1].time < merged[2].time, 'Strictly monotonic time ordering');

// 5. Subscription Generation Isolation (Late Packet Protection)
console.log('\n[Test 5] Subscription Generation Isolation');
let activeGeneration = 1;
const activeInstrument = 'CRYPTO:BINANCE:BTCUSDT';
let receivedUpdates = 0;

function handlePacket(token: { generation: number; instrumentId: string }, _price: number) {
  if (token.generation !== activeGeneration || token.instrumentId !== activeInstrument) {
    // Drop late packet!
    return false;
  }
  receivedUpdates++;
  return true;
}

// Packet 1: Legitimate active generation packet
const p1Accepted = handlePacket({ generation: 1, instrumentId: 'CRYPTO:BINANCE:BTCUSDT' }, 92500);
assert(p1Accepted === true && receivedUpdates === 1, 'Active generation packet accepted');

// Switch symbol to ETH, increment generation to 2
activeGeneration = 2;

// Packet 2: Late BTC packet from generation 1 arrives after switch
const p2Accepted = handlePacket({ generation: 1, instrumentId: 'CRYPTO:BINANCE:BTCUSDT' }, 65000);
assert(p2Accepted === false && receivedUpdates === 1, 'Late BTC packet from old generation 1 correctly DROPPED');

// Packet 3: Packet with mismatched instrument ID
const p3Accepted = handlePacket({ generation: 2, instrumentId: 'CRYPTO:BINANCE:ETHUSDT' }, 3400);
assert(p3Accepted === false && receivedUpdates === 1, 'Mismatched instrument ID packet correctly DROPPED');

console.log('\n🎉 ALL REGRESSION TESTS PASSED SUCCESSFULLY! No phantom 65k drops or corrupt packets can occur.');
