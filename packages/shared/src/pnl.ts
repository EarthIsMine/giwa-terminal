import { wei } from "./types.ts";
import type { BasisPoints, WeiAmount } from "./types.ts";

/**
 * 손익 / 수익률 — 지표 정의 §손익의 산식 단일 소스.
 *
 * 총손익 = 평가금액 − (총매수 − 총매도).
 *
 * 실현·미실현을 나누지 않는다. 나누려면 "판 수량이 짊어진 원가"를 정해야 하고
 * 그건 이동평균이냐 FIFO냐는 회계 방식 선택을 강요하는데, 합쳐서 보면 그 선택
 * 자체가 사라진다 — 넣은 돈과 뺀 돈과 남은 값어치만 있으면 답이 나온다.
 * 부분 매도·전량 매도 후 재매수 같은 경우도 별도 분기 없이 그대로 맞는다.
 *
 * 기준 통화는 ETH(wei)다. 매수에 지불한 WETH 와 매도로 받은 WETH 만 다루고,
 * 원화 환산은 표시 직전에 호출부가 한다 — 온체인에 과거 환율 이력이 없어
 * "매수 시점 원화 원가"는 만들 수 없고, 만들면 추정이 된다 (절대 규칙 1).
 *
 * 모든 계산은 bigint. float 를 거치면 wei 단위에서 조용히 오차가 쌓인다.
 */

/** 지갑의 체결 한 건 — 인덱서 `trades` 행에서 필요한 것만 */
export interface PnlTrade {
  /** 토큰 기준 방향: buy = WETH 지불하고 토큰 수령 */
  side: "buy" | "sell";
  /** 토큰 수량 (최소단위) */
  tokenAmount: bigint;
  /** 오간 WETH (wei) */
  wethAmount: bigint;
}

export interface PnlLedger {
  /** 체결 원장에서 재구성한 보유 수량 (매수 − 매도) */
  ledgerQty: bigint;
  /** 순투입 = 총매수 − 총매도 (wei). 회수가 더 크면 음수가 된다 */
  netInvestedWei: WeiAmount;
  /** 총매수 (wei) — 수익률의 분모. "얼마 넣어서 얼마 됐나"의 그 얼마 */
  grossBoughtWei: WeiAmount;
}

/** 체결 원장 → 순투입·총매수·원장 수량. 순서에 의존하지 않으므로 정렬이 필요 없다 */
export function summarizeTrades(trades: readonly PnlTrade[]): PnlLedger {
  let qty = 0n;
  let net = 0n;
  let bought = 0n;

  for (const t of trades) {
    if (t.tokenAmount <= 0n) continue;
    if (t.side === "buy") {
      qty += t.tokenAmount;
      net += t.wethAmount;
      bought += t.wethAmount;
    } else {
      qty -= t.tokenAmount;
      net -= t.wethAmount;
    }
  }

  return {
    ledgerQty: qty,
    netInvestedWei: wei(net),
    grossBoughtWei: wei(bought),
  };
}

/** 총손익 = 평가금액 − 순투입 */
export function totalPnlWei(
  valueWei: bigint,
  netInvestedWei: bigint,
): WeiAmount {
  return wei(valueWei - netInvestedWei);
}

/**
 * 수익률 (bps) — 손익 ÷ 총매수.
 *
 * 분모가 순투입이 아니라 총매수인 이유: 이미 원금 이상 회수한 지갑은 순투입이
 * 0 이나 음수가 되어 수익률이 폭발하거나 부호가 뒤집힌다. 총매수를 쓰면
 * "넣은 돈 대비 얼마"라는 뜻이 끝까지 유지된다.
 * 매수 이력이 없으면 null: 나눌 수 없는 값을 0% 나 ∞ 로 채우지 않는다.
 */
export function roiBps(pnlWei: bigint, grossBoughtWei: bigint): BasisPoints | null {
  if (grossBoughtWei <= 0n) return null;
  return Number((pnlWei * 10_000n) / grossBoughtWei) as BasisPoints;
}
