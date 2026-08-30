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
  /** 선택 윈도우의 거래대금(WETH wei) · 체결 건수 · 참여 지갑 */
  volumeWei: WeiAmount | null;
  /** 순유입 = 선택 윈도우 총매수 - 총매도 (WETH wei, 부호 있음 - 음수는 순매도 우위) */
  netInflowWei: WeiAmount | null;
  trades: number | null;
  traders: number | null;
  /** 총수수료 = 전체 누적 거래대금 × 0.3% (WETH wei). 윈도우 선택과 무관한 lifetime 값 */
  totalFeesWei: WeiAmount | null;
}

/**
 * 윈도우 라벨 - 롤링 단기(2026-08-31). now 기준 과거 15분·1시간·4시간·24시간이다.
 * 이전의 일·월 경계(업비트 일봉 정렬)에서 rolling 으로 전환한 팀 결정 - "24h"도
 * UTC 당일이 아니라 진짜 rolling 24시간이다.
 */
export const WINDOW_LABEL: Record<BoardWindow, string> = {
  "15m": "15분",
  "1h": "1시간",
  "4h": "4시간",
  "24h": "24시간",
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
