import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "내 자산 · 나루",
  description: "기와체인 지갑의 보유 수량과 원화 환산 평가액을 확인합니다.",
};

export default function PortfolioPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PortfolioView />
      </main>
      <SiteFooter />
    </>
  );
}
