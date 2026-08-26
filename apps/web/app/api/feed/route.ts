import { NextResponse } from "next/server";
import type { FeedResponse } from "@/lib/api-types";
import { getFeed } from "@/lib/indexer";
import { getEthKrw, getMarketTickers } from "@/lib/krw";

/**
 * 하단 도크 폴링용 프록시 - 소식·시세를 한 번에 내린다.
 * INDEXER_URL 은 서버 전용이라 클라이언트는 이 내부 라우트로만 읽는다.
 * 상류 fetch 가 각각 캐시(인덱서 15초·시세 60초)라 폴링이 원천을 두드리지 않는다.
 */
export async function GET() {
  const [items, ethKrw, tickers] = await Promise.all([
    getFeed(),
    getEthKrw(),
    getMarketTickers(),
  ]);
  const body: FeedResponse = {
    items,
    ethKrw: ethKrw?.toString() ?? null,
    tickers,
  };
  return NextResponse.json(body);
}
