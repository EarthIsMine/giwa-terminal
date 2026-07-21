import { test } from "node:test";
import assert from "node:assert/strict";

import { ethToWei, weiToDisplayKrw } from "../src/convert.ts";
import {
  formatChangeBps,
  formatEth,
  formatKrw,
  formatKrwCompact,
} from "../src/format.ts";
import { displayKrw, wei } from "../src/types.ts";

const RATE = 5_842_000n; // 업비트 KRW-ETH 데모 고정값

test("ethToWei: 소수 문자열을 정확한 wei 로 변환한다", () => {
  assert.equal(ethToWei("1") as bigint, 10n ** 18n);
  assert.equal(ethToWei("0.00042") as bigint, 420_000_000_000_000n);
  assert.equal(ethToWei("0.000000000000000001") as bigint, 1n);
  assert.throws(() => ethToWei("0.0000000000000000001")); // 19자리
});

test("weiToDisplayKrw: bigint 만으로 환산하고 내림한다", () => {
  // 1 ETH → 5,842,000원 → 5,842,000,000 밀리원
  assert.equal(weiToDisplayKrw(ethToWei("1"), RATE) as bigint, 5_842_000_000n);
  // 0.00042 ETH → 2,453.64원
  assert.equal(weiToDisplayKrw(ethToWei("0.00042"), RATE) as bigint, 2_453_640n);
  // 1 wei → 0.000005842 밀리원 → 내림하면 0
  assert.equal(weiToDisplayKrw(wei(1n), RATE) as bigint, 0n);
});

test("formatKrw: 금액대별 자릿수 규칙 (지수 표기 금지)", () => {
  assert.equal(formatKrw(displayKrw(5_842_000_000n)), "5,842,000");
  assert.equal(formatKrw(displayKrw(2_453_640n)), "2,453");
  assert.equal(formatKrw(displayKrw(181_104n)), "181.1");
  assert.equal(formatKrw(displayKrw(42_062n)), "42.06");
  assert.equal(formatKrw(displayKrw(999n)), "0.99");
  assert.equal(formatKrw(displayKrw(0n)), "0.00");
});

test("formatKrwCompact: 만/억 축약", () => {
  assert.equal(formatKrwCompact(displayKrw(127_355_600_000n)), "1.27억");
  assert.equal(formatKrwCompact(displayKrw(94_325_000_000n)), "9,432만");
  assert.equal(formatKrwCompact(displayKrw(8_421_000n)), "8,421");
  assert.equal(formatKrwCompact(displayKrw(563_000_000_000n)), "5.63억");
});

test("formatEth: 후행 0 제거, 지수 표기 없음", () => {
  assert.equal(formatEth(ethToWei("1")), "1");
  assert.equal(formatEth(ethToWei("0.00042")), "0.00042");
  assert.equal(formatEth(ethToWei("12.5")), "12.5");
  assert.equal(formatEth(ethToWei("0.0000072"), 8), "0.0000072");
  // maxDecimals 6 기본값에서는 절사된다
  assert.equal(formatEth(ethToWei("0.0000072")), "0.000007");
});

test("formatChangeBps: 업비트식 2자리 고정 표기", () => {
  assert.equal(formatChangeBps(212), "+2.12%");
  assert.equal(formatChangeBps(-87), "-0.87%");
  assert.equal(formatChangeBps(0), "0.00%");
  assert.equal(formatChangeBps(540), "+5.40%");
  assert.equal(formatChangeBps(-1340), "-13.40%");
});
