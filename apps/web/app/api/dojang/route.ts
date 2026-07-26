import { NextResponse } from "next/server";
import { isKycVerified } from "@/lib/onchain";

/** 도장 KYC 인증 조회 — 포인트 게이트용 (서버 RPC 경유, 지갑 주소별 신선 조회) */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const verified = await isKycVerified(address as `0x${string}`);
  return NextResponse.json({ verified });
}
