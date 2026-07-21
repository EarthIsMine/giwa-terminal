/**
 * 표시 직전 포맷팅 — 여기가 bigint 가 문자열이 되는 유일한 관문이다.
 * float 를 거치지 않고 전부 문자열 연산으로 처리한다.
 *
 * 표기 규칙 (절대 규칙 3: 지수 표기 금지, 일반 소수점만):
 *  - ≥ 1,000원  → 정수 + 콤마      "2,453"
 *  - ≥ 100원    → 소수 1자리        "181.1"
 *  - < 100원    → 소수 2자리        "42.06"
 *  - 항상 내림(truncate) — 환산 참고값을 과대 표시하지 않는다
 */

import { KRW_SCALE } from "./types.ts";
import type { BasisPoints, DisplayKrw, WeiAmount } from "./types.ts";
import { WEI_PER_ETH } from "./convert.ts";

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 밀리원 → 원화 숫자 문자열 (통화 기호 없이) */
export function formatKrw(v: DisplayKrw): string {
  const milli = v as bigint;
  const won = milli / KRW_SCALE;
  const frac = (milli % KRW_SCALE).toString().padStart(3, "0");

  if (won >= 1_000n) return groupDigits(won.toString());
  if (won >= 100n) return `${won.toString()}.${frac.slice(0, 1)}`;
  return `${won.toString()}.${frac.slice(0, 2)}`;
}

/**
 * 원화 축약 표기 — 업저씨에게 익숙한 만/억 단위.
 *  ≥ 1억 → "1.27억", ≥ 1만 → "9,432만", 그 외 → formatKrw
 */
export function formatKrwCompact(v: DisplayKrw): string {
  const won = (v as bigint) / KRW_SCALE;
  const EOK = 100_000_000n;
  const MAN = 10_000n;

  if (won >= EOK) {
    const int = won / EOK;
    const frac = ((won % EOK) * 100n) / EOK; // 소수 2자리, 내림
    return `${groupDigits(int.toString())}.${frac.toString().padStart(2, "0")}억`;
  }
  if (won >= MAN) {
    return `${groupDigits((won / MAN).toString())}만`;
  }
  return formatKrw(v);
}

/** wei → ETH 문자열. 후행 0 제거, 지수 표기 없음 */
export function formatEth(amount: WeiAmount, maxDecimals = 6): string {
  const v = amount as bigint;
  const int = v / WEI_PER_ETH;
  const frac = (v % WEI_PER_ETH).toString().padStart(18, "0");
  const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
  const intStr = groupDigits(int.toString());
  return trimmed.length > 0 ? `${intStr}.${trimmed}` : intStr;
}

/** bps → "+2.29%" / "-0.87%" / "0.00%" (2자리 고정, 업비트 표기 관례) */
export function formatChangeBps(bps: BasisPoints): string {
  const sign = bps > 0 ? "+" : bps < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(bps));
  const int = Math.trunc(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${sign}${int}.${frac}%`;
}

/** 정수 카운트 → "1,234" */
export function formatCount(n: number): string {
  return groupDigits(Math.trunc(n).toString());
}
