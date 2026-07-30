import type { Metadata } from "next";
import { PointsIntro } from "@/components/points/points-intro";
import { PointsView } from "@/components/points/points-view";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * 나루 포인트 (기획서 §4.4) — 참여 루프의 입구.
 * 시즌 0(테스트베드) 이전: 도장 KYC 게이트 실조회 + 산식 공개 + 잔고 미리보기.
 * 적립 원장·랭킹은 집계 서버(P1) 가동과 함께 열린다.
 */

export const metadata: Metadata = {
  title: "나루 포인트 · 나루 NARU",
  description:
    "예치와 거래로 포인트를 쌓고, 새 자산이 상장될 때 포인트를 차감해 배분에 참여합니다. 참여 자격은 업비트 KYC 인증 지갑.",
};

export default function PointsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] px-page pb-20 pt-8 sm:pt-12">
        <PointsIntro />
        <PointsView />
      </main>
      <SiteFooter />
    </>
  );
}
