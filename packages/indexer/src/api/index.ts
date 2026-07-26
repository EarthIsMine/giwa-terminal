import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, asc, countDistinct, desc, eq, gt, gte } from "ponder";
import { giwaChain } from "@giwa/config";

/**
 * 가격 API — 웹(Next.js 서버)이 서버-투-서버로 소비한다.
 * bigint 는 JSON 으로 못 나가므로 전부 문자열로 직렬화한다 (표시 직전 복원 규칙).
 * 변동률·거래량은 캔들에서 읽는다 — 스왑 원장 스캔 금지 (지표 정의).
 */

const app = new Hono();

const INTERVAL_SECONDS = { "1m": 60, "1h": 3_600, "1d": 86_400 } as const;
type Interval = keyof typeof INTERVAL_SECONDS;

function isInterval(v: string): v is Interval {
  return v in INTERVAL_SECONDS;
}

function asHex(v: string): `0x${string}` | null {
  return /^0x[0-9a-fA-F]{40}$/.test(v)
    ? (v.toLowerCase() as `0x${string}`)
    : null;
}

/** limit 쿼리 방어 — 숫자가 아니거나 음수면 기본값 (NaN 이 쿼리로 새면 500) */
function clampLimit(raw: string | undefined, def: number, max: number): number {
  const n = Number(raw ?? def);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

/** 캔들 — 기본 1d, limit 개를 과거→현재 오름차순으로 */
app.get("/candles/:pair", async (c) => {
  const pair = asHex(c.req.param("pair"));
  if (!pair) return c.json({ error: "invalid pair address" }, 400);
  const interval = c.req.query("interval") ?? "1d";
  if (!isInterval(interval)) return c.json({ error: "invalid interval" }, 400);
  const limit = clampLimit(c.req.query("limit"), 400, 1_000);

  const rows = await db
    .select()
    .from(schema.candles)
    .where(
      and(eq(schema.candles.pair, pair), eq(schema.candles.interval, interval)),
    )
    .orderBy(desc(schema.candles.bucket))
    .limit(limit);

  return c.json({
    candles: rows.reverse().map((r) => ({
      bucket: r.bucket,
      open: r.open.toString(),
      high: r.high.toString(),
      low: r.low.toString(),
      close: r.close.toString(),
      volumeWeth: r.volumeWeth.toString(),
      trades: r.trades,
    })),
  });
});

/** 체결 내역 — 최신순 */
app.get("/trades/:pair", async (c) => {
  const pair = asHex(c.req.param("pair"));
  if (!pair) return c.json({ error: "invalid pair address" }, 400);
  const limit = clampLimit(c.req.query("limit"), 30, 200);

  const rows = await db
    .select()
    .from(schema.trades)
    .where(eq(schema.trades.pair, pair))
    .orderBy(
      desc(schema.trades.timestamp),
      desc(schema.trades.block),
      desc(schema.trades.logIndex),
    )
    .limit(limit);

  return c.json({
    trades: rows.map((r) => ({
      id: r.id,
      side: r.side,
      tokenAmount: r.tokenAmount.toString(),
      wethAmount: r.wethAmount.toString(),
      priceWei: r.priceWei.toString(),
      txHash: r.txHash,
      timestamp: r.timestamp,
    })),
  });
});

/**
 * 보드 일괄 요약 — 전 페어의 기간별 변동률·거래량을 한 번에 준다.
 * 윈도우는 일 단위(24h/7d/30d/전체)로만 연다 — 5분·1시간 변동률은 만들지 않는다
 * (절대 규칙 3: 정보 밀도를 낮춘다).
 *
 * 산식: 윈도우 시작 이후 첫 1d 캔들의 open 대비 최신 캔들의 close.
 * 데이터가 없는 페어는 응답에서 빠진다 — 0.00%로 채우지 않는다.
 *
 * 구현 메모: 1d 캔들 전량을 읽어 메모리에서 집계한다. 자산이 수십 종 이내이고
 * 일봉이라 행 수가 작다는 전제이며, 규모가 커지면 SQL 윈도우 집계로 옮긴다.
 */
app.get("/board", async (c) => {
  const now = Math.floor(Date.now() / 1_000);
  const dayStart = now - (now % 86_400);
  const WINDOWS = {
    "24h": dayStart,
    "7d": dayStart - 6 * 86_400,
    "30d": dayStart - 29 * 86_400,
    all: 0,
  } as const;

  const [rows, traderRows] = await Promise.all([
    db
      .select()
      .from(schema.candles)
      .where(eq(schema.candles.interval, "1d"))
      .orderBy(asc(schema.candles.bucket)),
    // 참여 인원은 distinct tx.origin 이라 캔들로 집계할 수 없다 (지표 정의 §거래자 수).
    // 30일치 체결의 (pair, origin, timestamp)만 읽어 윈도우별로 센다.
    db
      .select({
        pair: schema.trades.pair,
        origin: schema.trades.origin,
        timestamp: schema.trades.timestamp,
      })
      .from(schema.trades)
      .where(gte(schema.trades.timestamp, WINDOWS["30d"])),
  ]);

  const byPair = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byPair.get(r.pair);
    if (list) list.push(r);
    else byPair.set(r.pair, [r]);
  }

  const tradersByPair = new Map<string, typeof traderRows>();
  for (const r of traderRows) {
    const list = tradersByPair.get(r.pair);
    if (list) list.push(r);
    else tradersByPair.set(r.pair, [r]);
  }

  interface WindowStat {
    changeBps: number;
    volumeWeth: string;
    trades: number;
    traders: number;
  }
  const out: Record<
    string,
    { trend: string[]; windows: Record<string, WindowStat> }
  > = {};

  for (const [pair, candles] of byPair) {
    const latest = candles[candles.length - 1];
    if (!latest) continue;
    const windows: Record<string, WindowStat> = {};
    const pairTrades = tradersByPair.get(pair) ?? [];

    for (const [key, from] of Object.entries(WINDOWS)) {
      const inWindow = candles.filter((r) => r.bucket >= from);
      const first = inWindow[0];
      if (!first || first.open === 0n) continue;
      const origins = new Set<string>();
      for (const t of pairTrades) {
        if (t.timestamp >= from) origins.add(t.origin);
      }
      windows[key] = {
        changeBps: Number(((latest.close - first.open) * 10_000n) / first.open),
        volumeWeth: inWindow
          .reduce((acc, r) => acc + r.volumeWeth, 0n)
          .toString(),
        trades: inWindow.reduce((acc, r) => acc + r.trades, 0),
        // all 윈도우는 30일 조회분이라 그 이전 거래자는 빠진다 (근사임을 소비자가 안다)
        traders: origins.size,
      };
    }
    if (Object.keys(windows).length === 0) continue;

    out[pair] = {
      // 스파크라인용 종가 추이 — 최근 14일봉
      trend: candles.slice(-14).map((r) => r.close.toString()),
      windows,
    };
  }

  return c.json({ pairs: out });
});

