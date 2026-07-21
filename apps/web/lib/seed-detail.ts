/**
 * ⚠️ 상세 페이지 데모 시드 (절대 규칙 5: 숨기지 않는다)
 *
 * 캔들·체결 내역은 자산 심볼 기반 결정적 PRNG로 생성한다.
 * 캔들 종가는 목록 화면의 윈도우 변동률(오늘/1주/1개월)과
 * 경계가 정확히 일치하도록 앵커를 강제한다 — 화면 간 정합성 보장.
 *
 * 이 레이어는 차트 표시 전용 기하 데이터라 float 를 쓴다.
 * 실제 지표 파이프라인(bigint)은 packages/shared 에 있고,
 * 인덱서/가격 API 단계에서 이 모듈 전체가 대체된다.
 */

import { weiToDisplayKrw } from "@giwa/shared";
import type { VerifiedAsset, WeiAmount } from "@giwa/shared";
import { hashSeed, mulberry32 } from "./prng";
import { MOCK_ETH_KRW } from "./seed-data";

export interface DailyCandle {
  time: string; // yyyy-mm-dd (일봉)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 원화 환산 거래대금
}

export interface SeedTrade {
  agoLabel: string;
  side: "buy" | "sell";
  priceKrw: number;
  tokens: number;
  valueKrw: number;
  txHash: string;
}

export const TOTAL_DAYS = 120;

/** 데모 고정 기준일 — 시드 재현성을 위해 고정한다 */
const LAST_DAY_UTC = Date.UTC(2026, 6, 21);

/** wei → 원화 환산 float (차트 기하 전용) */
export function asKrwNumber(v: WeiAmount): number {
  return Number(weiToDisplayKrw(v, MOCK_ETH_KRW)) / 1000;
}

/** 가격대별 소수 자릿수 — formatKrw 표시 규칙과 동일 */
export function priceDecimals(p: number): number {
  return p >= 1000 ? 0 : p >= 100 ? 1 : 2;
}

function dayString(i: number): string {
  const d = new Date(LAST_DAY_UTC - (TOTAL_DAYS - 1 - i) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function generateCandles(asset: VerifiedAsset): DailyCandle[] {
  const rnd = mulberry32(hashSeed(asset.symbol));
  const end = asKrwNumber(asset.priceWei);
  const t = asset.stats.today.changeBps / 10_000;
  const w = asset.stats.week.changeBps / 10_000;
  const m = asset.stats.month.changeBps / 10_000;
  const last = TOTAL_DAYS - 1;

  // 앵커: 각 윈도우 시가 = 현재가 / (1 + 변동률) — 목록 화면과 경계 일치
  const anchors: readonly [number, number][] = [
    [0, (end / (1 + m)) * (0.82 + rnd() * 0.5)],
    [last - 30, end / (1 + m)],
    [last - 7, end / (1 + w)],
    [last - 1, end / (1 + t)],
    [last, end],
  ];

  // 일 변동성: 월 변동 크기에 비례, 0.6% ~ 4.5% 클램프
  const vol = Math.min(0.045, Math.max(0.006, Math.abs(m) / 18 + 0.008));

  const closes = new Array<number>(TOTAL_DAYS).fill(end);
  for (let s = 0; s + 1 < anchors.length; s++) {
    const a = anchors[s];
    const b = anchors[s + 1];
    if (!a || !b) continue;
    const [ai, av] = a;
    const [bi, bv] = b;
    closes[ai] = av;
    const steps = bi - ai;
    let cur = Math.log(av);
    const target = Math.log(bv);
    for (let i = 1; i <= steps; i++) {
      if (i === steps) {
        cur = target; // 앵커 강제 — 변동률 정합성
      } else {
        const drift = (target - cur) / (steps - i + 1);
        cur += drift + (rnd() * 2 - 1) * vol;
      }
      closes[ai + i] = Math.exp(cur);
    }
  }

  const baseVolKrw = asKrwNumber(asset.stats.today.volumeWei);
  const out: DailyCandle[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const close = closes[i] ?? end;
    const open =
      i === 0
        ? close * (1 + (rnd() * 2 - 1) * vol * 0.5)
        : (closes[i - 1] ?? close);
    const high = Math.max(open, close) * (1 + rnd() * vol * 0.7);
    const low = Math.min(open, close) * (1 - rnd() * vol * 0.7);
    const ret = Math.abs(close / open - 1);
    const volume = baseVolKrw * (0.35 + rnd() * 1.3) * (1 + ret / vol);
    out.push({
      time: dayString(i),
      open,
      high,
      low: Math.max(low, Number.MIN_VALUE),
      close,
      volume,
    });
  }
  return out;
}

const TRADE_COUNT = 12;

export function generateTrades(asset: VerifiedAsset): SeedTrade[] {
  const rnd = mulberry32(hashSeed(`${asset.symbol}:trades`));
  const price = asKrwNumber(asset.priceWei);
  const todayVolKrw = asKrwNumber(asset.stats.today.volumeWei);
  // 오늘 상승 자산은 매수 우위로 — 방향과 체결 흐름의 결이 맞아야 자연스럽다
  const buyBias = asset.stats.today.changeBps >= 0 ? 0.64 : 0.38;

  const out: SeedTrade[] = [];
  let minutesAgo = 4 + Math.floor(rnd() * 40);
  for (let i = 0; i < TRADE_COUNT; i++) {
    const side: SeedTrade["side"] = rnd() < buyBias ? "buy" : "sell";
    const p = price * (1 + (rnd() * 2 - 1) * 0.012);
    const valueKrw = (todayVolKrw / TRADE_COUNT) * (0.25 + rnd() * 1.9);
    let txHash = "0x";
    for (let k = 0; k < 64; k++) {
      txHash += Math.floor(rnd() * 16).toString(16);
    }
    out.push({
      agoLabel: agoLabel(minutesAgo),
      side,
      priceKrw: p,
      tokens: valueKrw / p,
      valueKrw,
      txHash,
    });
    minutesAgo += 8 + Math.floor(rnd() * 170);
  }
  return out;
}

function agoLabel(min: number): string {
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 데모 풀 주소 — 자산 심볼에서 결정적으로 생성 */
export function poolAddress(asset: VerifiedAsset): `0x${string}` {
  const rnd = mulberry32(hashSeed(`${asset.symbol}:pool`));
  let a = "0x";
  for (let k = 0; k < 40; k++) a += Math.floor(rnd() * 16).toString(16);
  return a as `0x${string}`;
}
