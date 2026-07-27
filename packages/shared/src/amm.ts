/**
 * V2 스왑 산식 — 거래 패널 견적과 포인트 평가액이 같은 식을 쓰도록 여기가 단일 소스.
 *
 * 수수료 상수를 shared 에 두는 이유: 메인넷 전환(총 0.8%, 명세서 v1.3)이 오면
 * 화면마다 흩어진 997/1000 을 찾아다녀야 하고, 한쪽만 고치면 견적과 등급 산정이
 * 서로 다른 수수료로 계산된다 — 조용히 틀리는 종류라 한 곳에 모은다.
 *
 * 브랜드 타입을 쓰지 않는 건 의도적이다. 여기 들어오는 값은 ETH wei 일 수도
 * 토큰 최소단위일 수도 있고(페어의 어느 쪽이냐에 따라), 입출력이 전부 같은 단위라
 * WeiAmount 브랜드가 막아줄 혼동이 없다. 브랜드의 일은 wei ↔ 원화 방지다(절대 규칙 1).
 */

/** 캐노니컬 V2 수수료 0.3% — amountIn 에 곱하는 분자 */
export const SWAP_FEE_NUMERATOR = 997n;
/** 캐노니컬 V2 수수료 0.3% — reserveIn 에 곱하는 분모 */
export const SWAP_FEE_DENOMINATOR = 1000n;

/**
 * 스왑 출력량 — 컨트랙트 getAmountOut 과 동일식.
 * 준비금이나 입력이 0 이하면 0 (견적 불가를 0 으로 표현, 호출부가 판단한다).
 */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const withFee = amountIn * SWAP_FEE_NUMERATOR;
  return (
    (withFee * reserveOut) / (reserveIn * SWAP_FEE_DENOMINATOR + withFee)
  );
}

/** 수수료 몫 — 분모에서 분자를 뺀 값 (0.3% 면 3) */
const FEE_SHARE = SWAP_FEE_DENOMINATOR - SWAP_FEE_NUMERATOR;

/**
 * 입력 레그 기준 수수료 절대액 — 매수처럼 "지불액"이 확정된 쪽.
 * 지불 ETH 에서 바로 떼이므로 분모는 SWAP_FEE_DENOMINATOR.
 */
export function feeFromAmountIn(amountIn: bigint): bigint {
  return (amountIn * FEE_SHARE) / SWAP_FEE_DENOMINATOR;
}

/**
 * 출력 레그 기준 수수료 절대액 — 매도처럼 "수령액"만 아는 쪽.
 * 수령 ETH 는 이미 수수료가 차감된 값이라 분모는 SWAP_FEE_NUMERATOR 로 역산한다.
 */
export function feeFromAmountOut(amountOut: bigint): bigint {
  return (amountOut * FEE_SHARE) / SWAP_FEE_NUMERATOR;
}