/**
 * 일 단위 요약 — 보드/상세 공용.
 * 변동률 = 당일(UTC) 1d 캔들 open 대비 close (bps), 거래량 = 당일 캔들 volume,
 * 거래자 수 = 당일 distinct tx.origin (지표 정의 §거래자 수).
 */
app.get("/stats/:pair", async (c) => {
  const pair = asHex(c.req.param("pair"));
  if (!pair) return c.json({ error: "invalid pair address" }, 400);

  const now = Math.floor(Date.now() / 1_000);
  const dayStart = now - (now % 86_400);

  const [candle] = await db
    .select()
    .from(schema.candles)
    .where(
      and(
        eq(schema.candles.pair, pair),
        eq(schema.candles.interval, "1d"),
        eq(schema.candles.bucket, dayStart),
      ),
    )
    .limit(1);

  // 당일 캔들이 없으면(백필 중·인덱서 랙·신규 페어) "데이터 없음"을 그대로 알린다.
  // 0.00%·거래 0 같은 확정값으로 답하면 실제 무거래와 구분이 안 된다
  // ("추정치를 확정값처럼 보여주지 않는다" — 절대 규칙 1의 정신).
  if (!candle || candle.open === 0n) {
    return c.json({ error: "no data for today" }, 404);
  }

  const [traderRow] = await db
    .select({ traders: countDistinct(schema.trades.origin) })
    .from(schema.trades)
    .where(
      and(eq(schema.trades.pair, pair), gte(schema.trades.timestamp, dayStart)),
    );

  const changeBps = Number(
    ((candle.close - candle.open) * 10_000n) / candle.open,
  );

  return c.json({
    changeBps,
    volumeWethToday: candle.volumeWeth.toString(),
    tradesToday: candle.trades,
    tradersToday: traderRow?.traders ?? 0,
  });
});

