import { KRW_SCALE, displayKrw, wei } from "./types.ts";
import type { DisplayKrw, WeiAmount } from "./types.ts";

/** ETH 18 decimals */
export const WEI_PER_ETH = 10n ** 18n;

/**
 * wei → 원화 환산 (밀리원).
 * krwPerEth 는 업비트 KRW-ETH 시세(원 단위 정수)를 주입받는다.
 * 모든 계산은 bigint, 내림 - 환산 참고값을 과대 표시하지 않는다.
 */
export function weiToDisplayKrw(amount: WeiAmount, krwPerEth: bigint): DisplayKrw {
  return displayKrw((amount * krwPerEth * KRW_SCALE) / WEI_PER_ETH);
}

/** ETH 소수 문자열("0.00042") → wei. 시드 데이터 정의 편의를 위한 헬퍼 */
export function ethToWei(eth: string): WeiAmount {
  const s = eth.trim();
  // 음수·지수 표기·빈 문자열은 거부 - 조용히 틀린 wei 를 만들지 않는다
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`ETH 표기는 음수 없는 소수 문자열이어야 한다: ${eth}`);
  }
  const [intPart = "0", fracPart = ""] = s.split(".");
  if (fracPart.length > 18) {
    throw new Error(`ETH 소수 자릿수는 18을 넘을 수 없다: ${eth}`);
  }
  const frac = fracPart.padEnd(18, "0");
  return wei(BigInt(intPart) * WEI_PER_ETH + BigInt(frac || "0"));
}
