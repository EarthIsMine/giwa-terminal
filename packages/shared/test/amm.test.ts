import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SWAP_FEE_DENOMINATOR,
  SWAP_FEE_NUMERATOR,
  feeFromAmountIn,
  feeFromAmountOut,
  getAmountOut,
} from "../src/amm.ts";
import { ethToWei } from "../src/convert.ts";

const ETH = 10n ** 18n;

test("getAmountOut: 컨트랙트 getAmountOut 과 같은 값을 낸다", () => {
  // 준비금 100 ETH / 200,000 토큰 인 풀에 1 ETH 를 넣는다.
  // withFee = 1e18*997, out = withFee*200000e18 / (100e18*1000 + withFee)
  const reserveIn = 100n * ETH;
  const reserveOut = 200_000n * ETH;
  const amountIn = ETH;
  const withFee = amountIn * 997n;
  const expected = (withFee * reserveOut) / (reserveIn * 1000n + withFee);
  assert.equal(getAmountOut(amountIn, reserveIn, reserveOut), expected);
  // 슬리피지가 있으므로 무수수료 스팟가(2,000 토큰)보다 반드시 적게 나온다
  assert.ok(getAmountOut(amountIn, reserveIn, reserveOut) < 2_000n * ETH);
});

test("getAmountOut: 0 이하 입력·빈 풀은 0 (견적 불가)", () => {
  const r = 100n * ETH;
  assert.equal(getAmountOut(0n, r, r), 0n);
  assert.equal(getAmountOut(-1n, r, r), 0n);
  assert.equal(getAmountOut(ETH, 0n, r), 0n);
  assert.equal(getAmountOut(ETH, r, 0n), 0n);
});

test("getAmountOut: 출력이 준비금을 넘지 않는다 (V2 불변식)", () => {
  const reserveIn = 1n * ETH;
  const reserveOut = 10n * ETH;
  // 준비금의 1000배를 밀어넣어도 reserveOut 을 초과할 수 없다
  const out = getAmountOut(1_000n * ETH, reserveIn, reserveOut);
  assert.ok(out < reserveOut, `out=${out} 이 reserveOut=${reserveOut} 미만이어야 한다`);
});

test("수수료 상수: 캐노니컬 V2 0.3%", () => {
  assert.equal(SWAP_FEE_NUMERATOR, 997n);
  assert.equal(SWAP_FEE_DENOMINATOR, 1000n);
});

test("feeFromAmountIn: 지불액에서 0.3% 를 뗀다 (매수 레그)", () => {
  assert.equal(feeFromAmountIn(ethToWei("1") as bigint), 3_000_000_000_000_000n); // 0.003 ETH
  assert.equal(feeFromAmountIn(1_000n), 3n);
  assert.equal(feeFromAmountIn(0n), 0n);
});

test("feeFromAmountOut: 수령액에서 역산한다 (매도 레그)", () => {
  // 수령 997 이면 수수료 3 이 이미 빠진 상태 → 역산하면 3
  assert.equal(feeFromAmountOut(997n), 3n);
  assert.equal(feeFromAmountOut(0n), 0n);
});

test("수수료 두 방향이 서로 정합한다", () => {
  // 매수: 1 ETH 지불 → 수수료 f_in, 실제 스왑에 쓰이는 건 1 ETH - f_in
  // 매도로 그만큼 받았다면 역산 수수료가 같아야 한다 (내림 오차 1 wei 허용)
  const paid = ethToWei("2.5") as bigint;
  const feeIn = feeFromAmountIn(paid);
  const received = paid - feeIn;
  const feeOut = feeFromAmountOut(received);
  const diff = feeIn > feeOut ? feeIn - feeOut : feeOut - feeIn;
  assert.ok(diff <= 1n, `양방향 수수료 차이가 ${diff} wei - 1 wei 이하여야 한다`);
});
