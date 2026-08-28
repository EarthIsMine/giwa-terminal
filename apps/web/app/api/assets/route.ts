import { NextResponse } from "next/server";
import type { AssetsResponse } from "@/lib/api-types";
import { getEthKrw } from "@/lib/krw";
import { getLiveAssets } from "@/lib/onchain";

/** 헤더 검색 모달용 자산 목록 - onchain 모듈 메모(10초)가 RPC 부하를 방어한다 */
export async function GET() {
  const [assets, ethKrw] = await Promise.all([getLiveAssets(), getEthKrw()]);
  const body: AssetsResponse = {
    assets: assets.map((a) => ({
      address: a.address,
      symbol: a.symbol,
      nameKo: a.nameKo,
      issuerName: a.issuerName,
      priceWei: a.priceWei,
      liquidityWei: a.liquidityWei,
      verification: a.verification,
    })),
    ethKrw: ethKrw === null ? null : ethKrw.toString(),
  };
  return NextResponse.json(body);
}
