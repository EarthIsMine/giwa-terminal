import { formatKrwCompact, weiToDisplayKrw } from "@giwa/shared";
import type { AssetVerification, WeiAmount } from "@giwa/shared";
import type { BoardWindow } from "@/lib/indexer";

/**
 * 자산 보드 공유 모델 - 컨테이너(asset-board)가 조립한 행 뷰모델과
 * 데스크톱 테이블·모바일 카드가 함께 쓰는 표시 조각.
 * 상태·컬럼 정의는 asset-board 가 쥔다 - 여기는 타입과 순수 렌더 조각만.
 */

export interface LiveAsset {
  address: `0x${string}`;
  pair: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
  priceWei: WeiAmount;
  liquidityWei: WeiAmount;
  verification: AssetVerification;
  /** 선택 윈도우의 변동률 (bps). 데이터 없으면 null - 0%로 채우지 않는다 */
  changeBps: number | null;
  /** 시가총액 = totalSupply × 현재가.
   *  NaruToken 은 공급 고정이고 소각 기능이 없어 락업·소각 차감분이 없다
   *  (CLAUDE.md 시가총액 정의: 제외 정책을 주석으로 남긴다) */
  marketCapWei: WeiAmount;
  /** 선택 윈도우의 거래대금(WETH wei) · 체결 건수 · 참여 인원 */
  volumeWei: WeiAmount | null;
  trades: number | null;
  traders: number | null;
  /** 총수수료 = 전체 누적 거래대금 × 0.3% (WETH wei). 윈도우 선택과 무관한 lifetime 값 */
  totalFeesWei: WeiAmount | null;
}

/**
 * 윈도우 라벨 - "24h"는 rolling 24시간이 아니라 UTC 당일(09:00 KST 경계)이다.
 * 업비트 일봉과 같은 경계를 쓰기로 한 결정이라(CLAUDE.md 지표 정의) 계산은 그대로 두고
 * 이름을 "오늘"로 맞춘다. "24시간"이라 부르면 KST 오전에 창이 몇 분짜리가 된다.
 */
export const WINDOW_LABEL: Record<BoardWindow, string> = {
  "24h": "오늘",
  "7d": "7일",
  "30d": "30일",
  all: "전체",
};

/** "1.27억" → 숫자와 단위를 분리해 단위를 한 단계 죽인다 */
export function KrwCompact({ v, ethKrw }: { v: WeiAmount; ethKrw: bigint }) {
  const s = formatKrwCompact(weiToDisplayKrw(v, ethKrw));
  const m = /^([\d,.]+)(억|만)?$/.exec(s);
  const num = m?.[1] ?? s;
  const unit = m?.[2];
  return (
    <span className="font-mono text-[13px] tabular-nums">
      {num}
      {unit ? (
        <span className="ml-0.5 font-sans text-[11px] text-ink-3">{unit}</span>
      ) : null}
    </span>
  );
}
