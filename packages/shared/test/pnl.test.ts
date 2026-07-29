import { test } from "node:test";
import assert from "node:assert/strict";

import { roiBps, summarizeTrades, totalPnlWei } from "../src/pnl.ts";
import type { PnlTrade } from "../src/pnl.ts";

const ETH = 10n ** 18n;
const buy = (tokenAmount: bigint, wethAmount: bigint): PnlTrade => ({
  side: "buy",
  tokenAmount,
  wethAmount,
});
const sell = (tokenAmount: bigint, wethAmount: bigint): PnlTrade => ({
  side: "sell",
  tokenAmount,
  wethAmount,
});

test("매수만: 순투입은 지불액 합, 손익은 평가금액 − 순투입", () => {
  const l = summarizeTrades([buy(100n * ETH, 1n * ETH), buy(100n * ETH, 3n * ETH)]);
  assert.equal(l.ledgerQty, 200n * ETH);
  assert.equal(l.netInvestedWei as bigint, 4n * ETH);
  assert.equal(l.grossBoughtWei as bigint, 4n * ETH);
  // 지금 평가가 5 ETH 면 +1 ETH
  assert.equal(totalPnlWei(5n * ETH, l.netInvestedWei as bigint) as bigint, 1n * ETH);
});

test("부분 매도: 회수액이 순투입에서 빠지고 손익은 그대로 맞는다", () => {
  // 0.01 ETH 어치 사서 절반을 0.008 에 팔고, 남은 것의 평가가 0.006
  const l = summarizeTrades([buy(100n * ETH, 10n ** 16n), sell(50n * ETH, 8n * 10n ** 15n)]);
  assert.equal(l.netInvestedWei as bigint, 2n * 10n ** 15n, "순투입 0.002 ETH");
  // 쓴 돈 0.01, 돌려받은 돈 0.008, 남은 값어치 0.006 → +0.004
  assert.equal(
    totalPnlWei(6n * 10n ** 15n, l.netInvestedWei as bigint) as bigint,
    4n * 10n ** 15n,
  );
});

test("전량 매도 후 보유 0: 실현분이 손익에 그대로 남는다", () => {
  const l = summarizeTrades([buy(100n * ETH, 1n * ETH), sell(100n * ETH, 2n * ETH)]);
  assert.equal(l.ledgerQty, 0n);
  assert.equal(l.netInvestedWei as bigint, -1n * ETH, "원금보다 많이 회수하면 음수");
  // 남은 평가 0 인데 손익은 +1 ETH — 미실현/실현을 나누지 않아도 맞는다
  assert.equal(totalPnlWei(0n, l.netInvestedWei as bigint) as bigint, 1n * ETH);
});

test("전량 매도 후 재매수: 별도 분기 없이 누적으로 맞는다", () => {
  const l = summarizeTrades([
    buy(100n * ETH, 1n * ETH),
    sell(100n * ETH, 2n * ETH),
    buy(50n * ETH, 1n * ETH),
  ]);
  assert.equal(l.ledgerQty, 50n * ETH);
  assert.equal(l.netInvestedWei as bigint, 0n, "1 − 2 + 1");
  assert.equal(l.grossBoughtWei as bigint, 2n * ETH, "분모는 총매수 2 ETH");
  // 남은 50개 평가가 1.2 ETH 면 총손익 +1.2 ETH
  assert.equal(totalPnlWei(12n * 10n ** 17n, l.netInvestedWei as bigint) as bigint, 12n * 10n ** 17n);
});

test("손실도 부호 그대로", () => {
  const l = summarizeTrades([buy(100n * ETH, 4n * ETH)]);
  assert.equal(totalPnlWei(1n * ETH, l.netInvestedWei as bigint) as bigint, -3n * ETH);
});

test("입력 순서가 달라도 결과가 같다 (합계라 순서 무관)", () => {
  const a = summarizeTrades([buy(100n * ETH, 1n * ETH), sell(40n * ETH, 1n * ETH)]);
  const b = summarizeTrades([sell(40n * ETH, 1n * ETH), buy(100n * ETH, 1n * ETH)]);
  assert.deepEqual(b, a);
});

test("roiBps: 분모는 총매수 — 원금 이상 회수해도 수익률이 폭발하지 않는다", () => {
  const l = summarizeTrades([buy(100n * ETH, 1n * ETH), sell(100n * ETH, 2n * ETH)]);
  const pnl = totalPnlWei(0n, l.netInvestedWei as bigint) as bigint;
  // 순투입(0)을 분모로 쓰면 ∞ 가 되지만, 총매수(1 ETH)를 쓰면 +100%
  assert.equal(roiBps(pnl, l.grossBoughtWei as bigint), 10_000);
});

test("roiBps: 매수 이력이 없으면 null", () => {
  assert.equal(roiBps(1n * ETH, 0n), null);
});

test("roiBps: 손익 ÷ 총매수", () => {
  assert.equal(roiBps(1n * ETH, 4n * ETH), 2500); // +25.00%
  assert.equal(roiBps(-1n * ETH, 4n * ETH), -2500);
});
