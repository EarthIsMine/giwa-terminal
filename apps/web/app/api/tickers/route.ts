import { NextResponse } from "next/server";
import type { TickersResponse } from "@/lib/api-types";
import { getMarketTickers } from "@/lib/krw";

/**
 * 하단 바 시세 전용 프록시 - 클라이언트가 1초 폴링한다.
 * 피드(/api/feed, 60초)와 주기가 달라 라우트를 분리했다 - 합쳐 두면
 * 시세를 빠르게 돌리는 순간 인덱서 피드까지 초당 1회 두드리게 된다.
 * 상류 업비트 fetch 는 1초 캐시라 폴링 클라이언트 수와 무관하게
 * 원천 호출은 서버에서 초당 1회로 합쳐진다.
 */
export async function GET() {
  const tickers = await getMarketTickers();
  const body: TickersResponse = { tickers };
  return NextResponse.json(body);
}
