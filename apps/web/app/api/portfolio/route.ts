import { NextResponse } from "next/server";
import type { PortfolioResponse } from "@/lib/api-types";
import { getWalletTrades } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";
import { getPortfolio } from "@/lib/onchain";

/** 내 자산 조회 - 잔고는 항상 신선하게 (자산 메타·가격은 onchain 모듈 메모가 방어) */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const [portfolio, ethKrw, walletTrades] = await Promise.all([
    getPortfolio(address as `0x${string}`),
    getEthKrw(),
    // 인덱서 미연결이면 null - 손익 열만 빠지고 잔고 화면은 그대로 뜬다
    getWalletTrades(address as `0x${string}`),
  ]);
  const body: PortfolioResponse = {
    ...portfolio,
    ethKrw: ethKrw?.toString() ?? null,
    trades: walletTrades?.trades ?? null,
    tradesTruncated: walletTrades?.truncated ?? false,
    updatedAt: Date.now(),
  };
  return NextResponse.json(body);
}
