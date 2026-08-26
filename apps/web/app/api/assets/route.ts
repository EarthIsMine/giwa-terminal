import { NextResponse } from "next/server";
import { getLiveAssets } from "@/lib/onchain";

/** 헤더 전역 검색용 슬림 자산 목록 - onchain 모듈 메모(10초)가 RPC 부하를 방어한다 */
export async function GET() {
  const assets = await getLiveAssets();
  return NextResponse.json({
    assets: assets.map((a) => ({
      address: a.address,
      symbol: a.symbol,
      nameKo: a.nameKo,
      issuerName: a.issuerName,
    })),
  });
}
