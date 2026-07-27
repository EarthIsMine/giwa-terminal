import type { Metadata } from "next";
import { GuideContent } from "@/components/guide/guide-content";
import { GuideIntro } from "@/components/guide/guide-intro";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * 온보딩 가이드 — 주 동선은 하단 도크의 오버레이(X 닫기)이고,
 * 이 라우트는 딥링크·공유용으로 유지한다. 본문은 GuideContent 공용.
 */

export const metadata: Metadata = {
  title: "온보딩 가이드 · 나루 NARU",
  description:
    "업비트에서 기와(GIWA) 온체인으로 처음 건너오는 길: 지갑 준비, 출금, 브릿지, 첫 교환.",
};

export default function GuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[840px] px-8 pb-20 pt-12">
        <GuideIntro />
        <GuideContent />
      </main>
      <SiteFooter />
    </>
  );
}
