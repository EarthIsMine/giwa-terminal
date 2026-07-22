import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { and, asc, countDistinct, desc, eq, gte } from "ponder";

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

/** 캔들 — 기본 1d, limit 개를 과거→현재 오름차순으로 */
app.get("/candles/:pair", async (c) => {
  const pair = asHex(c.req.param("pair"));
  if (!pair) return c.json({ error: "invalid pair address" }, 400);
  const interval = c.req.query("interval") ?? "1d";
  if (!isInterval(interval)) return c.json({ error: "invalid interval" }, 400);
  const limit = Math.min(Number(c.req.query("limit") ?? "400"), 1_000);

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
  const limit = Math.min(Number(c.req.query("limit") ?? "30"), 200);

  const rows = await db
    .select()
    .from(schema.trades)
    .where(eq(schema.trades.pair, pair))
    .orderBy(desc(schema.trades.timestamp), desc(schema.trades.id))
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

  const [traderRow] = await db
    .select({ traders: countDistinct(schema.trades.origin) })
    .from(schema.trades)
    .where(
      and(eq(schema.trades.pair, pair), gte(schema.trades.timestamp, dayStart)),
    );

  const changeBps =
    candle && candle.open > 0n
      ? Number(((candle.close - candle.open) * 10_000n) / candle.open)
      : 0;

  return c.json({
    changeBps,
    volumeWethToday: (candle?.volumeWeth ?? 0n).toString(),
    tradesToday: candle?.trades ?? 0,
    tradersToday: traderRow?.traders ?? 0,
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
