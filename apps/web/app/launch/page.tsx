import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "자산 발행 — 나루",
  description:
    "검증된 발행 주체만 기와체인에 자산을 올릴 수 있습니다. 도장 어테스테이션 또는 GIWA ID 연동이 전제입니다.",
};

export default function LaunchPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <LaunchForm />
      </main>
      <SiteFooter />
    </>
  );
}
