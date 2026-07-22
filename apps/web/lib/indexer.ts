/**
 * 인덱서(가격 API) 리더 — 서버 전용.
 *
 * INDEXER_URL 미설정·다운·데이터 없음이면 null 을 돌려주고,
 * 상세 화면은 기존 "인덱서 연결 후 제공" 자리표시로 폴백한다.
 * 추정치를 확정값처럼 보여주지 않는다 — 실패는 조용히 감춘다 (절대 규칙 1의 정신).
 *
 * bigint 는 전부 문자열 와이어 포맷 — 표시 직전에만 복원한다.
 */

export interface CandleWire {
  /** 버킷 시작 unix 초 (UTC) */
  bucket: number;
  open: string;
  high: string;
  low: string;
  close: string;
  /** quote(WETH) 환산 거래대금 wei */
  volumeWeth: string;
  trades: number;
}

export interface TradeWire {
  id: string;
  side: "buy" | "sell";
  tokenAmount: string;
  wethAmount: string;
  priceWei: string;
  txHash: string;
  timestamp: number;
}

export interface StatsWire {
  /** 당일(UTC) 1d 캔들 open 대비 close, bps */
  changeBps: number;
  volumeWethToday: string;
  tradesToday: number;
  tradersToday: number;
}

export interface AssetMarketWire {
  candles: CandleWire[];
  /** 일봉이 충분히 쌓이기 전에는 시간봉으로 내려간다 */
  interval: "1h" | "1d";
  trades: TradeWire[];
  stats: StatsWire | null;
}

const INDEXER_URL = process.env.INDEXER_URL ?? null;

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!INDEXER_URL) return null;
  try {
    const res = await fetch(`${INDEXER_URL}${path}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 일봉이 이만큼 쌓이기 전에는 시간봉을 보여준다 (테스트넷 초기 구간) */
const DAILY_MIN = 5;

export async function getAssetMarket(
  pair: `0x${string}`,
): Promise<AssetMarketWire | null> {
  const [daily, hourly, tradesRes, stats] = await Promise.all([
    fetchJson<{ candles: CandleWire[] }>(`/candles/${pair}?interval=1d&limit=120`),
    fetchJson<{ candles: CandleWire[] }>(`/candles/${pair}?interval=1h&limit=336`),
    fetchJson<{ trades: TradeWire[] }>(`/trades/${pair}?limit=30`),
    fetchJson<StatsWire>(`/stats/${pair}`),
  ]);

  const useDaily = (daily?.candles.length ?? 0) >= DAILY_MIN;
  const candles = (useDaily ? daily?.candles : hourly?.candles) ?? [];
  if (candles.length === 0) return null;

  return {
    candles,
    interval: useDaily ? "1d" : "1h",
    trades: tradesRes?.trades ?? [],
    stats,
  };
}
