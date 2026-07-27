import type { FeedItemWire } from "@/lib/indexer";
import type { MarketTickerWire } from "@/lib/krw";
import type { LiveAssetWire } from "@/lib/onchain";

/**
 * 내부 API 라우트의 응답 계약 — 단일 소스.
 * 라우트 핸들러와 화면이 이 타입을 같이 임포트해서, 응답 모양이 바뀌면
 * 소비처가 전부 타입 에러로 드러난다. 컴포넌트 파일에 와이어 타입을
 * 따로 선언하지 않는다 (과거 PortfolioResponse 2중 정의 드리프트 방지).
 */

/** GET /api/portfolio?address=0x… */
export interface PortfolioResponse {
  ethBalance: string;
  holdings: (LiveAssetWire & { balance: string })[];
  ethKrw: string | null;
  updatedAt: number;
}

/** GET /api/feed */
export interface FeedResponse {
  items: FeedItemWire[] | null;
  ethKrw: string | null;
  tickers: MarketTickerWire[];
  usdKrwCents: number | null;
  kimchiBps: number | null;
}
