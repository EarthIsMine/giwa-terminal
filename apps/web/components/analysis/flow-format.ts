import {
  formatEth,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";

/**
 * 나루 거래 흐름 차트들의 공용 표시 헬퍼 - naru-flow / naru-flow-charts 가
 * 같은 포맷을 쓰지 않으면 카드마다 표기가 조용히 갈라진다.
 */

/** 환산 실패 시 ETH 폴백 - 추정치를 확정값처럼 보여주지 않는다 (절대 규칙 1) */
export function formatAmount(v: bigint, ethKrw: bigint | null): string {
  if (ethKrw !== null) {
    return `₩${formatKrwCompact(weiToDisplayKrw(wei(v), ethKrw))}`;
  }
  return `${formatEth(wei(v), 4)} ETH`;
}

export function formatSigned(v: bigint, ethKrw: bigint | null): string {
  const sign = v < 0n ? "-" : "+";
  const abs = v < 0n ? -v : v;
  return `${sign}${formatAmount(abs, ethKrw)}`;
}

/** 차트 기하용 축소 - 화폐 계산이 아니라 픽셀 배치라 float 허용 */
export function toChartNumber(v: bigint): number {
  const abs = v < 0n ? -v : v;
  const n = Number(abs / 10n ** 9n) / 1e9;
  return v < 0n ? -n : n;
}

/** "YYYY-MM-DD" → "M월 D일" - 업저씨가 읽는 자리라 ISO 를 그대로 안 쓴다 */
export function formatDateKo(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 툴팁이 카드 밖으로 새지 않게 가장자리 열은 정렬을 바꾼다 */
export function tooltipEdge(i: number, n: number): string {
  return i < 4
    ? "left-0"
    : i >= n - 4
      ? "right-0"
      : "left-1/2 -translate-x-1/2";
}