/**
 * 나루터 소식 피드 v0 (개발 명세서 §2.1) — 최근 24시간에서 세 종류를 판정한다.
 * 1) 신규 상장: TokenListed (시간 제한 없이 최근 순)
 * 2) 발행자 매도: 발행자 라벨 지갑(tx.origin == issuer)의 매도 — 금액 무관 무조건 노출
 * 3) 대형 체결: 체결액 ≥ 풀 유동성(현재 WETH 준비금)의 3% — % 기준이라 데모 규모에서도 판정된다
 * 판정 단위는 단건(v0). 지갑·클러스터별 24h 누적 전환은 v1(P1) — 명세서 ★항목.
 * 문구 생성은 웹 몫 — 여기는 사실 데이터만 준다 (해석·경고 표현 금지 원칙).
 */
app.get("/feed", async (c) => {
  const limit = clampLimit(c.req.query("limit"), 12, 50);
  const since = Math.floor(Date.now() / 1_000) - 86_400;

  const [listings, recentTrades] = await Promise.all([
    db
      .select()
      .from(schema.tokens)
      .where(gte(schema.tokens.listedAt, 0))
      .orderBy(desc(schema.tokens.listedAt))
      .limit(10),
    db
      .select({
        id: schema.trades.id,
        side: schema.trades.side,
        wethAmount: schema.trades.wethAmount,
        origin: schema.trades.origin,
        txHash: schema.trades.txHash,
        timestamp: schema.trades.timestamp,
        token: schema.trades.token,
        wethReserve: schema.pairs.wethReserve,
        symbol: schema.tokens.symbol,
        issuer: schema.tokens.issuer,
      })
      .from(schema.trades)
      .innerJoin(schema.pairs, eq(schema.trades.pair, schema.pairs.address))
      .innerJoin(schema.tokens, eq(schema.trades.token, schema.tokens.address))
      .where(gte(schema.trades.timestamp, since))
      .orderBy(
        desc(schema.trades.timestamp),
        desc(schema.trades.block),
        desc(schema.trades.logIndex),
      )
      .limit(400),
  ]);

  interface FeedItem {
    id: string;
    type: "listed" | "issuer_sell" | "large_trade";
    token: `0x${string}`;
    symbol: string;
    timestamp: number;
    side?: "buy" | "sell";
    wethAmount?: string;
    /** 풀 유동성 대비 체결 비율 ‰ (현재 준비금 기준 사후 근사) */
    poolPermille?: number;
    txHash?: `0x${string}`;
  }

  const items: FeedItem[] = listings.map((t) => ({
    id: `listed-${t.address}`,
    type: "listed" as const,
    token: t.address,
    symbol: t.symbol,
    timestamp: t.listedAt ?? t.issuedAt,
  }));

  for (const r of recentTrades) {
    const isIssuerSell =
      r.side === "sell" && r.origin.toLowerCase() === r.issuer.toLowerCase();
    // 대형 판정: 풀 WETH 준비금의 3% 이상 (거래 시점이 아닌 현재 준비금 — v0 근사)
    const threshold = (r.wethReserve * 3n) / 100n;
    const isLarge = threshold > 0n && r.wethAmount >= threshold;
    if (!isIssuerSell && !isLarge) continue;
    items.push({
      id: r.id,
      type: isIssuerSell ? "issuer_sell" : "large_trade",
      token: r.token,
      symbol: r.symbol,
      timestamp: r.timestamp,
      side: r.side,
      wethAmount: r.wethAmount.toString(),
      poolPermille:
        r.wethReserve > 0n
          ? Number((r.wethAmount * 1_000n) / r.wethReserve)
          : undefined,
      txHash: r.txHash,
    });
  }

  items.sort((a, b) => b.timestamp - a.timestamp);
  return c.json({ items: items.slice(0, limit) });
});

