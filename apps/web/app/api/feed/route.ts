import { NextResponse } from "next/server";
import { getFeed } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";

/**
 * 나루터 소식 도크 폴링용 프록시 — INDEXER_URL 은 서버 전용이라
 * 클라이언트는 이 내부 라우트를 통해서만 읽는다 (퍼블릭 API 금지 원칙의 내부 소비 예외).
 * 상류 fetch 가 15초 캐시라 폴링이 인덱서를 직접 두드리지 않는다.
 */
export async function GET() {
  const [items, ethKrw] = await Promise.all([getFeed(), getEthKrw()]);
  return NextResponse.json({ items, ethKrw: ethKrw?.toString() ?? null });
}
