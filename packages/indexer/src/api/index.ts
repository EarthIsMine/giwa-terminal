import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, asc, countDistinct, desc, eq, gt, gte } from "ponder";
import { giwaChain } from "@giwa/config";

/**
 * 가격 API - 웹(Next.js 서버)이 서버-투-서버로 소비한다.
 * bigint 는 JSON 으로 못 나가므로 전부 문자열로 직렬화한다 (표시 직전 복원 규칙).
 * 변동률·거래량은 캔들에서 읽는다 - 스왑 원장 스캔 금지 (지표 정의).
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

/** limit 쿼리 방어 - 숫자가 아니거나 음수면 기본값 (NaN 이 쿼리로 새면 500) */
function clampLimit(raw: string | undefined, def: number, max: number): number {
  const n = Number(raw ?? def);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

/** 캔들 - 기본 1d, limit 개를 과거→현재 오름차순으로 */
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

/** 체결 내역 - 최신순 */
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
 * 지갑의 체결 원장 - 내 자산 손익(지표 정의 §손익)의 재료.
 *
 * `origin`(tx.origin)으로 거른다. 라우터 경유라 `msg.sender`를 쓰면 라우터
 * 주소 하나로 뭉친다(§거래 수 / 참여 지갑과 같은 이유).
 *
 * 이동평균 원가는 첫 매수부터 순서대로 재생해야 맞으므로 **오름차순**으로 준다
 * (다른 /trades 는 최신순이다 - 여기만 다른 이유가 그것이다). limit 을 넘겨
 * 앞부분이 잘리면 원가가 틀리므로, 잘렸음을 `truncated` 로 알린다. 호출부는
 * 이 경우 손익을 표시하지 않는다 - 조용히 틀린 원가를 보여주지 않는다.
 */
app.get("/wallet/:address/trades", async (c) => {
  const origin = asHex(c.req.param("address"));
  if (!origin) return c.json({ error: "invalid wallet address" }, 400);
  const limit = clampLimit(c.req.query("limit"), 1_000, 5_000);

  const rows = await db
    .select()
    .from(schema.trades)
    .where(eq(schema.trades.origin, origin))
    .orderBy(
      asc(schema.trades.timestamp),
      asc(schema.trades.block),
      asc(schema.trades.logIndex),
    )
    .limit(limit + 1); // 한 건 더 읽어 잘림 여부를 판정한다

  const truncated = rows.length > limit;
  return c.json({
    truncated,
    trades: rows.slice(0, limit).map((r) => ({
      token: r.token,
      side: r.side,
      tokenAmount: r.tokenAmount.toString(),
      wethAmount: r.wethAmount.toString(),
      timestamp: r.timestamp,
    })),
  });
});

/**
 * 보드 일괄 요약 - 전 페어의 기간별 변동률·거래량을 한 번에 준다.
 * 윈도우는 롤링 단기(15m/1h/4h/24h)다 (2026-08-31 팀 결정) - 이전의 일·월
 * 경계(업비트 일봉 정렬)에서 rolling 으로 전환했다. 절대 규칙 3(정보 밀도·일월
 * 단위)을 팀이 명시적으로 개정한 결과이며, CLAUDE.md 규칙 3·지표 정의도 함께 고쳤다.
 *
 * 산식: 윈도우 시작(now - Δ) 이후 첫 1m 캔들의 open 대비 최신 1m 캔들의 close.
 * 롤링 단기 변동률은 1d 캔들로 못 내므로 분 단위 캔들을 본다. 데이터가 없는
 * 페어·윈도우는 응답에서 빠진다 - 0.00%로 채우지 않는다.
 *
 * 총수수료는 윈도우와 무관한 lifetime 값이라 별도로 준다(`lifetimeVolumeWeth`):
 * 1d 캔들 전량의 거래대금 합. 단기 윈도우로는 lifetime 을 못 낸다.
 *
 * 구현 메모: 1m 캔들은 최근 24h 만 읽는다(자산 수십 종 × 1440분이라 전량 스캔은
 * 피한다). 총수수료용 1d 캔들과 활동 원장(최근 24h)만 추가로 읽는다.
 */
app.get("/board", async (c) => {
  const now = Math.floor(Date.now() / 1_000);
  // 롤링 윈도우 - now 기준 과거 Δ초. 15분·1시간·4시간·24시간.
  const WINDOWS = {
    "15m": now - 900,
    "1h": now - 3_600,
    "4h": now - 14_400,
    "24h": now - 86_400,
  } as const;
  // 1m 캔들·활동 원장 읽기 하한 = 가장 긴 윈도우(24h)
  const windowFrom = now - 86_400;

  const [minuteRows, dailyRows, activityRows] = await Promise.all([
    // 롤링 단기 변동률·거래량은 분 단위 캔들에서 낸다. 최근 24h 만.
    db
      .select()
      .from(schema.candles)
      .where(
        and(
          eq(schema.candles.interval, "1m"),
          gte(schema.candles.bucket, windowFrom),
        ),
      )
      .orderBy(asc(schema.candles.bucket)),
    // 총수수료(lifetime)용 - 1d 캔들 전량의 거래대금 합. 윈도우와 무관.
    db
      .select({
        pair: schema.candles.pair,
        volumeWeth: schema.candles.volumeWeth,
      })
      .from(schema.candles)
      .where(eq(schema.candles.interval, "1d")),
    // 거래 수·참여 지갑은 활동 원장에서 센다 - 매수·매도뿐 아니라 유동성
    // 공급·회수까지 포함해야 "이 자산에 몇 개 지갑이 무엇을 했나"가 맞는다.
    // 보드 윈도우는 최대 24h 지만, 분석 탭의 "30일 참여 지갑"이 이 응답의
    // traders30d 를 쓰므로 최근 30일을 읽는다(윈도우 집계는 그 안에서 24h 로 자른다).
    db
      .select({
        pair: schema.activities.pair,
        origin: schema.activities.origin,
        timestamp: schema.activities.timestamp,
      })
      .from(schema.activities)
      .where(gte(schema.activities.timestamp, now - 30 * 86_400)),
  ]);

  const byPair = new Map<string, typeof minuteRows>();
  for (const r of minuteRows) {
    const list = byPair.get(r.pair);
    if (list) list.push(r);
    else byPair.set(r.pair, [r]);
  }

  // 총수수료용 lifetime 거래대금 - 페어별 1d 캔들 볼륨 합
  const lifetimeByPair = new Map<string, bigint>();
  for (const r of dailyRows) {
    lifetimeByPair.set(r.pair, (lifetimeByPair.get(r.pair) ?? 0n) + r.volumeWeth);
  }

  const actByPair = new Map<string, typeof activityRows>();
  for (const r of activityRows) {
    const list = actByPair.get(r.pair);
    if (list) list.push(r);
    else actByPair.set(r.pair, [r]);
  }

  interface WindowStat {
    changeBps: number;
    volumeWeth: string;
    /** 순유입 = 윈도우 내 총매수 - 총매도 (WETH wei, 부호 있음, 지표 정의 §순유입) */
    netInflowWeth: string;
    trades: number;
    traders: number;
  }
  const out: Record<
    string,
    {
      windows: Record<string, WindowStat>;
      lifetimeVolumeWeth: string;
      /** 분석 탭 전용 - 최근 30일 distinct tx.origin (보드 윈도우와 별개) */
      traders30d: number;
    }
  > = {};

  const thirtyDaysAgo = now - 30 * 86_400;

  // 통계 대상 = 최근 24h 캔들(단기 지표)·lifetime 거래(총수수료)·30일 활동
  // (분석 탭 참여 지갑) 중 하나라도 있는 페어. 셋의 합집합을 돈다.
  const pairSet = new Set<string>([
    ...byPair.keys(),
    ...lifetimeByPair.keys(),
    ...actByPair.keys(),
  ]);

  for (const pair of pairSet) {
    const candles = byPair.get(pair) ?? [];
    const latest = candles[candles.length - 1];
    const windows: Record<string, WindowStat> = {};
    const pairActs = actByPair.get(pair) ?? [];

    // 분석 탭 30일 참여 지갑 - 보드 윈도우와 무관하게 최근 30일 distinct origin
    const origins30d = new Set<string>();
    for (const a of pairActs) {
      if (a.timestamp >= thirtyDaysAgo) origins30d.add(a.origin);
    }

    if (latest) {
      for (const [key, from] of Object.entries(WINDOWS)) {
        const inWindow = candles.filter((r) => r.bucket >= from);
        const first = inWindow[0];
        if (!first || first.open === 0n) continue;
        const origins = new Set<string>();
        let actCount = 0;
        for (const a of pairActs) {
          if (a.timestamp < from) continue;
          actCount += 1;
          origins.add(a.origin);
        }
        windows[key] = {
          changeBps: Number(
            ((latest.close - first.open) * 10_000n) / first.open,
          ),
          // 거래대금은 스왑 체결액만 - 유동성 공급은 거래가 아니다 (지표 정의 §거래량)
          volumeWeth: inWindow
            .reduce((acc, r) => acc + r.volumeWeth, 0n)
            .toString(),
          // 순유입 = 총매수 - 총매도. candles 에 방향별로 이미 갈라 쌓아뒀으므로
          // 여기서도 trades 원장을 스캔하지 않는다 (지표 정의 §순유입)
          netInflowWeth: inWindow
            .reduce((acc, r) => acc + r.buyVolumeWeth - r.sellVolumeWeth, 0n)
            .toString(),
          trades: actCount,
          traders: origins.size,
        };
      }
    }

    const lifetime = lifetimeByPair.get(pair) ?? 0n;
    // 단기 윈도우·lifetime 거래·30일 참여 지갑이 전부 없으면 뺀다 - 0으로 안 채운다
    if (
      Object.keys(windows).length === 0 &&
      lifetime === 0n &&
      origins30d.size === 0
    )
      continue;

    out[pair] = {
      windows,
      lifetimeVolumeWeth: lifetime.toString(),
      traders30d: origins30d.size,
    };
  }

  return c.json({ pairs: out });
});

/**
 * 일 단위 요약 - 보드/상세 공용.
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
  // ("추정치를 확정값처럼 보여주지 않는다" - 절대 규칙 1의 정신).
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
 * 나루터 소식 피드 v0 (개발 명세서 §2.1) - 최근 24시간에서 세 종류를 판정한다.
 * 1) 신규 상장: TokenListed (시간 제한 없이 최근 순)
 * 2) 발행자 매도: 발행자 라벨 지갑(tx.origin == issuer)의 매도 - 금액 무관 무조건 노출
 * 3) 대형 체결: 체결액 ≥ 풀 유동성(현재 WETH 준비금)의 3% - % 기준이라 데모 규모에서도 판정된다
 * 판정 단위는 단건(v0). 지갑·클러스터별 24h 누적 전환은 v1(P1) - 명세서 ★항목.
 * 문구 생성은 웹 몫 - 여기는 사실 데이터만 준다 (해석·경고 표현 금지 원칙).
 */
app.get("/feed", async (c) => {
  const limit = clampLimit(c.req.query("limit"), 12, 50);
  const since = Math.floor(Date.now() / 1_000) - 86_400;

  const tradeColumns = {
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
  };
  const joinedTrades = () =>
    db
      .select(tradeColumns)
      .from(schema.trades)
      .innerJoin(schema.pairs, eq(schema.trades.pair, schema.pairs.address))
      .innerJoin(schema.tokens, eq(schema.trades.token, schema.tokens.address));

  const [listings, recentTrades, issuerSells] = await Promise.all([
    db
      .select()
      .from(schema.tokens)
      .where(gte(schema.tokens.listedAt, 0))
      .orderBy(desc(schema.tokens.listedAt))
      .limit(10),
    joinedTrades()
      .where(gte(schema.trades.timestamp, since))
      .orderBy(
        desc(schema.trades.timestamp),
        desc(schema.trades.block),
        desc(schema.trades.logIndex),
      )
      .limit(400),
    // 발행자 매도는 별도 전수 조회 - 대형 체결 400건 컷 안에 들었는지에 기대면
    // 거래가 활발할 때 조용히 누락된다. "금액 무관 무조건 노출"이 규칙이다.
    joinedTrades()
      .where(
        and(
          gte(schema.trades.timestamp, since),
          eq(schema.trades.side, "sell"),
          eq(schema.trades.origin, schema.tokens.issuer),
        ),
      )
      .orderBy(desc(schema.trades.timestamp)),
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

  const toItem = (
    r: (typeof recentTrades)[number],
    type: "issuer_sell" | "large_trade",
  ): FeedItem => ({
    id: r.id,
    type,
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

  const issuerSellIds = new Set<string>();
  for (const r of issuerSells) {
    issuerSellIds.add(r.id);
    items.push(toItem(r, "issuer_sell"));
  }

  for (const r of recentTrades) {
    if (issuerSellIds.has(r.id)) continue; // 위에서 이미 담았다
    // 대형 판정: 풀 WETH 준비금의 3% 이상 (거래 시점이 아닌 현재 준비금 - v0 근사)
    const threshold = (r.wethReserve * 3n) / 100n;
    if (threshold === 0n || r.wethAmount < threshold) continue;
    items.push(toItem(r, "large_trade"));
  }

  // 발행자 매도는 시각과 무관하게 먼저 배치한다 - 대형 체결에 밀려 잘리면
  // "금액 무관 무조건 노출"이 성립하지 않는다.
  const rank = (t: FeedItem["type"]) => (t === "issuer_sell" ? 0 : 1);
  items.sort((a, b) => rank(a.type) - rank(b.type) || b.timestamp - a.timestamp);
  return c.json({ items: items.slice(0, limit) });
});

/**
 * 홀더 관계도 (버블맵) - 명세서 §2.2 정의 그대로.
 * 노드 = 잔고 상위 홀더(인프라 제외, 최대 120), 크기 = 보유량.
 * 에지 = 두 지갑 간 직접 전송 이력 (민트·인프라 경유 제외).
 * 클러스터 = 연결 성분(union-find) - 그래프를 전체 전송 참여자 위에서 만들고
 * 홀더로 투영한다 (잔고 0 경유 지갑으로 이어진 간접 연결도 같은 클러스터로 묶인다).
 * 인프라 주소(페어·팩토리·라우터)는 성분 계산에서 제외 - 안 거르면 라우터/페어를
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

  // union-find - 인프라를 제외한 전송 참여자 전체 위에서 성분을 만든다
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

/** 페어 목록 - 디버그/검증용 */
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
