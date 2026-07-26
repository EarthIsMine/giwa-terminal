/**
 * 업비트 KRW-ETH 시세 주입 (지표 정의 §USD/KRW 환산).
 * 업비트 시세를 쓰는 것은 타겟 유저에게 익숙한 숫자를 보여주기 위한 의도적 선택 —
 * 다른 소스로 바꾸지 않는다. 캐시 60초. 실패 시 null → 화면은 원화를 감추고
 * ETH로 폴백한다 (추정치를 확정값처럼 보여주지 않는다).
 */
/** 하단 바 시세 — 업비트 원화 시장의 실제 체결가다(온체인 환산값이 아니다) */
export interface MarketTickerWire {
  symbol: string;
  /** DisplayKrw(0.001원 단위) 문자열 bigint */
  krw: string;
  /** 전일 대비 변동률 (bps) */
  changeBps: number;
}

const BAR_MARKETS = ["KRW-BTC", "KRW-ETH", "KRW-XRP", "KRW-USDT"] as const;

export interface MarketBarWire {
  tickers: MarketTickerWire[];
  /** USD/KRW 매매기준율 (원, 소수 2자리 → 0.01원 단위 정수) */
  usdKrwCents: number | null;
  /** 김치 프리미엄 (bps). 업비트 BTC 원화가 vs 해외 BTC × 환율 */
  kimchiBps: number | null;
}

/** USD/KRW — 무인증 공개 환율(영업일 종가 기준). 실패 시 null → 환율·김프를 숨긴다 */
async function getUsdKrw(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=KRW", {
      next: { revalidate: 3_600 },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null || !("rates" in body)) return null;
    const rates = (body as { rates: unknown }).rates;
    if (typeof rates !== "object" || rates === null || !("KRW" in rates)) return null;
    const krw = Number((rates as { KRW: unknown }).KRW);
    return Number.isFinite(krw) && krw > 0 ? krw : null;
  } catch {
    return null;
  }
}

/** 해외 BTC 기준가(USDT) — 김프 계산의 분모. 실패 시 null → 김프를 숨긴다 */
async function getGlobalBtcUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null || !("price" in body)) return null;
    const price = Number((body as { price: unknown }).price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * 업비트 주요 원화 시세 — 업저씨에게 익숙한 기준점을 하단 바에 상시 띄운다.
 * 나루 화면의 "환산 참고값"과 달리 이건 거래소 실제 원화 체결가이므로
 * 출처(업비트)를 화면에 명시한다. 캐시 60초, 실패 시 빈 배열(바에서 숨김).
 */
export async function getMarketTickers(): Promise<MarketTickerWire[]> {
  try {
    const res = await fetch(
      `https://api.upbit.com/v1/ticker?markets=${BAR_MARKETS.join(",")}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return [];

    const out: MarketTickerWire[] = [];
    for (const row of body) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      const market = typeof r.market === "string" ? r.market : null;
      const price = Number(r.trade_price);
      const rate = Number(r.signed_change_rate);
      if (!market || !Number.isFinite(price) || price <= 0) continue;
      out.push({
        symbol: market.replace("KRW-", ""),
        // 원 단위 → DisplayKrw(0.001원 단위). 표시 직전까지 bigint로 다룬다
        krw: (BigInt(Math.floor(price)) * 1_000n).toString(),
        changeBps: Number.isFinite(rate) ? Math.trunc(rate * 10_000) : 0,
      });
    }
    // 요청 순서(BTC·ETH·XRP·USDT)를 화면 순서로 고정한다
    return BAR_MARKETS.map((m) =>
      out.find((t) => t.symbol === m.replace("KRW-", "")),
    ).filter((t): t is MarketTickerWire => t !== undefined);
  } catch {
    return [];
  }
}

/**
 * 하단 바 시세 묶음 — 업비트 원화 시세 + USD/KRW + 김치 프리미엄.
 *
 * 김프 = 업비트 BTC 원화가 ÷ (해외 BTC 달러가 × USD/KRW) − 1.
 * 해외 기준가는 USDT 마켓이라 엄밀히는 USDT 기준이지만, 국내에서 통용되는
 * 김프 산식이 그대로 이 방식이다. 소스가 하나라도 빠지면 김프를 계산하지 않는다
 * (추정치를 확정값처럼 보여주지 않는다).
 */
export async function getMarketBar(): Promise<MarketBarWire> {
  const [tickers, usdKrw, btcUsd] = await Promise.all([
    getMarketTickers(),
    getUsdKrw(),
    getGlobalBtcUsd(),
  ]);

  let kimchiBps: number | null = null;
  const btc = tickers.find((t) => t.symbol === "BTC");
  if (btc && usdKrw !== null && btcUsd !== null) {
    // krw 는 0.001원 단위 → 원 단위로 되돌려 비교
    const upbitKrw = Number(BigInt(btc.krw) / 1_000n);
    const theoretical = btcUsd * usdKrw;
    if (theoretical > 0) {
      kimchiBps = Math.trunc((upbitKrw / theoretical - 1) * 10_000);
    }
  }

  return {
    tickers,
    usdKrwCents: usdKrw === null ? null : Math.round(usdKrw * 100),
    kimchiBps,
  };
}

export async function getEthKrw(): Promise<bigint | null> {
  try {
    const res = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-ETH", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!Array.isArray(body) || body.length === 0) return null;
    const first: unknown = body[0];
    if (typeof first !== "object" || first === null || !("trade_price" in first)) {
      return null;
    }
    const price = Number((first as { trade_price: unknown }).trade_price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return BigInt(Math.floor(price));
  } catch {
    return null;
  }
}
