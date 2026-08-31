import { NextResponse } from "next/server";
import type { FeedResponse } from "@/lib/api-types";
import { getFeed } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";

/**
 * 하단 도크 폴링용 프록시 - 소식과 환산율을 내린다.
 * INDEXER_URL 은 서버 전용이라 클라이언트는 이 내부 라우트로만 읽는다.
 * 상류 fetch 가 각각 캐시(인덱서 15초·환산율 60초)라 폴링이 원천을 두드리지 않는다.
 * 하단 바 시세는 /api/tickers 로 분리(1초 폴링 - 주기가 달라서다).
 */
export async function GET() {
  const [items, ethKrw] = await Promise.all([getFeed(), getEthKrw()]);
  const body: FeedResponse = {
    items,
    ethKrw: ethKrw?.toString() ?? null,
  };
  return NextResponse.json(body);
}
