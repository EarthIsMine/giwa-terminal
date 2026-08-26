import type { FeedItemWire, WalletTradeWire } from "@/lib/indexer";
import type { MarketTickerWire } from "@/lib/krw";
import type { PortfolioWire } from "@/lib/onchain";

/**
 * 내부 API 라우트의 응답 계약 - 단일 소스.
 * 라우트 핸들러와 화면이 이 타입을 같이 임포트해서, 응답 모양이 바뀌면
 * 소비처가 전부 타입 에러로 드러난다. 컴포넌트 파일에 와이어 타입을
 * 따로 선언하지 않는다 (과거 PortfolioResponse 2중 정의 드리프트 방지).
 */

/**
 * GET /api/portfolio?address=0x…
 * 생산자(PortfolioWire)를 그대로 확장한다 - 필드를 베껴 적으면 라우트의
 * `{ ...portfolio, … }` 스프레드에는 초과 프로퍼티 검사가 걸리지 않아서
 * 생산자에 필드가 늘어도 타입 에러 없이 응답에서 조용히 누락된다.
 */
export interface PortfolioResponse extends PortfolioWire {
  ethKrw: string | null;
  /** 손익 계산용 체결 원장 (오름차순). 인덱서 미연결이면 null → 화면이 손익 열을 감춘다 */
  trades: WalletTradeWire[] | null;
  /** 원장이 잘렸으면 이동평균 원가를 신뢰할 수 없다 → 손익을 표시하지 않는다 */
  tradesTruncated: boolean;
  updatedAt: number;
}

/** GET /api/feed */
export interface FeedResponse {
  items: FeedItemWire[] | null;
  ethKrw: string | null;
  tickers: MarketTickerWire[];
}