/**
 * 홀더 관계도 (버블맵) — 명세서 §2.2 정의 그대로.
 * 노드 = 잔고 상위 홀더(인프라 제외, 최대 120), 크기 = 보유량.
 * 에지 = 두 지갑 간 직접 전송 이력 (민트·인프라 경유 제외).
 * 클러스터 = 연결 성분(union-find) — 그래프를 전체 전송 참여자 위에서 만들고
 * 홀더로 투영한다 (잔고 0 경유 지갑으로 이어진 간접 연결도 같은 클러스터로 묶인다).
 * 인프라 주소(페어·팩토리·라우터)는 성분 계산에서 제외 — 안 거르면 라우터/페어를
 * 경유한 모든 지갑이 한 덩어리로 뭉친다.
 */
app.get("/graph/:token", async (c) => {
  const token = asHex(c.req.param("token"));
  if (!token) return c.json({ error: "invalid token address" }, 400);

  const meta = await db
    .select()
    .from(schema.tokens)
    .where(eq(schema.tokens.address, token))
    .limit(1);
  const tokenRow = meta[0];
  if (!tokenRow || tokenRow.totalSupply === 0n) {
    return c.json({ error: "unknown token" }, 404);
  }

  const infra = new Set<string>(
    [
      tokenRow.pair,
      giwaChain.tokenFactoryAddress,
      giwaChain.routerAddress,
      giwaChain.factoryAddress,
    ]
      .filter((a): a is `0x${string}` => a !== null && a !== undefined)
      .map((a) => a.toLowerCase()),
  );

  const [holderRows, linkRows] = await Promise.all([
    db
      .select()
      .from(schema.holders)
      .where(and(eq(schema.holders.token, token), gt(schema.holders.balance, 0n)))
      .orderBy(desc(schema.holders.balance))
      .limit(200),
    db
      .select()
      .from(schema.transferLinks)
      .where(eq(schema.transferLinks.token, token)),
  ]);

  // union-find — 인프라를 제외한 전송 참여자 전체 위에서 성분을 만든다
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = parent.get(x) ?? x;
    if (root !== x) {
      root = find(root);
      parent.set(x, root);
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const usableLinks = linkRows.filter(
    (l) => !infra.has(l.from) && !infra.has(l.to),
  );
  for (const l of usableLinks) union(l.from, l.to);

  const displayed = holderRows.filter((h) => !infra.has(h.address)).slice(0, 120);
  const displayedSet = new Set(displayed.map((h) => h.address));
  const issuerRoot = find(tokenRow.issuer.toLowerCase());
  const permilleOf = (v: bigint) => Number((v * 1_000n) / tokenRow.totalSupply);

  // 표시 대상 홀더 간의 직접 에지만 그린다 (성분 계산은 위에서 전체로 이미 끝났다)
  const seen = new Set<string>();
  const links: { source: string; target: string }[] = [];
  for (const l of usableLinks) {
    if (!displayedSet.has(l.from) || !displayedSet.has(l.to)) continue;
    const key = l.from < l.to ? `${l.from}-${l.to}` : `${l.to}-${l.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ source: l.from, target: l.to });
  }

  const clusterOf = (addr: string) => find(addr);
  const clusterSizes = new Map<string, number>();
  for (const h of displayed) {
    const root = clusterOf(h.address);
    clusterSizes.set(root, (clusterSizes.get(root) ?? 0) + 1);
  }

  return c.json({
    totalSupply: tokenRow.totalSupply.toString(),
    issuer: tokenRow.issuer,
    nodes: displayed.map((h) => {
      const root = clusterOf(h.address);
      return {
        address: h.address,
        balance: h.balance.toString(),
        permille: permilleOf(h.balance),
        isIssuer: h.address === tokenRow.issuer.toLowerCase(),
        /** 발행자와 같은 성분 = 발행자 연계 (1단계 이상 전송으로 이어짐) */
        issuerLinked: root === issuerRoot,
        /** 2인 이상 성분에 속하면 연결 클러스터 */
        clustered: (clusterSizes.get(root) ?? 1) > 1,
        clusterId: root,
      };
    }),
    links,
  });
});

/** 페어 목록 — 디버그/검증용 */
app.get("/pairs", async (c) => {
  const rows = await db
    .select()
    .from(schema.pairs)
    .orderBy(asc(schema.pairs.createdAt));
  return c.json({
    pairs: rows.map((r) => ({
      address: r.address,
      token: r.token,
      priceWei: r.priceWei.toString(),
      wethReserve: r.wethReserve.toString(),
      createdAt: r.createdAt,
    })),
  });
});

export default app;
