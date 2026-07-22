import { ponder } from "ponder:registry";
import { candles, pairs, trades } from "ponder:schema";
import { giwaChain } from "@giwa/config";

/**
 * 핸들러 순서 보장: Ponder 는 (블록, logIndex) 순으로 이벤트를 처리한다.
 * V2 Pair.swap() 은 Sync → Swap 순으로 이벤트를 내므로, Swap 핸들러 시점에는
 * pairs 행이 이미 체결 직후 준비금으로 갱신되어 있다 — 그 가격을 캔들에 쓴다.
 * 멱등성은 Ponder 체크포인트(리오그 롤백 포함)가 보장한다.
 */

const WETH = giwaChain.wethAddress.toLowerCase();

const INTERVALS = [
  { interval: "1m", seconds: 60 },
  { interval: "1h", seconds: 3_600 },
  { interval: "1d", seconds: 86_400 },
] as const;

ponder.on("NaruswapV2Factory:PairCreated", async ({ event, context }) => {
  const { token0, token1, pair } = event.args;
  const t0IsWeth = token0.toLowerCase() === WETH;
  const t1IsWeth = token1.toLowerCase() === WETH;
  // WETH 가 없는 페어는 quote 가격 정의가 없다 — 인덱싱하지 않는다
  if (t0IsWeth === t1IsWeth) return;

  await context.db.insert(pairs).values({
    address: pair,
    token: t0IsWeth ? token1 : token0,
    tokenIsToken0: !t0IsWeth,
    tokenReserve: 0n,
    wethReserve: 0n,
    priceWei: 0n,
    createdAt: Number(event.block.timestamp),
    createdAtBlock: event.block.number,
  });
});

ponder.on("NaruswapV2Pair:Sync", async ({ event, context }) => {
  const pair = await context.db.find(pairs, { address: event.log.address });
  if (!pair) return;

  const tokenReserve = pair.tokenIsToken0
    ? event.args.reserve0
    : event.args.reserve1;
  const wethReserve = pair.tokenIsToken0
    ? event.args.reserve1
    : event.args.reserve0;
  // 가격 = WETH 준비금 / 토큰 준비금 (지표 정의 §가격 — 양쪽 18 decimals 라 보정 불필요)
  const priceWei =
    tokenReserve === 0n ? 0n : (wethReserve * 10n ** 18n) / tokenReserve;

  await context.db
    .update(pairs, { address: event.log.address })
    .set({ tokenReserve, wethReserve, priceWei });
});

ponder.on("NaruswapV2Pair:Swap", async ({ event, context }) => {
  const pair = await context.db.find(pairs, { address: event.log.address });
  if (!pair || pair.priceWei === 0n) return;

  const { amount0In, amount1In, amount0Out, amount1Out } = event.args;
  const tokenIn = pair.tokenIsToken0 ? amount0In : amount1In;
  const tokenOut = pair.tokenIsToken0 ? amount0Out : amount1Out;
  const wethIn = pair.tokenIsToken0 ? amount1In : amount0In;
  const wethOut = pair.tokenIsToken0 ? amount1Out : amount0Out;

  // 순유입 기준 방향 판정 — 양방향 금액이 다 찍히는 비정상 스왑도 순액으로 흡수
  const side = tokenOut > tokenIn ? "buy" : "sell";
  const tokenAmount = side === "buy" ? tokenOut - tokenIn : tokenIn - tokenOut;
  const wethAmount = side === "buy" ? wethIn - wethOut : wethOut - wethIn;
  if (tokenAmount <= 0n || wethAmount <= 0n) return;

  const price = pair.priceWei;
  const ts = Number(event.block.timestamp);

  await context.db.insert(trades).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pair: pair.address,
    token: pair.token,
    side,
    tokenAmount,
    wethAmount,
    priceWei: price,
    origin: event.transaction.from,
    txHash: event.transaction.hash,
    timestamp: ts,
    block: event.block.number,
  });

  // 캔들 갱신 — 1m 원본과 1h/1d 롤업을 같은 트랜잭션에서 upsert
  for (const { interval, seconds } of INTERVALS) {
    const bucket = ts - (ts % seconds);
    await context.db
      .insert(candles)
      .values({
        pair: pair.address,
        interval,
        bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volumeWeth: wethAmount,
        trades: 1,
      })
      .onConflictDoUpdate((row) => ({
        high: row.high > price ? row.high : price,
        low: row.low < price ? row.low : price,
        close: price,
        volumeWeth: row.volumeWeth + wethAmount,
        trades: row.trades + 1,
      }));
  }
});
